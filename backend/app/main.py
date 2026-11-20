from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from prisma import Prisma
import os
from dotenv import load_dotenv

load_dotenv()

# Глобальный клиент Prisma
db = Prisma()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Подключение / отключение от БД при старте и остановке приложения"""
    await db.connect()
    print("✅ Connected to database")
    yield
    await db.disconnect()
    print("❌ Disconnected from database")


app = FastAPI(
    title=os.getenv("APP_NAME", "T-RENT API"),
    version=os.getenv("APP_VERSION", "1.1.0"),
    description="API для сервиса почасовой/посуточной аренды помещений T-RENT",
    lifespan=lifespan,
)

# CORS (чтобы фронт мог ходить)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== HEALTH ====================

@app.get("/api/health", tags=["System"])
async def health_check():
    """Health-check эндпоинт"""
    return {
        "status": "ok",
        "service": "T-RENT API",
        "version": os.getenv("APP_VERSION", "1.1.0")
    }


# ==================== CATEGORIES ====================

@app.get("/api/categories", tags=["Categories"])
async def get_categories():
    """Список всех категорий"""
    categories = await db.category.find_many(order={"name": "asc"})
    return categories


# ==================== RENTALS (ОБЪЯВЛЕНИЯ) ====================

@app.get("/api/rentals", tags=["Rentals"])
async def get_rentals(
    category_id: int | None = None,
    owner_id: int | None = None,
    availability: str | None = None,
    skip: int = 0,
    take: int = 20,
):
    """
    Каталог объявлений.
    Можно фильтровать по category_id, owner_id, availability.
    """
    where = {}
    if category_id is not None:
        where["category_id"] = category_id
    if owner_id is not None:
        where["owner_id"] = owner_id
    if availability is not None:
        where["availability"] = availability

    rentals = await db.rental.find_many(
        where=where,
        skip=skip,
        take=take,
        include={
            "owner": True,
            "category": True,
        },
        order={"created_at": "desc"},
    )
    return rentals


@app.get("/api/rentals/{rental_id}", tags=["Rentals"])
async def get_rental(rental_id: int):
    """Получение одного объявления по id"""
    rental = await db.rental.find_unique(
        where={"rental_id": rental_id},
        include={
            "owner": True,
            "category": True,
            "reviews": {
                "include": {"author": True}
            },
        },
    )
    if not rental:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    return rental


# ==================== USERS ====================

@app.get("/api/users/{user_id}", tags=["Users"])
async def get_user(user_id: int):
    """Публичный профиль пользователя"""
    user = await db.user.find_unique(
        where={"user_id": user_id},
        include={
            "rentals": True,
        },
    )
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Не отдаём хеш пароля
    user_dict = user.model_dump()
    user_dict.pop("password_hash", None)
    return user_dict


# ==================== BOOKINGS ====================

@app.get("/api/bookings/{booking_id}", tags=["Bookings"])
async def get_booking(booking_id: int):
    """Информация о конкретном бронировании"""
    booking = await db.booking.find_unique(
        where={"booking_id": booking_id},
        include={
            "owner": True,
            "booker": True,
            "rental": True,
        },
    )
    if not booking:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    return booking


# ==================== FAVORITES ====================

@app.get("/api/favorites", tags=["Favorites"])
async def get_favorites(user_id: int):
    """
    Список избранных объявлений пользователя.
    В реальном API user_id будет браться из JWT.
    """
    favorites = await db.favorite.find_many(
        where={"user_id": user_id},
        include={"rental": True},
    )
    return favorites


# ==================== ROOT ====================

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "T-RENT API is running",
        "docs": "/docs",
        "health": "/api/health",
    }
