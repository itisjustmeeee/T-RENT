"""
Скрипт наполнения тестовыми данными.
Запуск: python seed.py  (после prisma db push)
"""
import asyncio
from decimal import Decimal
from prisma import Prisma
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main():
    db = Prisma()
    await db.connect()
    print("Seeding...")

    # Категории
    categories_data = [
        {"name": "Лофт", "desc": "Просторные лофты для мероприятий"},
        {"name": "Кабинет", "desc": "Офисные кабинеты и переговорные"},
        {"name": "Коворкинг", "desc": "Рабочие места в коворкинге"},
        {"name": "Зал", "desc": "Залы для танцев, йоги, событий"},
        {"name": "Фото-студия", "desc": "Студии для съёмок"},
        {"name": "Апартаменты", "desc": "Квартиры и апартаменты"},
    ]
    cats = {}
    for c in categories_data:
        existing = await db.category.find_unique(where={"name": c["name"]})
        if existing:
            cats[c["name"]] = existing
        else:
            cats[c["name"]] = await db.category.create(data=c)
    print(f"Categories: {len(cats)}")

    # Пользователи
    users_data = [
        {
            "email": "anna@example.com",
            "password": "password123",
            "name": "Анна",
            "surname": "Смирнова",
            "role": "LESSER",
            "phone_number": "+79991234567",
        },
        {
            "email": "alex@example.com",
            "password": "password123",
            "name": "Алексей",
            "surname": "Иванов",
            "role": "RENTER",
            "phone_number": "+79997654321",
        },
        {
            "email": "maria@example.com",
            "password": "password123",
            "name": "Мария",
            "surname": "Петрова",
            "role": "LESSER",
        },
    ]
    users = {}
    for u in users_data:
        existing = await db.user.find_unique(where={"email": u["email"]})
        if existing:
            users[u["email"]] = existing
        else:
            users[u["email"]] = await db.user.create(
                data={
                    "email": u["email"],
                    "password_hash": pwd.hash(u["password"]),
                    "name": u["name"],
                    "surname": u.get("surname"),
                    "role": u["role"],
                    "phone_number": u.get("phone_number"),
                    "is_verified": True,
                }
            )
    print(f"Users: {len(users)}")

    anna = users["anna@example.com"]
    maria = users["maria@example.com"]

    rentals_data = [
        {
            "owner_id": anna.user_id,
            "category_id": cats["Лофт"].category_id,
            "title": 'Лофт «Свет»',
            "address": "Москва, ул. Бауманская, 11",
            "area": Decimal("85"),
            "price": Decimal("2500"),
            "time_measurement": "HOUR",
            "desc": "Светлый лофт с высокими потолками и большими окнами.",
            "amount_of_people": 12,
            "photo_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
            "availability": "FREE",
        },
        {
            "owner_id": anna.user_id,
            "category_id": cats["Фото-студия"].category_id,
            "title": 'Студия «Воздух»',
            "address": "Москва, м. Электрозаводская",
            "area": Decimal("60"),
            "price": Decimal("1800"),
            "time_measurement": "HOUR",
            "desc": "Студия с естественным светом и циклорамой.",
            "amount_of_people": 8,
            "photo_url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800",
            "availability": "FREE",
        },
        {
            "owner_id": maria.user_id,
            "category_id": cats["Кабинет"].category_id,
            "title": 'Кабинет «Тихо»',
            "address": "Москва, м. Белорусская",
            "area": Decimal("18"),
            "price": Decimal("900"),
            "time_measurement": "HOUR",
            "desc": "Тихий кабинет для работы и личных консультаций.",
            "amount_of_people": 3,
            "photo_url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
            "availability": "FREE",
        },
        {
            "owner_id": maria.user_id,
            "category_id": cats["Коворкинг"].category_id,
            "title": 'Коворкинг «Точка»',
            "address": "Москва, м. Курская",
            "area": Decimal("45"),
            "price": Decimal("1200"),
            "time_measurement": "HOUR",
            "desc": "Комфортное пространство для продуктивной работы.",
            "amount_of_people": 10,
            "photo_url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
            "availability": "FREE",
        },
        {
            "owner_id": anna.user_id,
            "category_id": cats["Зал"].category_id,
            "title": 'Зал «Ритм»',
            "address": "Москва, м. Сокол",
            "area": Decimal("90"),
            "price": Decimal("2000"),
            "time_measurement": "HOUR",
            "desc": "Светлый зал для танца и групповых практик.",
            "amount_of_people": 15,
            "photo_url": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
            "availability": "FREE",
        },
        {
            "owner_id": maria.user_id,
            "category_id": cats["Лофт"].category_id,
            "title": 'Лофт «Кирпич»',
            "address": "Москва, м. Тульская",
            "area": Decimal("70"),
            "price": Decimal("2200"),
            "time_measurement": "HOUR",
            "desc": "Уютный лофт для ужинов и встреч с друзьями.",
            "amount_of_people": 12,
            "photo_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            "availability": "FREE",
        },
    ]

    for r in rentals_data:
        existing = await db.rental.find_first(where={"title": r["title"]})
        if not existing:
            await db.rental.create(data=r)
    print("Rentals seeded")

    await db.disconnect()
    print("Done! Test accounts:")
    print("  anna@example.com / password123  (LESSER)")
    print("  alex@example.com / password123  (RENTER)")
    print("  maria@example.com / password123 (LESSER)")


if __name__ == "__main__":
    asyncio.run(main())
