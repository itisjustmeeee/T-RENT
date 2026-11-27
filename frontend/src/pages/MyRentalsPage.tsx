
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMyRentals } from "../api/rentals.api";
import type { Rental } from "../types/rental.types";

function MyRentalsPage() {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                        Разместите первое помещение, чтобы оно появилось
                        в каталоге.
                    </p>
                </div>
            )}

            {!loading && !error && rentals.length > 0 && (
                <div className="my-rentals-grid">
                    {rentals.map((rental) => (
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

                                <Link
                                    to={`/rentals/${rental.rental_id}`}
                                    className="button button--secondary"
                                >
                                    Посмотреть объявление
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}

export default MyRentalsPage;
