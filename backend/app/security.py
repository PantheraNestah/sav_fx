import asyncio
import base64
import hashlib
import time
import uuid
from typing import Any

import bcrypt
import jwt

from .config import get_settings

ALGO = "HS256"


def _prehash(password: str) -> bytes:
    # bcrypt only looks at the first 72 bytes; hashing first lets long passphrases count fully.
    return base64.b64encode(hashlib.sha256(password.encode()).digest())


def _hash(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)).decode()


def _verify(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(password), hashed.encode())
    except ValueError:
        return False


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hash, password)


async def verify_password(password: str, hashed: str) -> bool:
    return await asyncio.to_thread(_verify, password, hashed)


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGO)


def decode(token: str, expected_type: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError on any problem (bad signature, expired, wrong type)."""
    claims = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGO])
    if claims.get("type") != expected_type:
        raise jwt.InvalidTokenError("wrong token type")
    return claims


def create_access_token(user_id: str) -> str:
    now = int(time.time())
    return _encode({"sub": user_id, "type": "access", "iat": now, "exp": now + get_settings().access_token_minutes * 60})


def create_refresh_token(user_id: str) -> tuple[str, str, int]:
    """Returns (token, jti, expires_at_ms)."""
    now = int(time.time())
    exp = now + get_settings().refresh_token_days * 86400
    jti = str(uuid.uuid4())
    return _encode({"sub": user_id, "type": "refresh", "jti": jti, "iat": now, "exp": exp}), jti, exp * 1000


def password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


def create_reset_token(user_id: str, password_hash: str) -> str:
    """Single-use in practice: the fingerprint stops matching once the password changes."""
    now = int(time.time())
    return _encode(
        {
            "sub": user_id,
            "type": "reset",
            "pwf": password_fingerprint(password_hash),
            "iat": now,
            "exp": now + get_settings().reset_token_minutes * 60,
        }
    )
