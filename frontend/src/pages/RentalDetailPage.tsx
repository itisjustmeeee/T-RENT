import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { getRentalById } from "../api/rentals.api";
import type { Rental } from "../types/rental.types";

import { getFavorites, addFavorite, removeFavorite } from "../api/favourites.api";

interface RentalLoadResult {
    rentalId: string;
    rental: Rental | null;
    error: string;
}

interface FavoriteResult {
    userId: number;
    rentalId: number;
    isFavorite: boolean;
}

function RentalDetailPage() {
    const { user } = useAuth();
    const { rentalId } = useParams<{ rentalId: string }>();

    const id = Number(rentalId);
    const isValidRentalId =
        Number.isSafeInteger(id) && id > 0;

    const userId = user?.user_id;

    const [rentalResult, setRentalResult] =
        useState<RentalLoadResult | null>(null);

    const [selectedImage, setSelectedImage] = useState(0);

    const [favoriteResult, setFavoriteResult] =
        useState<FavoriteResult | null>(null);

    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const rentalKey = rentalId ?? "";

    const currentRentalResult =
        rentalResult?.rentalId === rentalKey
            ? rentalResult
            : null;

    const loading =
        isValidRentalId && currentRentalResult === null;

    const rental = currentRentalResult?.rental ?? null;

    const error = !isValidRentalId
        ? "Некорректный идентификатор помещения"
        : currentRentalResult?.error ?? "";

    const currentFavorite =
        userId != null &&
        favoriteResult?.userId === userId &&
        favoriteResult?.rentalId === id
            ? favoriteResult
            : null;

    const isFavorite = currentFavorite?.isFavorite ?? false;

    const favoriteChecked =
        userId == null || currentFavorite !== null;

    useEffect(() => {
        if (typeof rentalId !== "string" || !isValidRentalId) {
            return;
        }

        const currentRentalId: string = rentalId;
        const currentId: number = id;

        let active = true;

        async function loadRental() {
            try {
                const data = await getRentalById(currentId);

                if (active) {
                    setRentalResult({
                        rentalId: currentRentalId,
                        rental: data,
                        error: "",
                    });

                    setSelectedImage(0);
                }
            } catch (err) {
                console.error(
                    "Ошибка загрузки помещения:",
                    err
                );

                if (active) {
                    setRentalResult({
                        rentalId: currentRentalId,
                        rental: null,
                        error: "Не удалось загрузить помещение",
                    });
                }
            }
        }

        void loadRental();

        return () => {
            active = false;
        };
    }, [rentalId, id, isValidRentalId]);

    useEffect(() => {
        if (typeof userId !== "number" || !isValidRentalId) {
            return;
        }

        const currentUserId: number = userId;
        const currentRentalId: number = id;

        let active = true;

        async function checkFavorite() {
            try {
                const favorites = await getFavorites();

                if (active) {
                    setFavoriteResult({
                        userId: currentUserId,
                        rentalId: currentRentalId,
                        isFavorite: favorites.some(
                            (item) => item.rental_id === currentRentalId
                        ),
                    });
                }
            } catch (err) {
                console.error(
                    "Не удалось проверить избранное:",
                    err
                );

                if (active) {
                    setFavoriteResult({
                        userId: currentUserId,
                        rentalId: currentRentalId,
                        isFavorite: false,
                    });
                }
            }
        }

        void checkFavorite();

        return () => {
            active = false;
        };
    }, [userId, rentalId, id, isValidRentalId]);

    const handleFavorite = async () => {
        if (typeof userId !== "number" || !rental) {
            return;
        }

        const currentUserId: number = userId;
        const currentRentalId: number = rental.rental_id;

        try {
            setFavoriteLoading(true);

            const nextFavorite = !isFavorite;

            if (isFavorite) {
                await removeFavorite(currentRentalId);
            } else {
                await addFavorite(currentRentalId);
            }

            setFavoriteResult({
                userId: currentUserId,
                rentalId: currentRentalId,
                isFavorite: nextFavorite,
            });
        } catch (err) {
            console.error("Ошибка избранного:", err);
            alert("Не удалось изменить избранное");
        } finally {
            setFavoriteLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="page container rental-detail__message">
                Загрузка помещения...
            </main>
        );
    }

    if (error || !rental) {
        return (
            <main className="page container rental-detail__message">
                <h2>{error || "Помещение не найдено"}</h2>

                <Link to="/rentals" className="button button--primary">
                    Вернуться в каталог
                </Link>
            </main>
        );
    }

    const images = (rental.photos ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((photo) => photo.url);

    if (
        rental.photo_url &&
        !images.includes(rental.photo_url)
    ) {
        images.unshift(rental.photo_url);
    }

    const currentImage = images[selectedImage];

    const price = new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2,
    }).format(Number(rental.price));

    const timeLabel = {
        HOUR: "час",
        DAY: "день",
        MONTH: "месяц",
    }[rental.time_measurement];

    const availabilityLabel = {
        FREE: "Доступно для бронирования",
        BUSY: "Занято",
        TEMP_CLOSED: "Временно недоступно",
    }[rental.availability];

    return (
        <main className="container rental-detail">
            <Link to="/rentals" className="rental-detail__back">
                Вернуться в каталог
            </Link>

            <div className="rental-detail__heading">
                <div>
                    <span className="category-badge">
                        {rental.category?.name ?? "Помещение"}
                    </span>

                    <h1>{rental.title}</h1>

                    <p className="rental-detail__address">
                        {rental.address}
                    </p>
                </div>
            </div>
            <div className="rental-detail__layout">
                <div className="rental-detail__main">
                    <section className="rental-gallery">
                        {currentImage ? (
                            <img
                                src={currentImage}
                                alt={rental.title}
                                className="rental-gallery__main"
                            />
                        ) : (
                            <div className="rental-gallery__placeholder">
                                Фотографии отсутствуют
                            </div>
                        )}

                        {images.length > 1 && (
                            <div className="rental-gallery__thumbnails">
                                {images.map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        type="button"
                                        className={
                                            selectedImage === index
                                                ? "rental-gallery__thumbnail active"
                                                : "rental-gallery__thumbnail"
                                        }
                                        onClick={() =>
                                            setSelectedImage(index)
                                        }
                                    >
                                        <img
                                            src={image}
                                            alt={`Фотография ${index + 1}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                    <section className="rental-detail__section">
                        <h2>Характеристики помещения</h2>

                        <div className="rental-detail__features">
                            <div>
                                <span>Площадь</span>
                                <strong>{rental.area} м²</strong>
                            </div>

                            <div>
                                <span>Количество гостей</span>
                                <strong>
                                    До {rental.amount_of_people}
                                </strong>
                            </div>

                            <div>
                                <span>Стоимость</span>
                                <strong>{price} ₽ / {timeLabel}</strong>
                            </div>

                            <div>
                                <span>Статус</span>
                                <strong>{availabilityLabel}</strong>
                            </div>
                        </div>
                    </section>
                    <section className="rental-detail__section">
                        <h2>Описание</h2>

                        <p className="rental-detail__description">
                            {rental.desc ||
                                "Владелец пока не добавил описание помещения"}
                        </p>
                    </section>
                    <section className="rental-detail__section">
                        <h2>Отзывы</h2>

                        <p>
                            ★ {rental.avg_rating ?? "Нет оценок"}
                            {" · "}
                            {rental.reviews_count ?? 0} отзывов
                        </p>
                    </section>
                </div>
                <aside className="rental-detail__sidebar">
                    <div className="rental-booking">
                        {user && (
                            <button
                                type="button"
                                className={`favorite-button ${
                                    isFavorite ? "favorite-button--active" : ""
                                }`}
                                onClick={handleFavorite}
                                disabled={favoriteLoading || !favoriteChecked}
                            >
                                <span>
                                    {isFavorite ? "♥" : "♡"}
                                </span>

                                {favoriteLoading
                                    ? "Обновление..."
                                    : !favoriteChecked
                                        ? "Проверка избранного..."
                                        : isFavorite
                                            ? "В избранном"
                                            : "Добавить в избранное"}
                            </button>
                        )}
                        <span className="rental-booking__label">
                            Стоимость аренды
                        </span>

                        <div className="rental-booking__price">
                            {price} ₽
                            <span> / {timeLabel}</span>
                        </div>

                        <p>
                            До {rental.amount_of_people} гостей
                        </p>

                        {!user ? (
                            <Link
                                to="/login"
                                className="button button--primary rental-booking__button"
                                state={{
                                    from: `/rentals/${rental.rental_id}`
                                }}
                            >
                                Войти для бронирования
                            </Link>
                        ) : user.role === "RENTER" ? (
                            <Link
                                to={`/rentals/${rental.rental_id}/booking`}
                                className="button button--primary rental-booking__button"
                            >
                                Забронировать
                            </Link>
                        ) : (
                            <p className="rental-booking__notice">
                                Бронирование доступно только для арендаторов.
                            </p>
                        )}
                        <p className="rental-booking__hint">
                            Для оформления бронирования необходимо
                            войти в аккаунт.
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}

export default RentalDetailPage;