from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    name: str
    desc: Optional[str] = None


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    photo_id: int
    url: str
    sort_order: int


class RentalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    address: str = Field(..., min_length=5, max_length=300)
    area: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    time_measurement: str = Field(..., pattern="^(HOUR|DAY|MONTH)$")
    category_id: Optional[int] = None
    desc: Optional[str] = None
    amount_of_people: int = Field(1, ge=1, le=500)
    photo_url: Optional[str] = None
    availability: str = Field("FREE", pattern="^(FREE|BUSY|TEMP_CLOSED)$")


class RentalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    address: Optional[str] = Field(None, min_length=5, max_length=300)
    area: Optional[Decimal] = Field(None, gt=0)
    price: Optional[Decimal] = Field(None, gt=0)
    time_measurement: Optional[str] = Field(None, pattern="^(HOUR|DAY|MONTH)$")
    category_id: Optional[int] = None
    desc: Optional[str] = None
    amount_of_people: Optional[int] = Field(None, ge=1, le=500)
    photo_url: Optional[str] = None
    availability: Optional[str] = Field(None, pattern="^(FREE|BUSY|TEMP_CLOSED)$")


class RentalStatusUpdate(BaseModel):
    availability: str = Field(..., pattern="^(FREE|BUSY|TEMP_CLOSED)$")


class RentalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rental_id: int
    owner_id: int
    category_id: Optional[int] = None
    title: str
    address: str
    area: Decimal
    price: Decimal
    time_measurement: str
    photo_url: Optional[str] = None
    availability: str
    desc: Optional[str] = None
    amount_of_people: int
    created_at: datetime
    updated_at: datetime
    owner: Optional[dict] = None
    category: Optional[CategoryOut] = None
    photos: Optional[List[PhotoOut]] = None
    reviews_count: Optional[int] = None
    avg_rating: Optional[float] = None


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: int
    rental_id: int
    author_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    author: Optional[dict] = None
