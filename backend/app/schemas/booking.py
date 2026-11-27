from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class BookingCreate(BaseModel):
    rental_id: int
    start_date: datetime
    end_date: datetime
    guests_count: int = Field(1, ge=1, le=500)
    comment: Optional[str] = Field(None, max_length=1000)


class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(OPEN|CONFIRMED|CLOSED|CANCELLED)$")


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    owner_id: int
    booker_id: int
    rental_id: int
    start_date: datetime
    end_date: datetime
    status: str
    total_price: Decimal
    deposit_amount: Optional[Decimal] = None
    guests_count: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    rental: Optional[dict] = None
    owner: Optional[dict] = None
    booker: Optional[dict] = None
