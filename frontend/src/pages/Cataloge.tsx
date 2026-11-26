import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Hero from "../components/rentals/Hero";
import CategoryFilter from "../components/rentals/CategoryFilter";
import { RentalCard } from "../components/rentals/RentalCard";

import { getRentals } from "../api/rentals.api";

import type { Rental, Category, TimeMeasurement } from "../types/rental.types";

function CatalogPage() {
    const navigate = useNavigate();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");

    const [selectedTime, setSelectedTime] = useState<TimeMeasurement | "ALL">("ALL");

    const [sort, setSort] = useState("popular");

    useEffect(() => {
        async function loadRentals() {
            try {
                setLoading(true);
                setError("");

                const data = await getRentals();

                setRentals(data);
            } catch (err) {
                console.error(err);

                setError(
                    "Не удалось загрузить помещения. Проверьте подключение к серверу."
                );
            } finally {
                setLoading(false);
            }
        }

        loadRentals();
    }, []);

    const categories = useMemo(() => {
        const map = new Map<number, Category>();

        rentals.forEach((rental) => {
            if (rental.category) {
                map.set(
                    rental.category.category_id,
                    rental.category
                );
            }
        });

        return Array.from(map.values());
    }, [rentals]);

    const filteredRentals = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const result = rentals.filter((rental) => {
            const matchesCategory =
                selectedCategory === "all" ||
                rental.category_id === selectedCategory;

            const matchesTime =
                selectedTime === "ALL" ||
                rental.time_measurement === selectedTime;

            const searchableText = [
                rental.title,
                rental.address,
                rental.desc ?? "",
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !query || searchableText.includes(query);

            return (
                matchesCategory &&
                matchesTime &&
                matchesSearch
            );
        });

        if (sort === "price-asc") {
            result.sort(
                (a, b) => Number(a.price) - Number(b.price)
            );
        } else if (sort === "price-desc") {
            result.sort(
                (a, b) => Number(b.price) - Number(a.price)
            );
        } else {
            result.sort(
                (a, b) =>
                    Number(b.avg_rating ?? 0) - 
                    Number(a.avg_rating ?? 0)
            );
        }

        return result;
    }, [
        rentals,
        searchQuery,
        selectedCategory,
        selectedTime,
        sort,
    ]);

    return (
        <main>
            <Hero onSearch={setSearchQuery} />

            <section className="container catalog">
                <CategoryFilter
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                />

                <div className="catalog__heading">
                    <div>
                        <h2>Места для ваших идей</h2>

                        <p className="catalog__subtitle">
                            Москва · {filteredRentals.length} помещений
                        </p>
                    </div>

                    <div className="catalog__controls">
                        <select
                            value={selectedTime}
                            onChange={(e) =>
                                setSelectedTime(
                                    e.target.value as TimeMeasurement | "ALL"
                                )
                            }
                        >
                            <option value="ALL">Все единицы времени</option>
                            <option value="HOUR">За час</option>
                            <option value="DAY">За день</option>
                            <option value="MONTH">За месяц</option>
                        </select>

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="popular">По популярности</option>
                            <option value="price-asc">Сначала дешевле</option>
                            <option value="price-desc">Сначала дороже</option>
                        </select>
                    </div>
                </div>

                {loading && (
                    <p className="catalog__message">
                        Загрузка помещений...
                    </p>
                )}

                {error && (
                    <p className="catalog__error">
                        {error}
                    </p>
                )}

                {!loading && !error && (
                    <>
                        {filteredRentals.length > 0 ? (
                            <div className="rentals-grid">
                                {filteredRentals.map((rental) => (
                                    <RentalCard
                                        key={rental.rental_id}
                                        rental={rental}
                                        onClick={() =>
                                            navigate(`/rentals/${rental.rental_id}`)
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="catalog__empty">
                                <h3>Помещения не найдены</h3>
                                <p>
                                    Попробуйте изменит поисковый запрос
                                    или выбрать другую категорию
                                </p>
                            </div>
                        )}
                    </>
                )}
            </section>
            <section className="container help-banner">
                <div>
                    <h3>Не знаете, какое мето стоит выбрать?</h3>
                    <p>
                        Расскажите нам о планах - поможем найти
                        подходящее пространство
                    </p>
                </div>
                <button
                    className="button button--primary"
                    onClick={() => navigate("/login")}
                >
                    Помогите с выбором
                </button>
            </section>
        </main>
    );
}

export default CatalogPage;