# T-RENT Backend v1.1

Бэкенд сервиса аренды помещений **T-RENT**.

Стек:
- FastAPI
- Prisma (prisma-client-py)
- PostgreSQL
- Docker

---

## Изменения в 1.1

- Схема Prisma приведена в полное соответствие с ERD:
  - Добавлено поле `is_blocked` в модель `User`
  - Добавлена модель `Notification` + enum `NotificationStatus`
- Версия API поднята до `1.1.0`

---

## Быстрый старт

### 1. Поднять базу данных

```bash
docker-compose up -d
```

База будет доступна на `localhost:5432`  
Логин: `trent` / Пароль: `trent_password` / БД: `t_rent`

### 2. Установить зависимости

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Сгенерировать Prisma Client и применить схему

```bash
# Генерация клиента
prisma generate

# Создание/обновление таблиц в БД (dev)
prisma db push
```

### 4. (Опционально) Наполнить тестовыми данными

```bash
python seed.py
```

### 5. Запустить сервер

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

После запуска:
- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

---

### 6. Выключить сервер
cntrl + c

deactivate

docker compose down

## Структура проекта

```
t-rent-backend/
├── app/
│   ├── __init__.py
│   └── main.py          # Точка входа FastAPI + основные эндпоинты
├── prisma/
│   └── schema.prisma    # Схема базы данных (по ERD)
├── docker-compose.yml
├── .env
├── requirements.txt
├── seed.py
└── README.md
```

---

## Что уже реализовано (MVP)

- Подключение к PostgreSQL через Prisma
- Health-check
- Получение списка категорий
- Каталог объявлений (с фильтрами)
- Получение одного объявления
- Публичный профиль пользователя
- Получение бронирования
- Избранное (базово)

---

## Что будет в следующих итерациях

- Регистрация / логин (JWT)
- CRUD объявлений
- Создание и подтверждение бронирований
- Отзывы
- Бан-лист / ЧС
- Загрузка фото
- Уведомления
- Полный список эндпоинтов из спецификации API

---

## Примечания

- Все денежные поля используют `Decimal`
- Пароли в схеме хранятся как `password_hash` (в будущем — bcrypt)
- Система штрафов (Fine + BlackList) присутствует в схеме
- Модель Notification готова для будущих уведомлений
