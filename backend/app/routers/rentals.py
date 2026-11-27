from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from decimal import Decimal
from app.database import db
from app.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_lesser
)
from app.schemas.rental import (
    RentalCreate,
    RentalUpdate,
    RentalStatusUpdate,
    ReviewCreate,
    CategoryOut,
)
from app.schemas.common import MessageResponse
from prisma.models import User
from typing import Optional, List, Literal

router = APIRouter(tags=["Rentals"])


@router.get("/api/categories", response_model=List[CategoryOut])
async def get_categories():
    cats = await db.category.find_many(order={"name": "asc"})
    return cats


@router.get("/api/rentals")
async def get_rentals(
    category_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    availability: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_area: Optional[float] = None,
    min_guests: Optional[int] = Query(None, ge=1, le=500),
    search: Optional[str] = None,
    sort_by: Literal["newest", "price_asc", "price_desc"] = "newest",
    skip: int = Query(0, ge=0),
    take: int = Query(20, ge=1, le=100),
    user: Optional[User] = Depends(get_current_user_optional),
):
    where: dict = {}
    if category_id is not None:
        where["category_id"] = category_id
    if owner_id is not None:
        where["owner_id"] = owner_id
    if availability is not None:
        where["availability"] = availability
    if min_price is not None or max_price is not None:
        price_filter = {}
        if min_price is not None:
            price_filter["gte"] = Decimal(str(min_price))
        if max_price is not None:
            price_filter["lte"] = Decimal(str(max_price))
        where["price"] = price_filter
    if min_area is not None:
        where["area"] = {"gte": Decimal(str(min_area))}
    if min_guests is not None:
        where["amount_of_people"] = {"gte": min_guests}
    if search:
        where["OR"] = [
            {"title": {"contains": search, "mode": "insensitive"}},
            {"address": {"contains": search, "mode": "insensitive"}},
            {"desc": {"contains": search, "mode": "insensitive"}},
        ]

    total = await db.rental.count(where=where)

    sort_order = {
        "newest": {"created_at": "desc"},
        "price_asc": {"price": "asc"},
        "price_desc": {"price": "desc"},
    }[sort_by]

    rentals = await db.rental.find_many(
        where=where,
        skip=skip,
        take=take,
        include={
            "owner": True,
            "category": True,
            "photos": {"order_by": {"sort_order": "asc"}},
        },
        order=sort_order,
    )
    # Убираем password_hash
    result = []
    for r in rentals:
        d = r.model_dump()
        if d.get("owner"):
            d["owner"].pop("password_hash", None)
        result.append(d)

    return {
        "items": result,
        "total": total,
        "skip": skip,
        "take": take,
    }


@router.get("/api/rentals/{rental_id}")
async def get_rental(
    rental_id: int,
    user: Optional[User] = Depends(get_current_user_optional),
):
    rental = await db.rental.find_unique(
        where={"rental_id": rental_id},
        include={
            "owner": True,
            "category": True,
            "photos": {"order_by": {"sort_order": "asc"}},
            "reviews": {"include": {"author": True}, "order_by": {"created_at": "desc"}},
        },
    )
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    # Записываем просмотр
    if user:
        existing = await db.viewedrental.find_unique(
            where={"user_id_rental_id": {"user_id": user.user_id, "rental_id": rental_id}}
        )
        if existing:
            await db.viewedrental.update(
                where={"id": existing.id},
                data={"viewed_at": datetime.now(timezone.utc)},
            )
        else:
            try:
                await db.viewedrental.create(
                    data={"user_id": user.user_id, "rental_id": rental_id}
                )
            except Exception:
                pass

    d = rental.model_dump()
    if d.get("owner"):
        d["owner"].pop("password_hash", None)
    for rev in d.get("reviews") or []:
        if rev.get("author"):
            rev["author"].pop("password_hash", None)
    # Средний рейтинг
    reviews = rental.reviews or []
    if reviews:
        d["avg_rating"] = round(sum(r.rating for r in reviews) / len(reviews), 1)
        d["reviews_count"] = len(reviews)
    else:
        d["avg_rating"] = None
        d["reviews_count"] = 0
    return d


@router.post("/api/rentals", status_code=201)
async def create_rental(body: RentalCreate, user: User = Depends(require_lesser)):
    if body.category_id:
        cat = await db.category.find_unique(where={"category_id": body.category_id})
        if not cat:
            raise HTTPException(status_code=400, detail="Категория не найдена")

    rental = await db.rental.create(
        data={
            "owner_id": user.user_id,
            "title": body.title,
            "address": body.address,
            "area": body.area,
            "price": body.price,
            "time_measurement": body.time_measurement,
            "category_id": body.category_id,
            "desc": body.desc,
            "amount_of_people": body.amount_of_people,
            "photo_url": body.photo_url,
            "availability": body.availability,
        },
        include={"category": True, "photos": True},
    )
    return rental


