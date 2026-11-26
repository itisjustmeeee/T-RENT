from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import db
from app.dependencies import get_current_user, require_renter
from app.schemas.common import MessageResponse
from prisma.models import User

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])


class FavoriteCreate(BaseModel):
    rental_id: int


@router.get("")
async def get_favorites(user: User = Depends(get_current_user)):
    items = await db.favorite.find_many(
        where={"user_id": user.user_id},
        include={
            "rental": {
                "include": {
                    "category": True,
                    "photos": True,
                    "owner": True,
                }
            }
        },
        order={"favorite_id": "desc"},
    )
    result = []
    for item in items:
        if item.rental:
            d = item.rental.model_dump()
            if d.get("owner"):
                d["owner"].pop("password_hash", None)
            result.append(d)
    return result


@router.post("", status_code=201)
async def add_favorite(body: FavoriteCreate, user: User = Depends(get_current_user)):
    rental = await db.rental.find_unique(where={"rental_id": body.rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    existing = await db.favorite.find_unique(
        where={"user_id_rental_id": {"user_id": user.user_id, "rental_id": body.rental_id}}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Уже в избранном")

    fav = await db.favorite.create(
        data={"user_id": user.user_id, "rental_id": body.rental_id},
        include={"rental": True},
    )
    return fav


@router.delete("/{rental_id}", response_model=MessageResponse)
async def remove_favorite(rental_id: int, user: User = Depends(get_current_user)):
    existing = await db.favorite.find_unique(
        where={"user_id_rental_id": {"user_id": user.user_id, "rental_id": rental_id}}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Не найдено в избранном")
    await db.favorite.delete(where={"favorite_id": existing.favorite_id})
    return MessageResponse(message="Удалено из избранного")
