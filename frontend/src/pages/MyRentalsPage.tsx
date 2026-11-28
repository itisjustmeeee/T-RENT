
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMyRentals, deleteRental } from "../api/rentals.api";
import type { Rental } from "../types/rental.types";
import axios from "axios";

function MyRentalsPage() {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        async function loadMyRentals() {
            try {
                const data = await getMyRentals();

                if (active) {
                    setRentals(data);
                    setError("");
                }
            } catch (err) {
                console.error("Ошибка загрузки объявлений:", err);

                if (active) {
                    setError("Не удалось загрузить ваши объявления");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadMyRentals();

        return () => {
            active = false;
        };
    }, []);

    const handleDelete = async (rentalId: number) => {
        const confirmed = window.confirm(
            "Вы действительно хотите удалить это объявление? " +
            "Это действие нельзя отменить."
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(rentalId);
            setError("");

            await deleteRental(rentalId);

            setRentals((previous) =>
                previous.filter(
                    (rental) => rental.rental_id !== rentalId
                )
            );

        } catch (err) {
            console.error("Ошибка удаления помещения:", err);

            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;

                setError(
                    typeof detail === "string"
                        ? detail
                        : "Не удалось удалить помещение"
                );
            } else {
                setError("Произошла ошибка при удалении помещения");
            }

        } finally {
            setDeletingId(null);
        }
    };

    return (
        <main className="container my-rentals-page">
            <div className="my-rentals-heading">
                <div>
                    <h1>Мои объявления</h1>
                    <p>
                        Здесь находятся помещения, которые вы разместили
                        для аренды.
                    </p>
                </div>

                {!loading && !error && rentals.length !== 0 && (
                    <Link
                        to="/my-rentals/create"
                        className="button button--primary"
                    >
                        + Добавить помещение
                    </Link>
                )}
            </div>

            {loading && (
                <p className="catalog__message">
                    Загрузка объявлений...
                </p>
            )}

            {error && (
                <p className="catalog__error">
                    {error}
                </p>
            )}

            {!loading && !error && rentals.length === 0 && (
                <div className="my-rentals-empty">
                    <h2>У вас пока нет объявлений</h2>

                    <p>
                        Разместите первое помещение,
                        чтобы оно появилось в каталоге.
                    </p>

                    <Link
                        to="/my-rentals/create"
                        className="button button--primary"
                    >
                        Добавить первое помещение
                    </Link>
                </div>
            )}

            {!loading && !error && rentals.length > 0 && (
                <div className="my-rentals-grid">
                    {rentals.map((rental) => {
                        const hasActiveBookings =
                            (rental.active_bookings_count ?? 0) > 0;

                        return (
                            <article
                                className="my-rental-card"
                                key={rental.rental_id}
                            >
                                {rental.photo_url && (
                                    <img
                                        src={rental.photo_url}
                                        alt={rental.title}
                                    />
                                )}

                                <div className="my-rental-card__content">
                                    <h2>{rental.title}</h2>

                                    <p>{rental.address}</p>

                                    <strong>
                                        {rental.price} ₽
                                    </strong>

                                    <div className="my-rental-card__actions">
                                    <Link
                                        to={`/rentals/${rental.rental_id}`}
                                        className="button button--secondary"
                                    >
                                        Посмотреть объявление
                                    </Link>

                                    <button
                                        type="button"
                                        className="my-rental-delete"
                                        onClick={() =>
                                            handleDelete(rental.rental_id)
                                        }
                                        disabled={
                                            hasActiveBookings ||
                                            deletingId === rental.rental_id
                                        }
                                        title={
                                            hasActiveBookings
                                                ? "Нельзя удалить помещение с активными бронированиями"
                                                : "Удалить объявление"
                                            }
                                        >
                                            {deletingId === rental.rental_id
                                                ? "Удаление..."
                                                : hasActiveBookings
                                                    ? "Есть активные бронирования"
                                                    : "Удалить объявление"}
                                        </button>
                                    </div>

                                    {hasActiveBookings && (
                                        <p className="my-rental-card__notice">
                                            Удаление невозможно, пока есть активные
                                            заявки или подтверждённые бронирования.
                                        </p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}

export default MyRentalsPage;
