from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _get_jwks() -> Dict[str, Any]:
    """
    Downloads Clerk JWKS (public keys).
    Cached so we don't fetch keys on every request.
    """
    resp = requests.get(settings.CLERK_JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_public_key_for_token(token: str) -> Dict[str, Any]:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Invalid token (missing kid).")

    jwks = _get_jwks()
    keys = jwks.get("keys", [])
    for key in keys:
        if key.get("kid") == kid:
            return key

    # Keys can rotate — clear cache once and retry
    _get_jwks.cache_clear()
    jwks = _get_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise HTTPException(status_code=401, detail="Invalid token (unknown kid).")


def get_current_clerk_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """
    Validates Clerk JWT and returns the Clerk user id (sub).
    Expect: Authorization: Bearer <token>
    """
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing Authorization token.")

    token = creds.credentials
    key = _get_public_key_for_token(token)

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.CLERK_ISSUER,
            options={"verify_aud": False},  # can enable audience later if needed
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (missing sub).")

    return str(user_id)
