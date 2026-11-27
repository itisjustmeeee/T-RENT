
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { Link } from "react-router-dom";

import { getRentals } from "../api/rentals.api";
import { RentalCard } from "../components/rentals/RentalCard";

import type { Rental } from "../types/rental.types";
import { useAuth } from "../context/AuthContext";

function HomePage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadRentals() {
            try {
                setLoading(true);

                const data = await getRentals({
                    sort_by: "newest",
                    skip: 0,
                    take: 3,
                });

                if (active) {
                    setRentals(data.items);
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    setError(
                        axios.isAxiosError(err)
                            ? "Не удалось загрузить помещения"
                            : "Произошла непредвиденная ошибка"
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadRentals();

        return () => {
            active = false;
        };
    }, []);

    return (
        <main className="home-page">

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
                        Лофты, студии и кабинеты —
                        арендуйте на несколько часов,
                        а не на целый день.
                    </p>

                    <div className="home-hero__actions">
                        <Link
                            to="/rentals"
                            className="button button--primary"
                        >
                            Найти помещение
                        </Link>

                        {!isAuthenticated && (
                            <Link
                                to="/register"
                                className="button button--secondary"
                            >
                                Стать арендодателем
                            </Link>
                        )}
                    </div>

                    <p className="hero__hint">
                        Без звонков и долгих согласований.
                        Выберите место в удобное время.
                    </p>

                </div>
            </section>

            <section className="container home-categories">

                <div className="catalog__heading">
                    <div>
                        <h2>Что вы ищете?</h2>
                        <p className="catalog__subtitle">
                            Пространства для разных задач
                        </p>
                    </div>
                </div>

                <div className="home-categories__grid">

                    <button
                        className="home-category home-category--0"
                        onClick={() => navigate("/rentals")}
                    >
                        <span>01</span>
                        <strong>Лофты</strong>
                        <small>
                            Для встреч и мероприятий
                        </small>
                    </button>

                    <button
                        className="home-category home-category--1"
                        onClick={() => navigate("/rentals")}
                    >
                        <span>02</span>
                        <strong>Студии</strong>
                        <small>
                            Для творчества и съёмок
                        </small>
                    </button>

                    <button
                        className="home-category home-category--2"
                        onClick={() => navigate("/rentals")}
                    >
                        <span>03</span>
                        <strong>Кабинеты</strong>
                        <small>
                            Для работы и переговоров
                        </small>
                    </button>
                </div>

            </section>

            <section className="container home-rentals">

                <div className="catalog__heading">
                    <div>
                        <h2>Новые помещения</h2>

                        <p className="catalog__subtitle">
                            Посмотрите последние предложения
                        </p>
                    </div>

                    <Link
                        to="/rentals"
                        className="button button--secondary"
                    >
                        Весь каталог
                    </Link>
                </div>

                {loading && (
                    <p className="catalog__message">
                        Загружаем помещения...
                    </p>
                )}

                {error && (
                    <p className="catalog__error">
                        {error}
                    </p>
                )}

                {!loading && !error && (
                    rentals.length > 0 ? (
                        <div className="rentals-grid">
                            {rentals.map((rental) => (
                                <RentalCard
                                    key={rental.rental_id}
                                    rental={rental}
                                    onClick={() =>
                                        navigate(
                                            `/rentals/${rental.rental_id}`
                                        )
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="catalog__empty">
                            <h3>
                                Пока нет новых помещений
                            </h3>

                            <p>
                                Загляните в каталог немного позже.
                            </p>
                        </div>
                    )
                )}

            </section>

            <section className="container home-benefits">

                <div className="home-benefits__heading">
                    <h2>
                        Аренда без лишних сложностей
                    </h2>

                    <p>
                        Всё необходимое для поиска
                        подходящего пространства.
                    </p>
                </div>

                <div className="home-benefits__grid">

                    <article className="home-benefit">
                        <span>01</span>
                        <h3>Удобный поиск</h3>
                        <p>
                            Подбирайте помещения по категории,
                            цене и характеристикам.
                        </p>
                    </article>

                    <article className="home-benefit">
                        <span>02</span>
                        <h3>Быстрое бронирование</h3>
                        <p>
                            Оставляйте заявку на аренду
                            прямо на сайте.
                        </p>
                    </article>

                    <article className="home-benefit">
                        <span>03</span>
                        <h3>Личный кабинет</h3>
                        <p>
                            Следите за своими бронированиями
                            и управляйте заявками.
                        </p>
                    </article>

                </div>

            </section>

            {!isAuthenticated && (
                <section className="container help-banner">
                    <div>
                        <h3>
                            Есть помещение для аренды?
                        </h3>

                        <p>
                            Присоединяйтесь к T-RENT
                            и размещайте свои предложения.
                        </p>
                    </div>

                    <Link
                        to="/register"
                        className="button button--primary"
                    >
                        Создать аккаунт
                    </Link>
                </section>
            )}
        </main>
    );
}

export default HomePage;
