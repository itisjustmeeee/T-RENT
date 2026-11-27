from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.database import db
from app.dependencies import get_current_user, require_lesser, _role_str
from app.schemas.user import UserPublic, UserUpdate, BlackListCreate, BlackListItem
from app.schemas.common import MessageResponse
from prisma.models import User

router = APIRouter(prefix="/api/users", tags=["Users"])


def _safe_user(user) -> dict:
    data = user.model_dump() if hasattr(user, "model_dump") else dict(user)
    data.pop("password_hash", None)
    if "role" in data and data["role"] is not None:
        data["role"] = str(data["role"].value) if hasattr(data["role"], "value") else str(data["role"])
    return data


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(_safe_user(user))


@router.patch("/me", response_model=UserPublic)
async def update_me(body: UserUpdate, user: User = Depends(get_current_user)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        return UserPublic.model_validate(_safe_user(user))
    updated = await db.user.update(where={"user_id": user.user_id}, data=data)
    return UserPublic.model_validate(_safe_user(updated))


@router.delete("/me", response_model=MessageResponse)
async def delete_me(user: User = Depends(get_current_user)):
    await db.refreshtoken.delete_many(where={"user_id": user.user_id})
    await db.user.delete(where={"user_id": user.user_id})
    return MessageResponse(message="Аккаунт удалён")


# ---------- Blacklist (ЧС) — до /{user_id}, чтобы пути /me/* не пересекались ----------

@router.get("/me/blacklist")
async def get_my_blacklist(user: User = Depends(require_lesser)):
    items = await db.blacklist.find_many(
        where={"lesser_id": user.user_id, "is_closed": False},
        include={"renter": True},
        order={"created_at": "desc"},
    )
    result = []
    for item in items:
        d = {
            "black_list_id": item.black_list_id,
            "lesser_id": item.lesser_id,
            "renter_id": item.renter_id,
            "is_closed": item.is_closed,
            "created_at": item.created_at,
            "fine_id": item.fine_id,
            "renter": _safe_user(item.renter) if item.renter else None,
        }
        result.append(d)
    return result


@router.post("/me/blacklist", status_code=201)
async def add_to_blacklist(body: BlackListCreate, user: User = Depends(require_lesser)):
    if body.renter_id == user.user_id:
        raise HTTPException(status_code=400, detail="Нельзя добавить себя в ЧС")

    renter = await db.user.find_unique(where={"user_id": body.renter_id})
    if not renter:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # amount <= 0 отсекается Pydantic (ValueError → 422). Доп. защита:
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Сумма штрафа (amount) должна быть больше 0",
        )

    fine_id = body.fine_id
    if fine_id is not None:
        fine = await db.fine.find_unique(where={"fine_id": fine_id})
        if not fine:
            raise HTTPException(status_code=400, detail="Штраф с таким fine_id не найден")

    # Если передали amount без fine_id — создаём Fine
    if body.amount is not None and fine_id is None:
        import uuid
        try:
            fine = await db.fine.create(
                data={
                    "fine_number": f"FINE-{uuid.uuid4().hex[:10].upper()}",
                    "amount": body.amount,
                }
            )
            fine_id = fine.fine_id
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Не удалось создать штраф: {str(e)[:200]}",
            )

    existing = await db.blacklist.find_first(
        where={"lesser_id": user.user_id, "renter_id": body.renter_id, "is_closed": False}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Уже в чёрном списке")

    try:
        item = await db.blacklist.create(
            data={
                "lesser_id": user.user_id,
                "renter_id": body.renter_id,
                "fine_id": fine_id,
            },
            include={"renter": True},
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось добавить в ЧС: {str(e)[:200]}",
        )

    await db.user.update(where={"user_id": body.renter_id}, data={"is_blacklisted": True})

    return {
        "black_list_id": item.black_list_id,
        "lesser_id": item.lesser_id,
        "renter_id": item.renter_id,
        "is_closed": item.is_closed,
        "created_at": item.created_at,
        "fine_id": item.fine_id,
        "renter": _safe_user(item.renter) if item.renter else None,
    }


@router.delete("/me/blacklist/{renter_id}", response_model=MessageResponse)
async def remove_from_blacklist(renter_id: int, user: User = Depends(require_lesser)):
    item = await db.blacklist.find_first(
        where={"lesser_id": user.user_id, "renter_id": renter_id, "is_closed": False}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    await db.blacklist.update(
        where={"black_list_id": item.black_list_id},
        data={"is_closed": True},
    )
    remaining = await db.blacklist.count(
        where={"renter_id": renter_id, "is_closed": False}
    )
    if remaining == 0:
        await db.user.update(where={"user_id": renter_id}, data={"is_blacklisted": False})
    return MessageResponse(message="Пользователь удалён из чёрного списка")


@router.get("/me/rentals")
async def get_my_rentals(user: User = Depends(require_lesser)):
    rentals = await db.rental.find_many(
        where={"owner_id": user.user_id},
        include={"category": True, "photos": True},
        order={"created_at": "desc"},
    )
    return rentals


@router.get("/me/bookings")
async def get_my_bookings(user: User = Depends(get_current_user)):
    if _role_str(user) == "RENTER":
        bookings = await db.booking.find_many(
            where={"booker_id": user.user_id},
            include={"rental": True, "owner": True},
            order={"created_at": "desc"},
        )
    else:
        bookings = await db.booking.find_many(
            where={"owner_id": user.user_id},
            include={"rental": True, "booker": True},
            order={"created_at": "desc"},
        )
    return bookings


@router.get("/me/viewed")
async def get_viewed(user: User = Depends(get_current_user)):
    items = await db.viewedrental.find_many(
        where={"user_id": user.user_id},
        include={"rental": {"include": {"category": True}}},
        order={"viewed_at": "desc"},
        take=50,
    )
    return [i.rental for i in items if i.rental]


@router.get("/{user_id}")
async def get_user_public(user_id: int):
    user = await db.user.find_unique(
        where={"user_id": user_id},
        include={"rentals": True},
    )
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    data = _safe_user(user)
    data["rentals"] = [
        {
            "rental_id": r.rental_id,
            "title": r.title,
            "price": str(r.price),
            "availability": str(r.availability),
            "photo_url": r.photo_url,
        }
        for r in (user.rentals or [])
    ]
    return data
