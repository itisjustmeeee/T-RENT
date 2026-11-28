from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from decimal import Decimal
from app.database import db
from app.dependencies import get_current_user, require_renter, require_lesser
from app.schemas.booking import (
    BookingCreate,
    BookingStatusUpdate,
    BookingUpdate
)
from app.schemas.common import MessageResponse
from prisma.models import User
from prisma.enums import BookingStatus

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def _calc_price(rental, start: datetime, end: datetime) -> Decimal:
    """Серверный расчёт стоимости — не доверяем клиенту."""
    delta = end - start
    hours = max(delta.total_seconds() / 3600, 0.5)
    if rental.time_measurement == "HOUR":
        units = hours
    elif rental.time_measurement == "DAY":
        units = max(hours / 24, 1)
    else:  # MONTH
        units = max(hours / (24 * 30), 1)
    return (Decimal(str(units)) * rental.price).quantize(Decimal("0.01"))


@router.post("", status_code=201)
async def create_booking(body: BookingCreate, user: User = Depends(require_renter)):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=400, detail="Дата окончания должна быть позже начала")

    rental = await db.rental.find_unique(where={"rental_id": body.rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.availability != "FREE":
        raise HTTPException(status_code=400, detail="Помещение сейчас недоступно")
    if rental.owner_id == user.user_id:
        raise HTTPException(status_code=400, detail="Нельзя бронировать своё объявление")

    # Проверка ЧС
    in_bl = await db.blacklist.find_first(
        where={
            "lesser_id": rental.owner_id,
            "renter_id": user.user_id,
            "is_closed": False,
        }
    )
    if in_bl:
        raise HTTPException(status_code=403, detail="Вы в чёрном списке арендодателя")

    # Race condition protection: проверяем пересечения
    overlapping = await db.booking.find_first(
        where={
            "rental_id": body.rental_id,
            "status": {"in": ["OPEN", "CONFIRMED"]},
            "start_date": {"lt": body.end_date},
            "end_date": {"gt": body.start_date},
        }
    )
    if overlapping:
        raise HTTPException(status_code=409, detail="Выбранный период уже занят")

    if body.guests_count > rental.amount_of_people:
        raise HTTPException(
            status_code=400,
            detail=f"Максимум гостей: {rental.amount_of_people}",
        )

    total = _calc_price(rental, body.start_date, body.end_date)
    deposit = (total * Decimal("0.3")).quantize(Decimal("0.01"))  # 30% залог

    booking = await db.booking.create(
        data={
            "owner_id": rental.owner_id,
            "booker_id": user.user_id,
            "rental_id": body.rental_id,
            "start_date": body.start_date,
            "end_date": body.end_date,
            "status": "OPEN",
            "total_price": total,
            "deposit_amount": deposit,
            "guests_count": body.guests_count,
            "comment": body.comment,
        },
        include={"rental": True, "owner": True},
    )

    # Уведомление арендодателю
    await db.notification.create(
        data={
            "owner_id": rental.owner_id,
            "status": "INFO",
            "comment": f"Новое бронирование #{booking.booking_id} на «{rental.title}»",
        }
    )

    d = booking.model_dump()
    if d.get("owner"):
        d["owner"].pop("password_hash", None)
    return d


@router.get("/{booking_id}")
async def get_booking(booking_id: int, user: User = Depends(get_current_user)):
    booking = await db.booking.find_unique(
        where={"booking_id": booking_id},
        include={"rental": True, "owner": True, "booker": True},
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    if user.user_id not in (booking.booker_id, booking.owner_id):
        raise HTTPException(status_code=403, detail="Нет доступа")
    d = booking.model_dump()
    for key in ("owner", "booker"):
        if d.get(key):
            d[key].pop("password_hash", None)
    return d


@router.patch("/{booking_id}/confirm")
async def confirm_booking(booking_id: int, user: User = Depends(require_lesser)):
    booking = await db.booking.find_unique(where={"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    if booking.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")
    if booking.status != "OPEN":
        raise HTTPException(status_code=400, detail="Можно подтвердить только OPEN")

    updated = await db.booking.update(
        where={"booking_id": booking_id},
        data={"status": "CONFIRMED"},
        include={"rental": True, "booker": True},
    )
    await db.notification.create(
        data={
            "owner_id": booking.booker_id,
            "status": "SUCCESS",
            "comment": f"Бронирование #{booking_id} подтверждено арендодателем",
        }
    )
    d = updated.model_dump()
    if d.get("booker"):
        d["booker"].pop("password_hash", None)
    return d


@router.patch("/{booking_id}")
async def edit_booking(
    booking_id: int,
    body: BookingUpdate,
    user: User = Depends(require_lesser),
):
    booking = await db.booking.find_unique(
        where={"booking_id": booking_id}
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Бронирование не найдено",
        )

    if booking.owner_id != user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Нет прав на редактирование",
        )

    if booking.status != BookingStatus.OPEN:
        raise HTTPException(
            status_code=400,
            detail="Редактировать можно только ожидающие заявки",
        )

    data = body.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Не указаны данные для изменения",
        )

    start = data.get("start_date", booking.start_date)
    end = data.get("end_date", booking.end_date)

    if end <= start:
        raise HTTPException(
            status_code=400,
            detail="Дата окончания должна быть позже начала",
        )

    rental = await db.rental.find_unique(
        where={"rental_id": booking.rental_id}
    )

    if not rental:
        raise HTTPException(
            status_code=404,
            detail="Объявление не найдено",
        )

    guests = data.get("guests_count", booking.guests_count)

    if guests > rental.amount_of_people:
        raise HTTPException(
            status_code=400,
            detail=f"Максимум гостей: {rental.amount_of_people}",
        )

    total = _calc_price(rental, start, end)

    deposit = (
        total * Decimal("0.3")
    ).quantize(Decimal("0.01"))

    data["total_price"] = total
    data["deposit_amount"] = deposit

    overlap_filter = {
        "rental_id": booking.rental_id,
        "booking_id": {"not": booking_id},
        "start_date": {"lt": end},
        "end_date": {"gt": start},
    }

    overlap_open = await db.booking.find_first(
        where={
            **overlap_filter,
            "status": BookingStatus.OPEN,
        }
    )

    overlap_confirmed = await db.booking.find_first(
        where={
            **overlap_filter,
            "status": BookingStatus.CONFIRMED,
        }
    )

    if overlap_open or overlap_confirmed:
        raise HTTPException(
            status_code=409,
            detail="Выбранный период уже занят",
        )

    updated = await db.booking.update(
        where={"booking_id": booking_id},
        data=data,
    )

    await db.notification.create(
        data={
            "owner_id": booking.booker_id,
            "status": "INFO",
            "comment": (
                f"Условия бронирования #{booking_id} "
                "были изменены арендодателем"
            ),
        }
    )

    return updated.model_dump()


@router.patch("/{booking_id}/status")
async def update_booking_status(
    booking_id: int,
    body: BookingStatusUpdate,
    user: User = Depends(get_current_user),
):
    booking = await db.booking.find_unique(
        where={"booking_id": booking_id}
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Бронирование не найдено",
        )

    if booking.status not in (
        BookingStatus.OPEN,
        BookingStatus.CONFIRMED,
    ):
        raise HTTPException(
            status_code=400,
            detail="Это бронирование уже нельзя изменить",
        )

    if user.user_id == booking.owner_id:
        if body.status not in ("CANCELLED", "CLOSED"):
            raise HTTPException(
                status_code=403,
                detail="Недопустимое действие арендодателя",
            )

        if (
            body.status == "CLOSED"
            and booking.status != BookingStatus.CONFIRMED
        ):
            raise HTTPException(
                status_code=400,
                detail="Завершить можно только подтверждённую аренду",
            )

    elif user.user_id == booking.booker_id:
        if body.status != "CANCELLED":
            raise HTTPException(
                status_code=403,
                detail="Арендатор может только отменить бронирование",
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="Нет прав на изменение бронирования",
        )

    updated = await db.booking.update(
        where={"booking_id": booking_id},
        data={"status": body.status},
    )

    recipient_id = (
        booking.booker_id
        if user.user_id == booking.owner_id
        else booking.owner_id
    )

    message = (
        "Бронирование отменено"
        if body.status == "CANCELLED"
        else "Аренда завершена"
    )

    await db.notification.create(
        data={
            "owner_id": recipient_id,
            "status": "INFO",
            "comment": f"{message}. Номер бронирования: #{booking_id}",
        }
    )

    return updated


@router.post("/{booking_id}/prepayment", response_model=MessageResponse)
async def pay_prepayment(booking_id: int, user: User = Depends(require_renter)):
    booking = await db.booking.find_unique(where={"booking_id": booking_id})
    if not booking or booking.booker_id != user.user_id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    # Заглушка оплаты — в реале интеграция с платёжным шлюзом
    return MessageResponse(
        message=f"Предоплата {booking.total_price} ₽ принята (мок). Статус бронирования: {booking.status}"
    )


@router.post("/{booking_id}/deposit", response_model=MessageResponse)
async def pay_deposit(booking_id: int, user: User = Depends(require_renter)):
    booking = await db.booking.find_unique(where={"booking_id": booking_id})
    if not booking or booking.booker_id != user.user_id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    deposit = booking.deposit_amount or Decimal("0")
    return MessageResponse(
        message=f"Залог {deposit} ₽ принят/удержан (мок)"
    )
