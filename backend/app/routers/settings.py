import pyotp
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import security
from ..db import get_session
from ..deps import get_current_user
from ..models import RefreshToken, User
from ..schemas import PasswordChange, ProfileUpdate, TwoFactorCode, TwoFactorDisable, TwoFactorSetup, UserOut
from .auth import user_out

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/profile", response_model=UserOut)
async def get_profile(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)


@router.patch("/profile", response_model=UserOut)
async def update_profile(body: ProfileUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> UserOut:
    user.display_name = body.name.strip()
    await session.commit()
    return user_out(user)


@router.post("/password", status_code=204)
async def change_password(body: PasswordChange, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    if not await security.verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=422, detail="New password must differ from the current one")
    user.password_hash = await security.hash_password(body.new_password)
    # Sign out every other device.
    await session.execute(update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True))
    await session.commit()


@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def two_factor_setup(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> TwoFactorSetup:
    if user.totp_enabled:
        raise HTTPException(status_code=409, detail="Two-factor authentication is already enabled")
    user.totp_secret = pyotp.random_base32()
    await session.commit()
    return TwoFactorSetup(secret=user.totp_secret, otpauth_uri=pyotp.TOTP(user.totp_secret).provisioning_uri(name=user.email, issuer_name="Dash"))


@router.post("/2fa/enable", status_code=204)
async def two_factor_enable(body: TwoFactorCode, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Call /2fa/setup first")
    if not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    user.totp_enabled = True
    await session.commit()


@router.post("/2fa/disable", status_code=204)
async def two_factor_disable(body: TwoFactorDisable, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="Two-factor authentication is not enabled")
    if not await security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    user.totp_enabled = False
    user.totp_secret = None
    await session.commit()