@router.patch("/api/rentals/{rental_id}")
async def update_rental(
    rental_id: int,
    body: RentalUpdate,
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return rental
    if "category_id" in data and data["category_id"]:
        cat = await db.category.find_unique(where={"category_id": data["category_id"]})
        if not cat:
            raise HTTPException(status_code=400, detail="Категория не найдена")

    updated = await db.rental.update(
        where={"rental_id": rental_id},
        data=data,
        include={"category": True, "photos": True},
    )
    return updated


@router.patch("/api/rentals/{rental_id}/status")
async def update_rental_status(
    rental_id: int,
    body: RentalStatusUpdate,
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")

    updated = await db.rental.update(
        where={"rental_id": rental_id},
        data={"availability": body.availability},
    )
    return updated


@router.delete("/api/rentals/{rental_id}", response_model=MessageResponse)
async def delete_rental(rental_id: int, user: User = Depends(require_lesser)):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав на удаление")

    # Проверяем активные брони
    active = await db.booking.count(
        where={
            "rental_id": rental_id,
            "status": {"in": ["OPEN", "CONFIRMED"]},
        }
    )
    if active > 0:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить объявление с активными бронированиями",
        )

    await db.rental.delete(where={"rental_id": rental_id})
    return MessageResponse(message="Объявление удалено")


@router.get("/api/rentals/{rental_id}/calendar")
async def get_rental_calendar(
    rental_id: int,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
):
    """Календарь занятых слотов объявления."""
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    if from_date and to_date and to_date < from_date:
        raise HTTPException(
            status_code=400,
            detail="to_date должна быть не раньше from_date",
        )

    # Простая фильтрация: все активные брони, затем при необходимости режем по датам в Python
    bookings = await db.booking.find_many(
        where={
            "rental_id": rental_id,
            "status": {"in": ["OPEN", "CONFIRMED"]},
        },
        order={"start_date": "asc"},
    )

    slots = []
    for b in bookings:
        if from_date is not None and b.end_date < from_date:
            continue
        if to_date is not None and b.start_date > to_date:
            continue
        slots.append(
            {
                "booking_id": b.booking_id,
                "start_date": b.start_date,
                "end_date": b.end_date,
                "status": str(b.status),
            }
        )

    return {
        "rental_id": rental_id,
        "availability": str(rental.availability),
        "booked_slots": slots,
    }


# ---------- Reviews ----------

@router.post("/api/rentals/{rental_id}/reviews", status_code=201)
async def create_rental_review(
    rental_id: int,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    # Можно оставить отзыв только если была завершённая аренда
    past = await db.booking.find_first(
        where={
            "rental_id": rental_id,
            "booker_id": user.user_id,
            "status": "CLOSED",
        }
    )
    if not past:
        raise HTTPException(
            status_code=403,
            detail="Отзыв можно оставить только после завершённой аренды",
        )

    existing = await db.reviewofrental.find_first(
        where={"rental_id": rental_id, "author_id": user.user_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже оставляли отзыв")

    review = await db.reviewofrental.create(
        data={
            "rental_id": rental_id,
            "author_id": user.user_id,
            "rating": body.rating,
            "comment": body.comment,
        },
        include={"author": True},
    )
    d = review.model_dump()
    if d.get("author"):
        d["author"].pop("password_hash", None)
    return d


@router.get("/api/rentals/{rental_id}/reviews")
async def get_rental_reviews(rental_id: int, skip: int = 0, take: int = 20):
    reviews = await db.reviewofrental.find_many(
        where={"rental_id": rental_id},
        include={"author": True},
        order={"created_at": "desc"},
        skip=skip,
        take=take,
    )
    result = []
    for r in reviews:
        d = r.model_dump()
        if d.get("author"):
            d["author"].pop("password_hash", None)
        result.append(d)
    return result


@router.post("/api/users/{user_id}/reviews", status_code=201)
async def create_user_review(
    user_id: int,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
):
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Нельзя оценить себя")
    target = await db.user.find_unique(where={"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    review = await db.reviewofuser.create(
        data={
            "author_id": user.user_id,
            "user_id": user_id,
            "rating": body.rating,
            "comment": body.comment,
        },
        include={"author": True},
    )
    # Пересчёт рейтинга
    all_reviews = await db.reviewofuser.find_many(where={"user_id": user_id})
    if all_reviews:
        avg = sum(r.rating for r in all_reviews) / len(all_reviews)
        await db.user.update(
            where={"user_id": user_id},
            data={"rating": Decimal(str(round(avg, 2)))},
        )
    d = review.model_dump()
    if d.get("author"):
        d["author"].pop("password_hash", None)
    return d


@router.get("/api/users/{user_id}/reviews")
async def get_user_reviews(user_id: int, skip: int = 0, take: int = 20):
    reviews = await db.reviewofuser.find_many(
        where={"user_id": user_id},
        include={"author": True},
        order={"created_at": "desc"},
        skip=skip,
        take=take,
    )
    result = []
    for r in reviews:
        d = r.model_dump()
        if d.get("author"):
            d["author"].pop("password_hash", None)
        result.append(d)
    return result
