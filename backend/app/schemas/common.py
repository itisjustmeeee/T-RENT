from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    skip: int
    take: int


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
