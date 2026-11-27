import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { getRentalById } from "../api/rentals.api";
import type { Rental } from "../types/rental.types";

function RentalDetailPage() {
    const { user } = useAuth();
    const { rentalId } = useParams<{ rentalId: string }>();

    const [rental, setRental] = useState<Rental | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        let active = true;

        async function loadRental() {
            setLoading(true);
            setError("");
            setRental(null);

            const id = Number(rentalId);

            if (!Number.isSafeInteger(id) || id <= 0) {
                setError("Некорректный идентификатор помещения");
                setLoading(false);
                return;
            }

            try {
                const data = await getRentalById(id);

                if (active) {
                    setRental(data);
                    setSelectedImage(0);
                }
            } catch (err) {
                console.error("Ошибка загрузки помещения:", err);

                if (active) {
                    setError("Не удалось загрузить помещение");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadRental();

        return () => {
            active = false;
        };
    }, [rentalId]);

    if (loading) {
        return (
            <main className="container rental-detail__message">
                Загрузка помещения...
            </main>
        );
    }

    if (error || !rental) {
        return (
            <main className="container rental-detail__message">
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