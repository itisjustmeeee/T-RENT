"""
Простой скрипт для наполнения базы тестовыми данными.
Запускать после prisma db push:

    python seed.py
"""

import asyncio
from prisma import Prisma
from prisma.enums import Role, TimeMeasurement, Availability, BookingStatus
from decimal import Decimal


async def main():
    db = Prisma()
    await db.connect()

    print("🌱 Seeding database...")

    # Категории
    categories_data = [
        {"name": "Лофт", "desc": "Просторные помещения с высокими потолками"},
        {"name": "Кабинет", "desc": "Тихие кабинеты для работы и встреч"},
        {"name": "Коворкинг", "desc": "Общие рабочие пространства"},
        {"name": "Зал", "desc": "Залы для мероприятий и танцев"},
        {"name": "Фото-студия", "desc": "Студии с оборудованием для съёмок"},
        {"name": "Апартаменты", "desc": "Жилые помещения под мероприятия"},
    ]

    for cat in categories_data:
        existing = await db.category.find_unique(where={"name": cat["name"]})
        if not existing:
            await db.category.create(data=cat)
            print(f"  + Category: {cat['name']}")

    # Тестовые пользователи
    users_data = [
        {
            "role": Role.LESSER,
            "name": "Анна",
            "surname": "Смирнова",
            "email": "anna@example.com",
            "password_hash": "$2b$12$dummyhashforanna000000000000000000000000000000000",  # заглушка
            "phone_number": "+79991234567",
            "rating": Decimal("4.90"),
        },
        {
            "role": Role.RENTER,
            "name": "Алексей",
            "surname": "Иванов",
            "email": "alexey@example.com",
            "password_hash": "$2b$12$dummyhashforalexey00000000000000000000000000000",
            "phone_number": "+79997654321",
            "rating": Decimal("4.70"),
        },
    ]

    created_users = []
    for u in users_data:
        existing = await db.user.find_unique(where={"email": u["email"]})
        if not existing:
            user = await db.user.create(data=u)
            created_users.append(user)
            print(f"  + User: {u['name']} ({u['role']})")
        else:
            created_users.append(existing)

    # Объявления (если есть арендодатель)
    lesser = next((u for u in created_users if u.role == Role.LESSER), None)
    loft_cat = await db.category.find_unique(where={"name": "Лофт"})

    if lesser and loft_cat:
        existing_rental = await db.rental.find_first(
            where={"title": "Лофт «Свет»"}
        )
        if not existing_rental:
            await db.rental.create(
                data={
                    "owner_id": lesser.user_id,
                    "category_id": loft_cat.category_id,
                    "title": "Лофт «Свет»",
                    "address": "Москва, ул. Бауманская, 11",
                    "area": Decimal("85.00"),
                    "price": Decimal("2500.00"),
                    "time_measurement": TimeMeasurement.HOUR,
                    "photo_url": None,
                    "availability": Availability.FREE,
                    "desc": "Светлый лофт с высокими потолками и большими окнами.",
                    "amount_of_people": 12,
                }
            )
            print("  + Rental: Лофт «Свет»")

    print("✅ Seeding completed")
    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
