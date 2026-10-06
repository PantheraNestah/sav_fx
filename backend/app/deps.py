import jwt
from fastapi import Depends, HTTPException, Request, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from . import security
from .db import get_session
from .models import User

bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


async def user_from_token(session: AsyncSession, token: str) -> User:
    try:
        claims = security.decode(token, "access")
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid or expired token") from exc
    user = await session.get(User, claims["sub"])
    if user is None:
        raise _unauthorized("Account no longer exists")
    return user


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if creds is None:
        raise _unauthorized()
    return await user_from_token(session, creds.credentials)


async def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    if creds is None:
        return None
    try:
        return await user_from_token(session, creds.credentials)
    except HTTPException:
        return None


def client_ip(request: Request | WebSocket) -> str:
    return request.client.host if request.client else "unknown"
