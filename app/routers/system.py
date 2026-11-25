from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from app.database import db
from app.dependencies import get_current_user
from app.core.config import get_settings
from prisma.models import User

router = APIRouter(prefix="/api", tags=["System"])
settings = get_settings()


@router.get("/health")
async def health():
    try:
        # Простая проверка соединения
        await db.user.count()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)[:100]}"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "T-RENT API",
        "version": settings.APP_VERSION,
        "database": db_status,
    }


@router.get("/system/rating/recalculate")
async def recalculate_ratings(user: User = Depends(get_current_user)):
    """Пересчёт рейтингов пользователей (среднее арифметическое). Доступно авторизованным."""
    users = await db.user.find_many()
    updated = 0
    for u in users:
        reviews = await db.reviewofuser.find_many(where={"user_id": u.user_id})
        if reviews:
            avg = sum(r.rating for r in reviews) / len(reviews)
            await db.user.update(
                where={"user_id": u.user_id},
                data={"rating": Decimal(str(round(avg, 2)))},
            )
            updated += 1
    return {"message": "Рейтинги пересчитаны", "updated_users": updated}
