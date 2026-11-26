# T-RENT Backend v1.2

Полноценный бэкенд сервиса почасовой/посуточной аренды помещений **T-RENT**.

## Стек

- **FastAPI** + Uvicorn
- **Prisma** (prisma-client-py) + PostgreSQL
- JWT (access + refresh с хранением в БД)
- bcrypt для паролей
- Docker Compose для БД

## Что реализовано в 1.2

### Авторизация и аккаунт
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация (RENTER / LESSER) |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление access-токена |
| DELETE | `/api/auth/logout` | Выход (удаление refresh-токена) |
| POST | `/api/auth/change-password` | Смена пароля |
| POST | `/api/auth/forgot-password` | Запрос сброса (заглушка email) |
| POST | `/api/auth/reset-password` | Сброс по токену (заглушка) |
| GET | `/api/users/me` | Свой профиль |
| PATCH | `/api/users/me` | Редактирование профиля |
| DELETE | `/api/users/me` | Удаление аккаунта |
| GET | `/api/users/{id}` | Публичный профиль |

### Объявления
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/categories` | Список категорий |
| GET | `/api/rentals` | Каталог (фильтры: category, owner, price, search, availability) |
| GET | `/api/rentals/{id}` | Карточка объявления + отзывы + запись просмотра |
| POST | `/api/rentals` | Создание (LESSER) |
| PATCH | `/api/rentals/{id}` | Редактирование (владелец) |
| PATCH | `/api/rentals/{id}/status` | Свободно / занято / временно закрыто |
| DELETE | `/api/rentals/{id}` | Удаление (с проверкой активных броней) |
| GET | `/api/rentals/{id}/calendar` | Занятые слоты |
| GET | `/api/users/me/rentals` | Мои объявления |

### Бронирования
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/bookings` | Создать бронь (серверный расчёт цены, защита от пересечений) |
| GET | `/api/bookings/{id}` | Детали (только участники) |
| GET | `/api/users/me/bookings` | Мои брони |
| PATCH | `/api/bookings/{id}/confirm` | Подтверждение арендодателем |
| PATCH | `/api/bookings/{id}/status` | Смена статуса |
| POST | `/api/bookings/{id}/prepayment` | Оплата предоплаты (мок) |
| POST | `/api/bookings/{id}/deposit` | Залог (мок) |

### Избранное, отзывы, ЧС, уведомления
- `GET/POST/DELETE /api/favorites`
- `POST/GET /api/rentals/{id}/reviews` (только после CLOSED-брони)
- `POST/GET /api/users/{id}/reviews`
- `GET/POST/DELETE /api/users/me/blacklist`
- `GET/PATCH /api/notifications/me/...`
- `GET /api/users/me/viewed` — история просмотров

### Файлы
- `POST /api/upload` — загрузка изображения
- `POST /api/rentals/{id}/photos` — привязка URL к объявлению
- `PUT /api/rentals/{id}/photos/order` — порядок фото

### Безопасность
- Пароли только bcrypt (plaintext в БД приложением не принимается)
- JWT access (30 мин) + refresh (7 дней) с отзывом
- Ownership checks на всех мутациях
- Серверный расчёт стоимости и залога
- Проверка пересечений броней
- Одинаковое сообщение при неверном логине/пароле
- Валидация входных данных через Pydantic

---

## Быстрый старт

### 1. База данных

```bash
docker compose up -d
```

PostgreSQL будет на `localhost:5432`  
Логин: `trent` / Пароль: `trent_password` / БД: `t_rent`

### 2. Окружение и зависимости

```bash
cp .env.example .env

# Важно: используй Python 3.12 или 3.13 (3.14 пока не поддерживается pydantic-core)
python3.12 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

# Совместимость passlib + bcrypt (убирает предупреждение __about__)
pip install bcrypt==4.0.1
```

