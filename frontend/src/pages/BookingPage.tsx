import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { getRentalById } from "../api/rentals.api";
import { createBooking } from "../api/bookings.api";

import type { Rental } from "../types/rental.types";

function toLocalDateTime(date: Date): string {
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function BookingPage() {
    const { rentalId } = useParams<{ rentalId: string }>();
    const navigate = useNavigate();

    const [rental, setRental] = useState<Rental | null>(null);

    const [startDate, setStartDate] = useState(
        () => toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000))
    );

    const [endDate, setEndDate] = useState(
        () => toLocalDateTime(new Date(Date.now() + 5 * 60 * 60 * 1000))
    );

    const [guestsCount, setGuestsCount] = useState(1);
    const [comment, setComment] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const id = Number(rentalId);

    useEffect(() => {
        let active = true;

        async function loadRental() {
            if (!Number.isInteger(id) || id <= 0) {
                setError("Некорректный номер объявления");
                setLoading(false);
                return;
            }

            try {
                const data = await getRentalById(id);

                if (active) {
                    setRental(data);
                }
            } catch (err) {
                if (active) {
                    setError("Не удалось загрузить объявление");
                }

                console.error(err);
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
    }, [id]);

    const handleSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();
        setError("");

        if (!rental) {
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            setError("Проверьте указанные даты");
            return;
        }

        if (start <= new Date()) {
            setError("Дата начала должна быть в будущем");
            return;
        }

        if (end <= start) {
            setError("Дата окончания должна быть позже начала");
            return;
        }

        if (
            guestsCount < 1 ||
            guestsCount > rental.amount_of_people
        ) {
            setError(
                `Максимальное количество гостей: ${rental.amount_of_people}`
            );
            return;
        }

        try {
            setSubmitting(true);

            await createBooking({
                rental_id: rental.rental_id,
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                guests_count: guestsCount,
                comment: comment.trim() || undefined,
            });

            navigate("/bookings", {
                state: {
                    message: "Заявка на бронирование отправлена",
                },
            });
        } catch (err) {
            console.error(err);

            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;

                setError(
                    typeof detail === "string"
                        ? detail
                        : "Не удалось создать бронирование"
                );
            } else {
                setError("Произошла непредвиденная ошибка");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="container">Загрузка объявления...</p>;
    }

    if (!rental) {
        return (
            <main className="container">
                <p className="catalog__error">
                    {error || "Объявление не найдено"}
                </p>
            </main>
        );
    }

    return (
        <main className="container booking-page">
            <h1>Бронирование помещения</h1>

            <div className="booking-page__rental">
                {rental.photo_url && (
                    <img
                        src={rental.photo_url}
                        alt={rental.title}
                    />
                )}

                <div>
                    <h2>{rental.title}</h2>
                    <p>{rental.address}</p>

                    <p>
                        Вместимость: {rental.amount_of_people} гостей
                    </p>

                    <p>
                        Цена: {rental.price} ₽ /{" "}
                        {rental.time_measurement === "HOUR"
                            ? "час"
                            : rental.time_measurement === "DAY"
                              ? "день"
                              : "месяц"}
                    </p>
                </div>
            </div>

            <form
                className="booking-form"
                onSubmit={handleSubmit}
            >
                <label>
                    Начало аренды

                    <input
                        type="datetime-local"
                        value={startDate}
                        min={toLocalDateTime(new Date())}
                        onChange={(e) =>
                            setStartDate(e.target.value)
                        }
                        required
                    />
                </label>

                <label>
                    Окончание аренды

                    <input
                        type="datetime-local"
                        value={endDate}
                        min={startDate || toLocalDateTime(new Date())}
                        onChange={(e) =>
                            setEndDate(e.target.value)
                        }
                        required
                    />
                </label>

                <label>
                    Количество гостей

                    <input
                        type="number"
                        min="1"
                        max={rental.amount_of_people}
                        value={guestsCount}
                        onChange={(e) =>
                            setGuestsCount(Number(e.target.value))
                        }
                        required
                    />
                </label>

                <label>
                    Комментарий к бронированию

                    <textarea
                        value={comment}
                        onChange={(e) =>
                            setComment(e.target.value)
                        }
                        maxLength={1000}
                        placeholder="Дополнительная информация для арендодателя"
                    />
                </label>

                {error && (
                    <p className="catalog__error">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className="button button--primary"
                    disabled={submitting}
                >
                    {submitting
                        ? "Отправка..."
                        : "Отправить заявку"}
                </button>
            </form>
        </main>
    );
}

export default BookingPage;