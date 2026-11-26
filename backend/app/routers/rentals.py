from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Any, cast
from datetime import datetime, timezone
from decimal import Decimal
from app.database import db
from app.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_lesser,
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
from prisma.enums import BookingStatus
from prisma.types import (
    RentalWhereInput,
    RentalUpdateInput,
    BookingWhereInput,
)

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
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_area: Optional[float] = Query(None, ge=0),
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    take: int = Query(9, ge=1, le=100),
    user: Optional[User] = Depends(get_current_user_optional),
    city: Optional[str] = None,
    min_guests: Optional[int] = Query(None, ge=1),
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    sort_by: str = "newest",
):
    where: dict[str, Any] = {}

    if min_price is not None and max_price is not None:
        if min_price > max_price:
            raise HTTPException(
                status_code=400,
                detail="Минимальная цена не может быть больше максимальной",
            )

    if (start_at is None) != (end_at is None):
        raise HTTPException(
            status_code=400,
            detail="Необходимо указать и начало, и окончание аренды",
        )

    if sort_by not in ("newest", "price_asc", "price_desc"):
        raise HTTPException(
            status_code=400,
            detail="Недопустимый параметр сортировки",
        )

    if category_id is not None:
        where["category_id"] = category_id

    if owner_id is not None:
        where["owner_id"] = owner_id

    if availability is not None:
        where["availability"] = availability

    if city and city.strip():
        where["address"] = {
            "contains": city.strip(),
            "mode": "insensitive"
        }

    if search and search.strip():
        where["OR"] = [
            {
                "title": {
                    "contains": search.strip(),
                    "mode": "insensitive",
                }
            },
            {
                "address": {
                    "contains": search.strip(),
                    "mode": "insensitive"
                }
            },
            {
                "desc": {
                    "contains": search.strip(),
                    "mode": "insensitive"
                }
            },
        ]

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
        where["amount_of_people"] = {
            "gte": min_guests
        }

    if start_at is not None and end_at is not None:
        if start_at.tzinfo is None:
            start_at = start_at.replace(tzinfo=timezone.utc)

        if end_at.tzinfo is None:
            end_at = end_at.replace(tzinfo=timezone.utc)

        start_at = start_at.astimezone(timezone.utc)
        end_at = end_at.astimezone(timezone.utc)

        if start_at >= end_at:
            raise HTTPException(
                status_code=400,
                detail="Окончание аренды должно быть позже начала",
            )

        busy_bookings = await db.booking.find_many(
            where={
                "OR": [
                    {
                        "status": BookingStatus.OPEN
                    },
                    {
                        "status": BookingStatus.CONFIRMED
                    },
                ],
                "start_date": {
                    "lt": end_at
                },
                "end_date": {
                    "gt": start_at
                },
            },
        )

        busy_rental_ids = list({
            booking.rental_id
            for booking in busy_bookings
        })

        if busy_rental_ids:
            where["rental_id"] = {
                "not_in": busy_rental_ids
            }

    sort_options = {
        "newest": {
            "created_at": "desc"
        },
        "price_asc": {
            "price": "asc"
        },
        "price_desc": {
            "price": "desc"
        },
    }

    order = sort_options[sort_by]

    total = await db.rental.count(
        where=cast(RentalWhereInput, where)
    )

    rentals = await db.rental.find_many(
        where=cast(RentalWhereInput, where),
        skip=skip,
        take=take,
        include={
            "owner": True,
            "category": True,
            "photos": {
                "order_by": {
                    "sort_order": "asc"
                }
            },
        },
        order=cast(Any, order),
    )
    # Убираем password_hash
    result = []

    for rental in rentals:
        data = rental.model_dump()

        if data.get("owner"):
            data["owner"].pop("password_hash", None)

        result.append(data)

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
            "reviews": {
                "include": {
                    "author": True
                },
                "order_by": {
                    "created_at": "desc"
                }
            },
        },
    )
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    # Записываем просмотр
    if user:
        existing = await db.viewedrental.find_unique(
            where={
                "user_id_rental_id": {
                    "user_id": user.user_id,
                    "rental_id": rental_id
                }
            }
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
async def create_rental(
    body: RentalCreate,
    user: User = Depends(require_lesser)
):
    if body.category_id:
        cat = await db.category.find_unique(where={
            "category_id": body.category_id
        })
        if not cat:
            raise HTTPException(status_code=400, detail="Категория не найдена")

    rental = await db.rental.create(
        data={
            "owner_id": user.user_id,
            "title": body.title,
            "address": body.address,
            "area": body.area,
            "price": body.price,
            "time_measurement": cast(Any, body.time_measurement),
            "category_id": body.category_id,
            "desc": body.desc,
            "amount_of_people": body.amount_of_people,
            "photo_url": body.photo_url,
            "availability": cast(Any, body.availability),
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
        raise HTTPException(
            status_code=403,
            detail="Нет прав на редактирование"
        )

    data = body.model_dump(exclude_unset=True)
    if not data:
        return rental
    if "category_id" in data and data["category_id"]:
        cat = await db.category.find_unique(where={
            "category_id": data[
                "category_id"
            ]
        })
        if not cat:
            raise HTTPException(status_code=400, detail="Категория не найдена")

    updated = await db.rental.update(
        where={"rental_id": rental_id},
        data=cast(RentalUpdateInput, data),
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
        data={"availability": cast(Any, body.availability)},
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
            "OR": [
                {
                    "status": BookingStatus.OPEN
                },
                {
                    "status": BookingStatus.CONFIRMED
                },
            ],
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
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    where: dict = {
        "rental_id": rental_id,
        "status": {"in": ["OPEN", "CONFIRMED"]},
    }
    if from_date:
        where["end_date"] = {"gte": from_date}
    if to_date:
        where.setdefault("start_date", {})
        if isinstance(where.get("start_date"), dict):
            where["start_date"]["lte"] = to_date
        else:
            where["start_date"] = {"lte": to_date}

    bookings = await db.booking.find_many(
        where=cast(BookingWhereInput, where),
        order={"start_date": "asc"},
    )
    return {
        "rental_id": rental_id,
        "availability": rental.availability,
        "booked_slots": [
            {
                "booking_id": b.booking_id,
                "start_date": b.start_date,
                "end_date": b.end_date,
                "status": b.status,
            }
            for b in bookings
        ],
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
            "status": BookingStatus.CLOSED,
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
