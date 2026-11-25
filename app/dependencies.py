from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.database import db
from app.core.security import decode_token
from prisma.models import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истёкший токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Некорректный токен")

    user = await db.user.find_unique(where={"user_id": int(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def require_lesser(user: User = Depends(get_current_user)) -> User:
    if user.role != "LESSER":
        raise HTTPException(status_code=403, detail="Доступно только арендодателям")
    return user


async def require_renter(user: User = Depends(get_current_user)) -> User:
    if user.role != "RENTER":
        raise HTTPException(status_code=403, detail="Доступно только арендаторам")
    return user
