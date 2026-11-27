import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../context/AuthContext";

import {
    getMyBookings,
    confirmBooking,
    updateBookingStatus,
} from "../api/bookings.api";

import type { Booking } from "../types/booking.types";

function MyBookingsPage() {
    const { user } = useAuth();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadBookings = useCallback(async () => {
        try {
            const data = await getMyBookings();

            setBookings(data);
            setError("");
        } catch (err) {
            console.error(err);

            if (axios.isAxiosError(err)) {
                setError(
                    err.response?.data?.detail ||
                    "Не удалось загрузить бронирования"
                );
            } else {
                setError("Произошла непредвиденная ошибка");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const handleConfirm = async (bookingId: number) => {
        try {
            setActionLoading(bookingId);

            await confirmBooking(bookingId);
            await loadBookings();
        } catch (err) {
            console.error(err);
            setError("Не удалось подтвердить бронирование");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (bookingId: number) => {
        const confirmed = window.confirm(
            "Вы действительно хотите отменить бронирование?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(bookingId);

            await updateBookingStatus(
                bookingId,
                "CANCELLED"
            );

            await loadBookings();
        } catch (err) {
            console.error(err);
            setError("Не удалось отменить бронирование");
        } finally {
            setActionLoading(null);
        }
    };

    const statusLabels: Record<string, string> = {
        OPEN: "Ожидает подтверждения",
        CONFIRMED: "Подтверждено",
        CLOSED: "Завершено",
        CANCELLED: "Отменено",
    };

    if (loading) {
        return (
            <main className="container">
                <p>Загрузка бронирований...</p>
            </main>
        );
    }

    return (
        <main className="container bookings-page">
            <h1>Мои бронирования</h1>

            {error && (
                <p className="catalog__error">{error}</p>
            )}

            {bookings.length === 0 ? (
                <div className="catalog__empty">
                    <h2>Бронирований пока нет</h2>

                    <p>
                        Здесь будут отображаться ваши заявки
                        на аренду помещений.
                    </p>
                </div>
            ) : (
                <div className="bookings-list">
                    {bookings.map((booking) => {
                        const isOwner =
                            user?.user_id === booking.owner_id;

                        const isBooker =
                            user?.user_id === booking.booker_id;

                        const person = isOwner
                            ? booking.booker
                            : booking.owner;

                        return (
                            <article
                                className="booking-card"
                                key={booking.booking_id}
                            >
                                <h2>
                                    {booking.rental?.title ||
                                        `Объявление №${booking.rental_id}`}
                                </h2>

                                <p>
                                    Адрес:{" "}
                                    {booking.rental?.address || "Не указан"}
                                </p>

                                <p>
                                    Бронирование №{booking.booking_id}
                                </p>

                                <p>
                                    Начало:{" "}
                                    {new Date(
                                        booking.start_date
                                    ).toLocaleString("ru-RU")}
                                </p>

                                <p>
                                    Окончание:{" "}
                                    {new Date(
                                        booking.end_date
                                    ).toLocaleString("ru-RU")}
                                </p>

                                <p>
                                    Гостей: {booking.guests_count}
                                </p>

                                <p>
                                    Стоимость:{" "}
                                    {Number(
                                        booking.total_price
                                    ).toLocaleString("ru-RU")}{" "}
                                    ₽
                                </p>

                                <p className="booking-card__status-row">
                                    Статус:

                                    <span
                                        className={`booking-status booking-status--${booking.status.toLowerCase()}`}
                                    >
                                        {statusLabels[booking.status] || booking.status}
                                    </span>
                                </p>

                                <p>
                                    {isOwner
                                        ? "Арендатор"
                                        : "Арендодатель"}
                                    :{" "}
                                    {person
                                        ? `${person.name} ${person.surname || ""}`
                                        : "Информация недоступна"}
                                </p>

                                {booking.status === "OPEN" &&
                                    isOwner && (
                                        <button
                                            type="button"
                                            className="button button--primary"
                                            disabled={
                                                actionLoading === booking.booking_id
                                            }
                                            onClick={() =>
                                                handleConfirm(
                                                    booking.booking_id
                                                )
                                            }
                                        >
                                            Подтвердить
                                        </button>
                                    )}

                                {(booking.status === "OPEN" ||
                                    booking.status === "CONFIRMED") &&
                                    isBooker && (
                                        <button
                                            type="button"
                                            className="button button--secondary"
                                            disabled={
                                                actionLoading === booking.booking_id
                                            }
                                            onClick={() =>
                                                handleCancel(
                                                    booking.booking_id
                                                )
                                            }
                                        >
                                            Отменить бронирование
                                        </button>
                                    )}
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}

export default MyBookingsPage;