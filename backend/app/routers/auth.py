import time

import jwt
import pyotp
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import mailer, security
from ..config import get_settings
from ..db import get_session
from ..deps import get_current_user
from ..models import RefreshToken, User
from ..schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserOut,
)
from ..services import ledger

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "dash_refresh"

# email -> (consecutive failures, locked_until_epoch_seconds). In-memory: fine for one process.
_failures: dict[str, tuple[int, float]] = {}


def reset_login_state() -> None:
    _failures.clear()


def user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        name=u.display_name,
        email=u.email,
        is_verified=u.is_verified,
        two_factor_enabled=u.totp_enabled,
        referral_code=u.referral_code,
    )


def normalize_email(raw: str) -> str:
    try:
        return validate_email(raw.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid email address: {exc}") from exc


async def _issue(session: AsyncSession, user: User, response: Response) -> AuthResponse:
    cfg = get_settings()
    refresh, jti, exp_ms = security.create_refresh_token(user.id)
    session.add(RefreshToken(jti=jti, user_id=user.id, expires_at=exp_ms))
    await session.commit()
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        httponly=True,
        secure=cfg.is_production,
        samesite="none" if cfg.is_production else "lax",
        max_age=cfg.refresh_token_days * 86400,
        path="/api/auth",
    )
    return AuthResponse(
        user=user_out(user),
        access_token=security.create_access_token(user.id),
        refresh_token=refresh,
        expires_in=cfg.access_token_minutes * 60,
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, response: Response, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    email = normalize_email(body.email)
    user = User(email=email, password_hash=await security.hash_password(body.password), display_name=body.full_name.strip())
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    await ledger.ensure_balances(session, user.id, int(round(get_settings().demo_start_balance * 100)))
    return await _issue(session, user, response)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, response: Response, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    cfg = get_settings()
    email = body.email.strip().lower()
    fails, locked_until = _failures.get(email, (0, 0.0))
    if locked_until > time.time():
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    # Always run a bcrypt check so response time doesn't reveal whether the email exists.
    ok = await security.verify_password(body.password, user.password_hash if user else security.dummy_hash())
    ok = ok and user is not None
    if ok and user.totp_enabled:
        if not body.otp:
            raise HTTPException(status_code=401, detail="otp_required")
        if not pyotp.TOTP(user.totp_secret or "").verify(body.otp, valid_window=1):
            ok = False
    if not ok or user is None:
        fails += 1
        locked = time.time() + cfg.login_lock_minutes * 60 if fails >= cfg.max_login_failures else 0.0
        _failures[email] = (0 if locked else fails, locked)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _failures.pop(email, None)
    return await _issue(session, user, response)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    token = (body.refresh_token if body else None) or request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        claims = security.decode(token, "refresh")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

    row = await session.get(RefreshToken, claims["jti"])
    if row is None or row.user_id != claims["sub"]:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if row.revoked:
        # A rotated-out token being replayed suggests theft: kill every session for this user.
        await session.execute(update(RefreshToken).where(RefreshToken.user_id == row.user_id).values(revoked=True))
        await session.commit()
        raise HTTPException(status_code=401, detail="Refresh token reuse detected; please sign in again")
    row.revoked = True
    user = await session.get(User, row.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return await _issue(session, user, response)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    session: AsyncSession = Depends(get_session),
) -> None:
    token = (body.refresh_token if body else None) or request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            claims = security.decode(token, "refresh")
            await session.execute(update(RefreshToken).where(RefreshToken.jti == claims["jti"]).values(revoked=True))
            await session.commit()
        except jwt.PyJWTError:
            pass
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    """Always answers the same way so it can't be used to discover which emails have accounts."""
    email = body.email.strip().lower()
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is not None:
        token = security.create_reset_token(user.id, user.password_hash)
        mailer.send(user.email, "Reset your Dash password", f"Use this token to reset your password: {token}")
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    try:
        claims = security.decode(body.token, "reset")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired") from exc
    user = await session.get(User, claims["sub"])
    if user is None or security.password_fingerprint(user.password_hash) != claims.get("pwf"):
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")
    user.password_hash = await security.hash_password(body.new_password)
    await session.execute(update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True))
    await session.commit()
    _failures.pop(user.email, None)
    return {"message": "Password updated. Please sign in."}
