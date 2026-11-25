from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import get_settings
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserPublic
from app.schemas.common import MessageResponse, TokenResponse
from app.dependencies import get_current_user
from prisma.models import User
import secrets

router = APIRouter(prefix="/api/auth", tags=["Auth"])
settings = get_settings()


def _user_to_public(user) -> UserPublic:
    return UserPublic.model_validate(user)


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest):
    existing = await db.user.find_unique(where={"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    if body.role not in ("RENTER", "LESSER"):
        raise HTTPException(status_code=400, detail="Некорректная роль")

    user = await db.user.create(
        data={
            "email": body.email.lower(),
            "password_hash": hash_password(body.password),
            "name": body.name,
            "surname": body.surname,
            "patronymic": body.patronymic,
            "phone_number": body.phone_number,
            "role": body.role,
        }
    )

    access = create_access_token({"sub": str(user.user_id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.user_id)})
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refreshtoken.create(
        data={
            "user_id": user.user_id,
            "token": refresh,
            "expires_at": expires,
        }
    )

    return AuthResponse(
        user=_user_to_public(user),
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    user = await db.user.find_unique(where={"email": body.email.lower()})
    # Одинаковое сообщение — защита от enumeration
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")

    access = create_access_token({"sub": str(user.user_id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.user_id)})
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refreshtoken.create(
        data={
            "user_id": user.user_id,
            "token": refresh,
            "expires_at": expires,
        }
    )

    return AuthResponse(
        user=_user_to_public(user),
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Недействительный refresh-токен")

    stored = await db.refreshtoken.find_unique(where={"token": refresh_token})
    if not stored or stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh-токен истёк или отозван")

    user = await db.user.find_unique(where={"user_id": stored.user_id})
    if not user or user.is_blocked:
        raise HTTPException(status_code=401, detail="Пользователь недоступен")

    # Ротация: удаляем старый, выдаём новый
    await db.refreshtoken.delete(where={"id": stored.id})
    new_access = create_access_token({"sub": str(user.user_id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.user_id)})
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refreshtoken.create(
        data={"user_id": user.user_id, "token": new_refresh, "expires_at": expires}
    )

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.delete("/logout", response_model=MessageResponse)
async def logout(refresh_token: str, user: User = Depends(get_current_user)):
    stored = await db.refreshtoken.find_unique(where={"token": refresh_token})
    if stored and stored.user_id == user.user_id:
        await db.refreshtoken.delete(where={"id": stored.id})
    return MessageResponse(message="Выход выполнен")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(body: ChangePasswordRequest, user: User = Depends(get_current_user)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    await db.user.update(
        where={"user_id": user.user_id},
        data={"password_hash": hash_password(body.new_password)},
    )
    # Отзываем все refresh-токены
    await db.refreshtoken.delete_many(where={"user_id": user.user_id})
    return MessageResponse(message="Пароль успешно изменён")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest):
    # Заглушка: в реальном проекте отправляем письмо с токеном
    user = await db.user.find_unique(where={"email": body.email.lower()})
    # Всегда одинаковый ответ
    return MessageResponse(
        message="Если аккаунт существует, на email отправлена инструкция по сбросу пароля"
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    # Заглушка: нужна таблица reset-токенов. Пока принимаем любой токен длины > 10
    if len(body.token) < 10:
        raise HTTPException(status_code=400, detail="Некорректный токен")
    return MessageResponse(
        message="Функция сброса пароля по токену требует интеграции с email-сервисом. "
        "Используйте /change-password после входа."
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(token: str):
    return MessageResponse(message="Подтверждение email — заглушка (нужен email-сервис)")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(user: User = Depends(get_current_user)):
    return MessageResponse(message="Письмо отправлено (заглушка)")
