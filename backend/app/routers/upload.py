import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from app.database import db
from app.dependencies import require_lesser
from app.core.config import get_settings
from app.schemas.common import MessageResponse
from prisma.models import User
import aiofiles

router = APIRouter(prefix="/api", tags=["Upload"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
UPLOAD_PATH = Path(settings.UPLOAD_DIR)
UPLOAD_PATH.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(require_lesser),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Допустимы только изображения: jpg, png, webp, gif")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Максимальный размер файла: {settings.MAX_UPLOAD_SIZE_MB} МБ")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_PATH / filename
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    url = f"/uploads/{filename}"
    return {"url": url, "filename": filename, "size": len(content)}


@router.delete("/upload/{filename}", response_model=MessageResponse)
async def delete_file(filename: str, user: User = Depends(require_lesser)):
    # Безопасность: только имя файла, без path traversal
    safe = Path(filename).name
    filepath = UPLOAD_PATH / safe
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    filepath.unlink()
    return MessageResponse(message="Файл удалён")


@router.post("/rentals/{rental_id}/photos")
async def add_photos(
    rental_id: int,
    urls: List[str],
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")

    existing = await db.photo.count(where={"rental_id": rental_id})
    created = []
    for i, url in enumerate(urls):
        photo = await db.photo.create(
            data={
                "rental_id": rental_id,
                "url": url,
                "sort_order": existing + i,
            }
        )
        created.append(photo)

    # Если нет главного photo_url — ставим первое
    if not rental.photo_url and created:
        await db.rental.update(
            where={"rental_id": rental_id},
            data={"photo_url": created[0].url},
        )
    return created


@router.put("/rentals/{rental_id}/photos/order")
async def reorder_photos(
    rental_id: int,
    photo_ids: List[int],
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental or rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")

    for order, pid in enumerate(photo_ids):
        await db.photo.update_many(
            where={"photo_id": pid, "rental_id": rental_id},
            data={"sort_order": order},
        )
    photos = await db.photo.find_many(
        where={"rental_id": rental_id},
        order={"sort_order": "asc"},
    )
    return photos
