from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    role: str
    name: str
    surname: Optional[str] = None
    patronymic: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None
    is_blacklisted: bool = False
    is_blocked: bool = False
    rating: Optional[Decimal] = None
    is_verified: bool = False
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    surname: Optional[str] = Field(None, max_length=100)
    patronymic: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)


class BlackListCreate(BaseModel):
    renter_id: int
    fine_id: Optional[int] = None


class BlackListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    black_list_id: int
    lesser_id: int
    renter_id: int
    is_closed: bool
    created_at: datetime
    renter: Optional[UserPublic] = None
