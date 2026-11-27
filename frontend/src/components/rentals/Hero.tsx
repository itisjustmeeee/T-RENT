import { useState, type FormEvent } from "react";

import type { RentalFilters } from "../../api/rentals.api";

interface HeroProps {
    onSearch: (filters: RentalFilters) => void;
}

function Hero({ onSearch }: HeroProps) {
    const [search, setSearch] = useState("");

    const [minGuests, setMinGuests] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        let guests: number | undefined;

        if (minGuests.trim() !== "") {
            guests = Number(minGuests);

            if (
                !Number.isInteger(guests) ||
                guests < 1 ||
                guests > 500
            ) {
                setError("Укажите количество гостей от 1 до 500");
                return;
            }
        }

        onSearch({
            search: search.trim() || undefined,
            min_guests: guests,
        });
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
                            <span>Количество гостей</span>

                            <input
                                type="number"
                                min="1"
                                max="500"
                                placeholder="Например, 5"
                                value={minGuests}
                                onChange={(e) => setMinGuests(e.target.value)}
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