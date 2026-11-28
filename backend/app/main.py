from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from app.database import db, connect_db, disconnect_db
from app.core.config import get_settings
from app.routers import auth, users, rentals, bookings, favorites, notifications, upload, system

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    print("✅ Connected to database")
    # Создаём папку uploads
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield
    await disconnect_db()
    print("❌ Disconnected from database")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API сервиса почасовой/посуточной аренды помещений **T-RENT**.\n\n"
        "Версия 1.2 — полный набор эндпоинтов: авторизация (JWT + refresh), "
        "CRUD объявлений, бронирования с серверным расчётом цены и защитой от race condition, "
        "избранное, отзывы, ЧС, уведомления, загрузка фото."
    ),
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статика для загруженных файлов
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

# Роутеры
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(rentals.router)
app.include_router(bookings.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(upload.router)
app.include_router(system.router)


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "T-RENT API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