Проверь в `.env`:
```env
APP_VERSION=1.2.0
DATABASE_URL=postgresql://trent:trent_password@localhost:5432/t_rent
SECRET_KEY=change-me-to-a-long-random-secret-key-in-production-at-least-32-chars
```

### 3. Prisma (схема БД)

```bash
prisma generate
prisma db push
```

### 4. Тестовые данные

```bash
python seed.py
```

### 5. Запуск сервера

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: http://localhost:8000/docs  
- Health: http://localhost:8000/api/health  
- Корень: http://localhost:8000/  

В **GitHub Codespaces** порт 8000 открой через вкладку **Ports** → Open in Browser.

### Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| anna@example.com | password123 | LESSER (арендодатель) |
| alex@example.com | password123 | RENTER (арендатор) |
| maria@example.com | password123 | LESSER |

В Swagger: **Authorize** → `Bearer <access_token>` (после `POST /api/auth/login`).

---

## Выключение

Когда закончил работу — останови всё по шагам:

### 1. Остановить API-сервер

В терминале, где запущен uvicorn:

```bash
Ctrl + C
```

Сервер остановится.

### 2. Деактивировать виртуальное окружение

```bash
deactivate
```

### 3. Остановить базу данных (Docker)

```bash
docker compose down
```

Контейнер PostgreSQL остановится. **Данные сохранятся** в volume `pgdata`.

### 4. Полная очистка (если нужно с нуля)

Удалить и контейнер, и данные БД:

```bash
docker compose down -v
```

После этого при следующем `docker compose up -d` + `prisma db push` + `python seed.py` база будет пустой и заново заполненной.

### Краткая шпаргалка

| Действие | Команда |
|----------|---------|
| Запуск БД | `docker compose up -d` |
| Активировать venv | `source venv/bin/activate` |
| Запуск API | `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| Остановить API | `Ctrl + C` |
| Выйти из venv | `deactivate` |
| Остановить БД | `docker compose down` |
| Остановить БД + удалить данные | `docker compose down -v` |

---

## Структура проекта

```
t-rent-backend/
├── app/
│   ├── main.py              # Точка входа FastAPI
│   ├── database.py
│   ├── dependencies.py      # JWT, роли
│   ├── core/
│   │   ├── config.py
│   │   └── security.py      # bcrypt, JWT
│   ├── schemas/             # Pydantic-модели
│   └── routers/
│       ├── auth.py
│       ├── users.py
│       ├── rentals.py
│       ├── bookings.py
│       ├── favorites.py
│       ├── notifications.py
│       ├── upload.py
│       └── system.py
├── prisma/
│   └── schema.prisma
├── uploads/                 # Загруженные фото
├── seed.py
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

`.env` — локальные секреты, в Git **не** коммитится.  
`.env.example` — шаблон без секретов, лежит в репозитории.

---

## Известные ограничения

- **Email** (verify / forgot-password / reset) — заглушки, нужен SMTP.
- **Оплата** (prepayment / deposit) — мок, без реального платёжного шлюза.
- **Python 3.14** — не поддерживается текущим `pydantic-core`. Используй **3.12** или **3.13**.
- При `pip install` с `bcrypt>=4.1` может появиться предупреждение passlib. Фикс: `pip install bcrypt==4.0.1`.
- Для жёсткой защиты от race condition на бронировании в проде лучше добавить `SELECT ... FOR UPDATE` или уникальный constraint на период.

---

## Краткий чеклист тестирования в Swagger

1. `GET /api/health` → ok  
2. `POST /api/auth/login` (anna) → Authorize с Bearer-токеном  
3. `GET /api/categories`, `GET /api/rentals`  
4. `POST /api/rentals` (создание объявления)  
5. Login как alex → `POST /api/bookings`  
6. Login как anna → `PATCH /api/bookings/{id}/confirm`  
7. `GET /api/favorites`, `GET /api/notifications/me`  
8. `POST /api/upload` + привязка фото к объявлению  
