import os
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel, Field, HttpUrl
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

# URL: http(s)://... или локальный /uploads/...
_URL_RE = re.compile(
    r"^(https?://[^\s]+|/uploads/[A-Za-z0-9._\-]+)$",
    re.IGNORECASE,
)


class PhotosAddRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1)


class PhotosOrderRequest(BaseModel):
    photo_ids: List[int] = Field(..., min_length=1)


def _validate_photo_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Пустой URL фото")
    if not _URL_RE.match(url):
        raise HTTPException(
            status_code=400,
            detail=(
                "Некорректный URL фото. Допустимы: "
                "https://... / http://... или /uploads/<имя_файла>"
            ),
        )
    if len(url) > 2000:
        raise HTTPException(status_code=400, detail="URL слишком длинный")
    return url


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(require_lesser),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Допустимы только изображения: jpg, jpeg, png, webp, gif",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Максимальный размер файла: {settings.MAX_UPLOAD_SIZE_MB} МБ",
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Пустой файл")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_PATH / filename
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    url = f"/uploads/{filename}"
    return {"url": url, "filename": filename, "size": len(content)}


@router.delete("/upload/{filename}", response_model=MessageResponse)
async def delete_file(filename: str, user: User = Depends(require_lesser)):
    safe = Path(filename).name
    if safe != filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Некорректное имя файла")
    filepath = UPLOAD_PATH / safe
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    filepath.unlink()
    return MessageResponse(message="Файл удалён")


@router.post("/rentals/{rental_id}/photos")
async def add_photos(
    rental_id: int,
    body: PhotosAddRequest,
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")

    validated_urls = [_validate_photo_url(u) for u in body.urls]

    existing = await db.photo.count(where={"rental_id": rental_id})
    created = []
    for i, url in enumerate(validated_urls):
        photo = await db.photo.create(
            data={
                "rental_id": rental_id,
                "url": url,
                "sort_order": existing + i,
            }
        )
        created.append(photo)

    if not rental.photo_url and created:
        await db.rental.update(
            where={"rental_id": rental_id},
            data={"photo_url": created[0].url},
        )
    return created


@router.put("/rentals/{rental_id}/photos/order")
async def reorder_photos(
    rental_id: int,
    body: PhotosOrderRequest,
    user: User = Depends(require_lesser),
):
    rental = await db.rental.find_unique(where={"rental_id": rental_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if rental.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Нет прав")

    existing_photos = await db.photo.find_many(where={"rental_id": rental_id})
    existing_ids = {p.photo_id for p in existing_photos}

    if not body.photo_ids:
        raise HTTPException(status_code=400, detail="Список photo_ids пуст")

    if len(body.photo_ids) != len(set(body.photo_ids)):
        raise HTTPException(status_code=400, detail="В photo_ids есть дубликаты")

    unknown = [pid for pid in body.photo_ids if pid not in existing_ids]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"photo_id не принадлежат этому объявлению: {unknown}",
        )

    missing = existing_ids - set(body.photo_ids)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Нужно передать все photo_id объявления в нужном порядке. "
                f"Не хватает: {sorted(missing)}"
            ),
        )

    for order, pid in enumerate(body.photo_ids):
        await db.photo.update(
            where={"photo_id": pid},
            data={"sort_order": order},
        )

    photos = await db.photo.find_many(
        where={"rental_id": rental_id},
        order={"sort_order": "asc"},
    )
    return photos
