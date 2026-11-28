import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getFavorites, removeFavorite } from "../api/favourites.api";
import { RentalCard } from "../components/rentals/RentalCard";

import type { Rental } from "../types/rental.types";

function FavoritesPage() {
    const navigate = useNavigate();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        async function loadFavorites() {
            try {
                const data = await getFavorites();

                if (active) {
                    setRentals(data);
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    setError("Не удалось загрузить избранное");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadFavorites();

        return () => {
            active = false;
        };
    }, []);

    const handleRemove = async (rentalId: number) => {
        try {
            setRemovingId(rentalId);
            setError("");

            await removeFavorite(rentalId);

            setRentals((previous) =>
                previous.filter(
                    (rental) => rental.rental_id !== rentalId
                )
            );
        } catch (err) {
            console.error(err);
            setError("Не удалось удалить помещение из избранного");
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <section className="page-shell">
                <div className="container page-content favorites-page">
                    <p className="page-loading">
                        Загрузка избранного...
                    </p>
                </div>
            </section>
        );
    }

    return (
        <main className="container favorites-page">
            <div className="favorites-heading">
                <div>
                    <h1>Избранное</h1>
                    <p>
                        Помещения, которые вы сохранили для себя
                    </p>
                </div>

                <span className="favorites-count">
                    {rentals.length} помещений
                </span>
            </div>

            {error && (
                <p className="page-error">{error}</p>
            )}

            {rentals.length === 0 ? (
                <div className="favorites-empty">
                    <div className="favorites-empty__icon">♡</div>

                    <h2>Пока здесь ничего нет</h2>

                    <p>
                        Добавляйте понравившиеся помещения
                        в избранное, чтобы быстро находить их.
                    </p>

                    <button
                        type="button"
                        className="button button--primary"
                        onClick={() => navigate("/rentals")}
                    >
                        Перейти в каталог
                    </button>
                </div>
            ) : (
                <div className="favorites-grid">
                    {rentals.map((rental) => (
                        <div
                            className="favorites-item"
                            key={rental.rental_id}
                        >
                            <RentalCard
                                rental={rental}
                                onClick={() =>
                                    navigate(
                                        `/rentals/${rental.rental_id}`
                                    )
                                }
                            />

                            <button
                                type="button"
                                className="favorites-remove"
                                onClick={() =>
                                    handleRemove(rental.rental_id)
                                }
                                disabled={
                                    removingId === rental.rental_id
                                }
                            >
                                {removingId === rental.rental_id
                                    ? "Удаление..."
                                    : "♡ Убрать из избранного"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default FavoritesPage;