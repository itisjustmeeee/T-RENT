from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
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
    renter_id: int = Field(..., gt=0)
    fine_id: Optional[int] = Field(None, gt=0)
    # Можно передать сумму — создадим Fine автоматически
    amount: Optional[Decimal] = Field(
        None,
        description="Сумма штрафа. Если указана, создаётся запись Fine и привязывается к ЧС",
    )

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Сумма штрафа (amount) должна быть больше 0")
        return v


class BlackListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    black_list_id: int
    lesser_id: int
    renter_id: int
    is_closed: bool
    created_at: datetime
    fine_id: Optional[int] = None
    renter: Optional[UserPublic] = None
