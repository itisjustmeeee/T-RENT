# База данных T-RENT

СУБД: **PostgreSQL 16**  
ORM: **Prisma (prisma-client-py)**  
Схема: [`prisma/schema.prisma`](prisma/schema.prisma)

Все таблицы создаются командой `prisma db push` и наполняются тестовыми данными через `python seed.py`.

---

## Список таблиц

| № | Таблица (model) | Назначение | Связи |
|---|---|---|---|
| 1 | `users` | Пользователи (арендаторы, арендодатели, админы) | 1:N → rentals, bookings, reviews, favorites, black_lists, notifications |
| 2 | `categories` | Категории помещений (Лофт, Кабинет, …) | 1:N → rentals |
| 3 | `rentals` | Объявления об аренде помещений | N:1 → users (owner), categories; 1:N → bookings, reviews_of_rental, favorites |
| 4 | `bookings` | Бронирования помещений | N:1 → users (owner, booker), rentals |
| 5 | `reviews_of_rental` | Отзывы на объявления | N:1 → rentals, users (author) |
| 6 | `reviews_of_user` | Отзывы на пользователей | N:1 → users (author, user) |
| 7 | `favorites` | Избранные объявления | N:1 → users, rentals; UNIQUE(user_id, rental_id) |
| 8 | `fines` | Штрафы | 1:N → black_lists |
| 9 | `black_lists` | Чёрный список арендаторов | N:1 → users (lesser, renter), fines |
| 10 | `notifications` | Уведомления пользователей | N:1 → users (owner) |

---

## Детализация таблиц

### 1. `users`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `user_id` | `Int` | PK, autoincrement | Идентификатор |
| `role` | `Role` (enum) | NOT NULL | `RENTER` / `LESSER` |
| `name` | `String` | NOT NULL | Имя |
| `surname` | `String?` | NULL | Фамилия |
| `patronymic` | `String?` | NULL | Отчество |
| `email` | `String` | UNIQUE, NOT NULL | Email (логин) |
| `password_hash` | `String` | NOT NULL | Хеш пароля (bcrypt в будущем) |
| `phone_number` | `String?` | NULL | Телефон |
| `is_blacklisted` | `Boolean` | DEFAULT false | Признак ЧС |
| `is_blocked` | `Boolean` | DEFAULT false | Признак блокировки аккаунта |
| `rating` | `Decimal(3,2)?` | NULL | Рейтинг (0.00–5.00) |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:**
- `rentals` — объявления, где пользователь арендодатель (`OwnerRentals`)
- `bookings_as_owner` — бронирования, где он арендодатель (`BookingOwner`)
- `bookings_as_booker` — бронирования, где он арендатор (`BookingBooker`)
- `reviews_written` — отзывы, которые он написал (`ReviewAuthor`)
- `reviews_of_user` — отзывы, которые написаны о нём (`ReviewedUser`)
- `reviews_about_me` — отзывы, которые он написал о других (`ReviewAuthorUser`)
- `favorites` — избранное
- `blacklists_as_lesser` — ЧС, куда он добавлял (`BlackListLesser`)
- `blacklists_as_renter` — ЧС, куда его добавили (`BlackListRenter`)
- `notifications` — уведомления (`NotificationOwner`)

---

### 2. `categories`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `category_id` | `Int` | PK, autoincrement | Идентификатор |
| `name` | `String` | UNIQUE, NOT NULL | Название (Лофт, Кабинет, …) |
| `desc` | `String?` | NULL | Описание |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** 1:N → `rentals`

---

### 3. `rentals`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `rental_id` | `Int` | PK, autoincrement | Идентификатор |
| `owner_id` | `Int` | FK → users.user_id | Арендодатель |
| `category_id` | `Int?` | FK → categories.category_id | Категория |
| `title` | `String` | NOT NULL | Заголовок объявления |
| `address` | `String` | NOT NULL | Адрес |
| `area` | `Decimal(10,2)` | NOT NULL | Площадь, м² |
| `price` | `Decimal(12,2)` | NOT NULL | Цена |
| `time_measurement` | `TimeMeasurement` (enum) | DEFAULT HOUR | `HOUR` / `DAY` / `MONTH` |
| `photo_url` | `String?` | NULL | Главное фото |
| `availability` | `Availability` (enum) | DEFAULT FREE | `FREE` / `BUSY` / `TEMP_CLOSED` |
| `desc` | `String?` | NULL | Описание |
| `amount_of_people` | `Int` | DEFAULT 1 | Вместимость |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:**
- N:1 → `users` (owner), `categories`
- 1:N → `bookings`, `reviews_of_rental`, `favorites`

