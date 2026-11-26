import { useState } from "react";

interface HeroProps {
    onSearch: (value: string) => void;
}

function Hero({ onSearch }: HeroProps) {
    const [search, setSearch] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(search);
    };

    return (
        <section className="hero">
            <div className="container hero__content">
                <p>
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
                    className="hero__search"
                    onSubmit={handleSubmit}
                >
                    <input
                        type="text"
                        placeholder="Найти помещение..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button
                        type="submit"
                        className="button button--primary"
                    >
                        Найти
                    </button>
                </form>
                <div className="hero__filters">
                    <div className="hero__filter">
                        <span>Город</span>
                        <strong>Москва</strong>
                    </div>
                    <div className="hero__filter">
                        <span>Дата</span>
                        <strong>Выберите дату</strong>
                    </div>
                    <div className="hero__filter">
                        <span>Время</span>
                        <strong>Любое время</strong>
                    </div>
                    <div className="hero__filter">
                        <span>Гости</span>
                        <strong>До 12 человек</strong>
                    </div>
                </div>
                <p className="hero__hint">
                    Без звонков и долгих согласований.
                    Выберите место в удобное время.
                </p>
            </div>
        </section>
    );
}

export default Hero;