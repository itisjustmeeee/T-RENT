import { useState, type FormEvent } from "react";

import type { RentalFilters } from "../../api/rentals.api";

interface HeroProps {
    onSearch: (filters: RentalFilters) => void;
}

function Hero({ onSearch }: HeroProps) {
    const [search, setSearch] = useState("");
    const [city, setCity] = useState("");
    const [date, setDate] = useState("");

    const [startTime, setStartTime] = useState("14:00");
    const [endTime, setEndTime] = useState("18:00");

    const [guests, setGuests] = useState(1);

    const [error, setError] = useState("");

    const today = new Date();

    const minDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const filters: RentalFilters = {
            search: search.trim() || undefined,
            city: city.trim() || undefined,
            min_guests: guests,
        };

        if (date) {
            if (!startTime || !endTime) {
                setError("Укажите время начала и окончания");
                return;
            }

            const start = new Date(
                `${date}T${startTime}:00`
            );

            const end = new Date(
                `${date}T${endTime}:00`
            );

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime()) ||
                end <= start
            ) {
                setError(
                    "Время окончания должно быть позже начала"
                );
                return;
            }

            filters.start_at = start.toISOString();
            filters.end_at = end.toISOString();
        }

        onSearch(filters);
    };

    return (
        <section className="hero">
            <div className="container hero__content">
                <p className="hero__label">
                    ДЛЯ РАБОТЫ, ВСТРЕЧ И ВДОХНОВЕНИЯ
                </p>

                <h1>
                    Ваши планы.
                    <br />
                    Подходящее место.
                </h1>

                <p className="hero__description">
                    Лофты, студии и кабинеты -
                    арендуйте на несколько часов,
                    а не на целый день.
                </p>

                <form
                    className="hero__form"
                    onSubmit={handleSubmit}
                >
                    <div className="hero__search">
                        <input
                            type="text"
                            placeholder="Что вы ищете?"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />
                        <button
                            type="submit"
                            className="button button--primary"
                        >
                            Найти
                        </button>
                    </div>
                    <div className="hero__filters">
                        <label className="hero__filter">
                            <span>Город</span>

                            <input
                                type="text"
                                placeholder="Москва, Владимир, ..."
                                value={city}
                                onChange={(e) =>
                                    setCity(e.target.value)
                                }
                            />
                        </label>
                        <label className="hero__filter">
                            <span>Дата</span>

                            <input
                                type="date"
                                value={date}
                                min={minDate}
                                onChange={(e) =>
                                    setDate(e.target.value)
                                }
                            />
                        </label>
                        <div className="hero__filter hero__time">
                            <span>Время</span>

                            <div className="hero__time-inputs">

                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) =>
                                        setStartTime(e.target.value)
                                    }
                                    aria-label="Начало аренды"
                                />

                                <span>—</span>

                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) =>
                                        setEndTime(e.target.value)
                                    }
                                    aria-label="Окончание аренды"
                                />
                            </div>
                        </div>
                        <label className="hero__filter">
                            <span>Гости</span>

                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={guests}
                                onChange={(e) =>
                                    setGuests(
                                        Math.max(1, Number(e.target.value))
                                    )
                                }
                            />
                        </label>
                    </div>
                    {error && (
                        <p className="hero__error">
                            {error}
                        </p>
                    )}
                </form>
                <p className="hero__hint">
                    Без звонков и долгих согласований.
                    Выберите место в удобное время.
                </p>
            </div>
        </section>
    );
}

export default Hero;