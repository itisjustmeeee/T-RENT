import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import axios from "axios";

import {
    getMyBookings,
    confirmBooking,
    updateBookingStatus,
    editBooking,
} from "../api/bookings.api";

import type { Booking } from "../types/booking.types";

import { addToBlacklist } from "../api/blacklist.api";
import { useAuth } from "../context/AuthContext";

function getBookingsErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        return typeof detail === "string"
            ? detail
            : "Не удалось загрузить бронирования";
    }

    return "Произошла непредвиденная ошибка";
}

function MyBookingsPage() {
    const { user } = useAuth();
    const role = String(user?.role ?? "")
        .trim()
        .toUpperCase();

    const isLessor =
        role === "LESSOR" || role === "LESSER";

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const [editingBookingId, setEditingBookingId] =
        useState<number | null>(null);

    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editGuestsCount, setEditGuestsCount] = useState(1);
    const [editComment, setEditComment] = useState("");

    const [blacklistingId, setBlacklistingId] =
        useState<number | null>(null);

    const refreshBookings = async () => {
        try {
            const data = await getMyBookings();

            setBookings(data);
            setError("");
        } catch (err) {
            console.error(err);
            setError(getBookingsErrorMessage(err));
        }
    };

    useEffect(() => {
        let active = true;

        getMyBookings()
            .then((data) => {
                if (active) {
                    setBookings(data);
                    setError("");
                }
            })
            .catch((err) => {
                if (active) {
                    console.error(err);
                    setError(getBookingsErrorMessage(err));
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const handleConfirm = async (bookingId: number) => {
        try {
            setActionLoading(bookingId);

            await confirmBooking(bookingId);
            await refreshBookings();
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

            await refreshBookings();
        } catch (err) {
            console.error(err);
            setError("Не удалось отменить бронирование");
        } finally {
            setActionLoading(null);
        }
    };

    function toDateTimeLocal(value: string): string {
        const date = new Date(value);

        const local = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );

        return local.toISOString().slice(0, 16);
    }

    const handleEditOpen = (booking: Booking) => {
        setEditingBookingId(booking.booking_id);
        setEditStartDate(toDateTimeLocal(booking.start_date));
        setEditEndDate(toDateTimeLocal(booking.end_date));
        setEditGuestsCount(booking.guests_count);
        setEditComment(booking.comment ?? "");
    };

    const handleEditSave = async (
        e: FormEvent<HTMLFormElement>,
        bookingId: number
    ) => {
        e.preventDefault();

        const start = new Date(editStartDate);
        const end = new Date(editEndDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            setError("Проверьте даты бронирования");
            return;
        }

        try {
            setActionLoading(bookingId);
            setError("");

            await editBooking(bookingId, {
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                guests_count: editGuestsCount,
                comment: editComment.trim(),
            });

            setEditingBookingId(null);
            await refreshBookings();
        } catch (err) {
            console.error(err);

            if (axios.isAxiosError(err)) {
                setError(
                    err.response?.data?.detail ||
                    "Не удалось изменить бронирование"
                );
            } else {
                setError("Ошибка при изменении бронирования");
            }
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

    function calculateBookingAmounts(
        price: number | string,
        measurement: "HOUR" | "DAY" | "MONTH",
        startDate: string,
        endDate: string
    ) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            return null;
        }

        const hours = Math.max(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60),
            0.5
        );

        let units: number;

        if (measurement === "HOUR") {
            units = hours;
        } else if (measurement === "DAY") {
            units = Math.max(hours / 24, 1);
        } else {
            units = Math.max(hours / (24 * 30), 1);
        }

        const total = Number(
            (units * Number(price)).toFixed(2)
        );

        const deposit = Number(
            (total * 0.3).toFixed(2)
        );

        return { total, deposit };
    }

    const handleAddToBlacklist = async (renterId: number) => {
        const confirmed = window.confirm(
            "Добавить этого арендатора в чёрный список? " +
            "Он не сможет создавать новые бронирования ваших помещений."
        );

        if (!confirmed) return;

        try {
            setBlacklistingId(renterId);

            await addToBlacklist({
                renter_id: renterId,
            });

            alert("Арендатор добавлен в чёрный список");
        } catch (error) {
            console.error(error);
            alert("Не удалось добавить арендатора в чёрный список");
        } finally {
            setBlacklistingId(null);
        }
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

                        const amounts =
                            editingBookingId === booking.booking_id && booking.rental
                                ? calculateBookingAmounts(
                                        booking.rental.price,
                                        booking.rental.time_measurement,
                                        editStartDate,
                                        editEndDate
                                    )
                                : null;

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

                                {booking.comment?.trim() && (
                                    <div className="booking-card__comment">
                                        <strong>Комментарий к бронированию</strong>

                                        <p>{booking.comment}</p>
                                    </div>
                                )}

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

                                
                                {isOwner && isLessor && (
                                    <button
                                        type="button"
                                        className="button button--danger"
                                        onClick={() => handleAddToBlacklist(booking.booker_id)}
                                        disabled={blacklistingId === booking.booker_id}
                                    >
                                        {blacklistingId === booking.booker_id
                                            ? "Добавление..."
                                            : "Добавить арендатора в чёрный список"}
                                    </button>
                                )}


                                {isOwner && booking.status === "OPEN" && (
                                    <button
                                        type="button"
                                        className="button button--secondary"
                                        onClick={() => handleEditOpen(booking)}
                                    >
                                        Изменить заявку
                                    </button>
                                )}

                                {editingBookingId === booking.booking_id && isOwner && (
                                    <form
                                        className="booking-edit-form"
                                        onSubmit={(e) =>
                                            handleEditSave(e, booking.booking_id)
                                        }
                                    >
                                        <h3>Изменение бронирования</h3>

                                        <label>
                                            Начало аренды

                                            <input
                                                type="datetime-local"
                                                value={editStartDate}
                                                onChange={(e) =>
                                                    setEditStartDate(e.target.value)
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Окончание аренды

                                            <input
                                                type="datetime-local"
                                                value={editEndDate}
                                                min={editStartDate}
                                                onChange={(e) =>
                                                    setEditEndDate(e.target.value)
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Количество гостей

                                            <input
                                                type="number"
                                                min="1"
                                                max={booking.rental?.amount_of_people ?? 500}
                                                value={editGuestsCount}
                                                onChange={(e) =>
                                                    setEditGuestsCount(Number(e.target.value))
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Комментарий

                                            <textarea
                                                value={editComment}
                                                onChange={(e) =>
                                                    setEditComment(e.target.value)
                                                }
                                                maxLength={1000}
                                            />
                                        </label>

                                        <div className="booking-edit-form__price">
                                            <h4>Пересчитанная стоимость</h4>

                                            {amounts ? (
                                                <>
                                                    <p>
                                                        Новая стоимость аренды:{" "}
                                                        <strong>
                                                            {amounts.total.toLocaleString("ru-RU")} ₽
                                                        </strong>
                                                    </p>

                                                    <p>
                                                        Новый залог (30%):{" "}
                                                        <strong>
                                                            {amounts.deposit.toLocaleString("ru-RU")} ₽
                                                        </strong>
                                                    </p>
                                                </>
                                            ) : (
                                                <p>
                                                    Укажите корректные даты аренды,
                                                    чтобы увидеть стоимость.
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            className="button button--primary"
                                            disabled={actionLoading === booking.booking_id}
                                        >
                                            Сохранить изменения
                                        </button>

                                        <button
                                            type="button"
                                            className="button button--secondary"
                                            onClick={() => setEditingBookingId(null)}
                                        >
                                            Отмена
                                        </button>
                                    </form>
                                )}

                                {booking.status === "OPEN" &&
                                    isOwner &&
                                    editingBookingId !== booking.booking_id && (
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