---

### 4. `bookings`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `booking_id` | `Int` | PK, autoincrement | Идентификатор |
| `owner_id` | `Int` | FK → users.user_id | Арендодатель |
| `booker_id` | `Int` | FK → users.user_id | Арендатор |
| `rental_id` | `Int` | FK → rentals.rental_id | Объявление |
| `start_date` | `DateTime` | NOT NULL | Начало аренды |
| `end_date` | `DateTime` | NOT NULL | Конец аренды |
| `status` | `BookingStatus` (enum) | DEFAULT OPEN | `OPEN` / `CLOSED` / `CANCELLED` |
| `total_price` | `Decimal(12,2)` | NOT NULL | Итоговая стоимость |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** N:1 → `users` (owner, booker), `rentals`

---

### 5. `reviews_of_rental`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `review_id` | `Int` | PK, autoincrement | Идентификатор |
| `rental_id` | `Int` | FK → rentals.rental_id | Объявление |
| `author_id` | `Int` | FK → users.user_id | Автор отзыва |
| `rating` | `Int` | NOT NULL | Оценка 1–5 |
| `comment` | `String?` | NULL | Текст отзыва |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** N:1 → `rentals`, `users` (author)

---

### 6. `reviews_of_user`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `review_id` | `Int` | PK, autoincrement | Идентификатор |
| `author_id` | `Int` | FK → users.user_id | Автор отзыва |
| `user_id` | `Int` | FK → users.user_id | Кого оценивают |
| `rating` | `Int` | NOT NULL | Оценка 1–5 |
| `comment` | `String?` | NULL | Текст отзыва |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** N:1 → `users` (author, user)

---

### 7. `favorites`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `favorite_id` | `Int` | PK, autoincrement | Идентификатор |
| `rental_id` | `Int` | FK → rentals.rental_id | Объявление |
| `user_id` | `Int` | FK → users.user_id | Пользователь |

**Ограничения:** `UNIQUE(user_id, rental_id)` — нельзя добавить одно объявление дважды.  
**Связи:** N:1 → `rentals`, `users`

---

### 8. `fines`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `fine_id` | `Int` | PK, autoincrement | Идентификатор |
| `fine_number` | `String` | UNIQUE, NOT NULL | Номер штрафа |
| `amount` | `Decimal(12,2)` | NOT NULL | Сумма |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** 1:N → `black_lists`

---

### 9. `black_lists`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `black_list_id` | `Int` | PK, autoincrement | Идентификатор |
| `fine_id` | `Int?` | FK → fines.fine_id | Штраф (если есть) |
| `lesser_id` | `Int` | FK → users.user_id | Кто добавил в ЧС |
| `renter_id` | `Int` | FK → users.user_id | Кого добавили |
| `is_closed` | `Boolean` | DEFAULT false | Закрыт ли ЧС |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** N:1 → `users` (lesser, renter), `fines`

---

### 10. `notifications`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `notification_id` | `Int` | PK, autoincrement | Идентификатор |
| `owner_id` | `Int` | FK → users.user_id | Получатель |
| `status` | `NotificationStatus` (enum) | DEFAULT INFO | `ERROR` / `SUCCESS` / `INFO` |
| `comment` | `String?` | NULL | Текст уведомления |
| `created_at` | `DateTime` | DEFAULT now() | Дата создания |
| `updated_at` | `DateTime` | @updatedAt | Дата обновления |

**Связи:** N:1 → `users` (owner)

---

## ENUM-ы

| ENUM | Значения | Где используется |
|---|---|---|
| `Role` | `RENTER`, `LESSER` | `users.role` |
| `TimeMeasurement` | `HOUR`, `DAY`, `MONTH` | `rentals.time_measurement` |
| `Availability` | `FREE`, `BUSY`, `TEMP_CLOSED` | `rentals.availability` |
| `BookingStatus` | `OPEN`, `CLOSED`, `CANCELLED` | `bookings.status` |
| `NotificationStatus` | `ERROR`, `SUCCESS`, `INFO` | `notifications.status` |

---



## Проверка

```bash
# Список таблиц
docker exec -it t-rent-db psql -U trent -d t_rent -c "\dt"

# Структура конкретной таблицы
docker exec -it t-rent-db psql -U trent -d t_rent -c "\d users"

# Количество записей
docker exec -it t-rent-db psql -U trent -d t_rent -c "SELECT 'users' AS table, COUNT(*) FROM users UNION ALL SELECT 'rentals', COUNT(*) FROM rentals;"