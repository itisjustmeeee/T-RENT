from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.schemas.user import UserPublic


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    surname: Optional[str] = Field(None, max_length=100)
    patronymic: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    role: str = Field(..., pattern="^(RENTER|LESSER)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class AuthResponse(BaseModel):
    user: UserPublic
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
