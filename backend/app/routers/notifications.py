from fastapi import APIRouter, Depends, HTTPException
from app.database import db
from app.dependencies import get_current_user
from app.schemas.common import MessageResponse
from prisma.models import User

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/me")
async def get_my_notifications(
    user: User = Depends(get_current_user),
    unread_only: bool = False,
    skip: int = 0,
    take: int = 50,
):
    where: dict = {"owner_id": user.user_id}
    if unread_only:
        where["is_read"] = False
    items = await db.notification.find_many(
        where=where,
        order={"created_at": "desc"},
        skip=skip,
        take=take,
    )
    return items


@router.patch("/me/{notification_id}/read", response_model=MessageResponse)
async def mark_read(notification_id: int, user: User = Depends(get_current_user)):
    n = await db.notification.find_unique(where={"notification_id": notification_id})
    if not n or n.owner_id != user.user_id:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    await db.notification.update(
        where={"notification_id": notification_id},
        data={"is_read": True},
    )
    return MessageResponse(message="Прочитано")


@router.patch("/me/read-all", response_model=MessageResponse)
async def mark_all_read(user: User = Depends(get_current_user)):
    await db.notification.update_many(
        where={"owner_id": user.user_id, "is_read": False},
        data={"is_read": True},
    )
    return MessageResponse(message="Все уведомления прочитаны")
