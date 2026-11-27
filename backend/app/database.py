from prisma import Prisma
from contextlib import asynccontextmanager

db = Prisma()


async def connect_db():
    if not db.is_connected():
        await db.connect()


async def disconnect_db():
    if db.is_connected():
        await db.disconnect()


@asynccontextmanager
async def get_db():
    await connect_db()
    try:
        yield db
    finally:
        pass  # connection managed by lifespan
