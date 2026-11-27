
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Hero from "../components/rentals/Hero";
import CategoryFilter from "../components/rentals/CategoryFilter";
import { RentalCard } from "../components/rentals/RentalCard";

import { useAuth } from "../context/AuthContext";

import {
    getFavorites,
    addFavorite,
    removeFavorite,
} from "../api/favourites.api";

import {
    getRentals,
    getCategories,
} from "../api/rentals.api";

import type {
    Rental,
    Category,
} from "../types/rental.types";

import type {
    RentalFilters,
} from "../api/rentals.api";

const PAGE_SIZE = 9;

const EMPTY_FAVORITE_IDS: ReadonlySet<number> = new Set<number>();

function CatalogPage() {
    const navigate = useNavigate();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [categoryId, setCategoryId] =
        useState<number | "all">("all");

    const [hasMore, setHasMore] = useState(false);

    const [filters, setFilters] = useState<RentalFilters>({
        sort_by: "newest",
        skip: 0,
        take: PAGE_SIZE,
    });

    const [minPriceInput, setMinPriceInput] = useState("");
    const [maxPriceInput, setMaxPriceInput] = useState("");

    const [priceError, setPriceError] = useState("");

    const [heroKey, setHeroKey] = useState(0);

    const [total, setTotal] = useState(0);

    const { user } = useAuth();

    const userId = user?.user_id;

    const [favoriteData, setFavoriteData] = useState<{
        userId: number;
        ids: Set<number>;
    } | null>(null);

    const favoriteIds =
        favoriteData && favoriteData.userId === userId
            ? favoriteData.ids
            : EMPTY_FAVORITE_IDS;

    const currentPage =
        Math.floor((filters.skip ?? 0) / PAGE_SIZE) + 1;

    useEffect(() => {
        let active = true;

        async function loadCategories() {
            try {
                const data = await getCategories();

                if (active) {
                    setCategories(data);
                }
            } catch (err) {
                console.error(
                    "Ошибка загрузки категорий:",
                    err
                );
            }
        }

        void loadCategories();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function loadRentals() {
            try {
                setLoading(true);
                setError("");

                const data = await getRentals(filters);

                if (active) {
                    setRentals(data.items);
                    setTotal(data.total);

                    setHasMore(
                        data.skip + data.items.length < data.total
                    );
                }
            } catch (err) {
                console.error(
                    "Ошибка загрузки объявлений:",
                    err
                );

                if (active) {
                    setRentals([]);
                    setTotal(0);
                    setHasMore(false);

                    if (axios.isAxiosError(err)) {
                        const detail = err.response?.data?.detail;

                        setError(
                            typeof detail === "string"
                                ? detail
                                : "Не удалось загрузить помещения. Проверьте сервер."
                        );
                    } else {
                        setError(
                            "Произошла непредвиденная ошибка."
                        );
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadRentals();

        return () => {
            active = false;
        };
    }, [filters]);

    const updateFilters = (
        values: Partial<RentalFilters>
    ) => {
        setFilters((previous) => ({
            ...previous,
            ...values,
            skip: 0,
            take: PAGE_SIZE,
        }));
    };

    const handleSearch = (values: RentalFilters) => {
        setFilters((previous) => ({
            ...previous,
            ...values,
            skip: 0,
            take: PAGE_SIZE,
        }));
    };

    const handleCategorySelect = (
        value: number | "all"
    ) => {
        setCategoryId(value);

        updateFilters({
            category_id:
                value === "all" ? undefined : value,
        });
    };

    const handlePriceFilter = () => {
        setPriceError("");

        const min =
            minPriceInput.trim() === ""
                ? undefined
                : Number(minPriceInput);

        const max =
            maxPriceInput.trim() === ""
                ? undefined
                : Number(maxPriceInput);

        if (
            (min !== undefined &&
                (!Number.isFinite(min) || min < 0)) ||
            (max !== undefined &&
                (!Number.isFinite(max) || max < 0))
        ) {
            setPriceError("Укажите корректную цену");
            return;
        }

        if (
            min !== undefined &&
            max !== undefined &&
            min > max
        ) {
            setPriceError(
                "Минимальная цена больше максимальной"
            );
            return;
        }

        updateFilters({
            min_price: min,
            max_price: max,
        });
    };

    useEffect(() => {
        if (typeof userId !== "number") {
            return;
        }

        let active = true;

        const currentUserId: number = userId;

        async function loadFavoriteIds() {
            try {
                const data = await getFavorites();

                if (active) {
                    setFavoriteData({
                        userId: currentUserId,
                        ids: new Set<number>(
                            data.map((item) => item.rental_id)
                        ),
                    });
                }
            } catch (err) {
                console.error(
                    "Ошибка загрузки избранного:",
                    err
                );
            }
        }

        void loadFavoriteIds();

        return () => {
            active = false;
        };
    }, [userId]);

    const handleToggleFavorite = async (rentalId: number) => {
        const currentUserId = userId;

        if (currentUserId == null) {
            navigate("/login", {
                state: { from: "/rentals" },
            });
            return;
        }

        const alreadyFavorite = favoriteIds.has(rentalId);

        try {
            if (alreadyFavorite) {
                await removeFavorite(rentalId);

                setFavoriteData((previous) => {
                    const next = new Set<number>(
                        previous &&
                        previous.userId === currentUserId
                            ? previous.ids
                            : []
                    );

                    next.delete(rentalId);

                    return {
                        userId: currentUserId,
                        ids: next,
                    };
                });
            } else {
                await addFavorite(rentalId);

                setFavoriteData((previous) => {
                    const next = new Set<number>(
                        previous &&
                        previous.userId === currentUserId
                            ? previous.ids
                            : []
                    );

                    next.add(rentalId);

                    return {
                        userId: currentUserId,
                        ids: next,
                    };
                });
            }
        } catch (err) {
            console.error(
                "Ошибка избранного:",
                err
            );

            alert("Не удалось изменить избранное");
        }
    };

    const resetFilters = () => {
        setCategoryId("all");

        setMinPriceInput("");
        setMaxPriceInput("");

        setPriceError("");

        setHeroKey((previous) => previous + 1);

        setFilters({
            sort_by: "newest",
            skip: 0,
            take: PAGE_SIZE,
        });
    };

    const goToPreviousPage = () => {
        if (currentPage <= 1) {
            return;
        }

        setFilters((previous) => ({
            ...previous,
            skip: Math.max(
                (previous.skip ?? 0) - PAGE_SIZE,
                0
            ),
        }));

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const goToNextPage = () => {
        if (!hasMore) {
            return;
        }

        setFilters((previous) => ({
            ...previous,
            skip: (previous.skip ?? 0) + PAGE_SIZE,
        }));

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <main>
            <Hero
                key={heroKey}
                onSearch={handleSearch}
            />

            <section className="container catalog">
                <CategoryFilter
                    categories={categories}
                    selectedCategory={categoryId}
                    onSelect={handleCategorySelect}
                />

                <div className="catalog__heading">
                    <div>
                        <h2>Места для ваших идей</h2>

                        <p className="catalog__subtitle">
                            Найдено помещений: {total}
                        </p>
                    </div>

                    <div className="catalog__controls">
                        <select
                            value={filters.sort_by ?? "newest"}
                            onChange={(e) =>
                                updateFilters({
                                    sort_by: e.target.value as
                                        | "newest"
                                        | "price_asc"
                                        | "price_desc",
                                })
                            }
                        >
                            <option value="newest">
                                Сначала новые
                            </option>

                            <option value="price_asc">
                                Сначала дешевле
                            </option>

                            <option value="price_desc">
                                Сначала дороже
                            </option>
                        </select>
                    </div>
                </div>

                <div className="price-filter">
                    <strong>Цена за единицу аренды</strong>

                    <input
                        type="number"
                        min="0"
                        placeholder="От, ₽"
                        value={minPriceInput}
                        onChange={(e) =>
                            setMinPriceInput(e.target.value)
                        }
                    />

                    <input
                        type="number"
                        min="0"
                        placeholder="До, ₽"
                        value={maxPriceInput}
                        onChange={(e) =>
                            setMaxPriceInput(e.target.value)
                        }
                    />

                    <button
                        type="button"
                        className="button button--primary"
                        onClick={handlePriceFilter}
                    >
                        Применить
                    </button>

                    <button
                        type="button"
                        className="button button--filter-reset"
                        onClick={resetFilters}
                    >
                        Сбросить фильтры
                    </button>
                </div>

                {priceError && (
                    <p className="catalog__error">
                        {priceError}
                    </p>
                )}

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
                        {rentals.length > 0 ? (
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
                                        isFavorite={favoriteIds.has(
                                            rental.rental_id
                                        )}
                                        onToggleFavorite={
                                            handleToggleFavorite
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="catalog__empty">
                                <h3>Помещения не найдены</h3>

                                <p>
                                    Измените параметры поиска
                                    или сбросьте фильтры
                                </p>

                                <button
                                    type="button"
                                    className="button button--primary"
                                    onClick={resetFilters}
                                >
                                    Сбросить фильтры
                                </button>
                            </div>
                        )}

                        {(currentPage > 1 || hasMore) && (
                            <div className="pagination">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={goToPreviousPage}
                                >
                                    Назад
                                </button>

                                <span>
                                    Страница {currentPage}
                                </span>

                                <button
                                    type="button"
                                    disabled={!hasMore}
                                    onClick={goToNextPage}
                                >
                                    Далее
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className="container help-banner">
                <div>
                    <h3>
                        Не знаете, какое место выбрать?
                    </h3>

                    <p>
                        Расскажите нам о планах — мы поможем
                        найти подходящее пространство
                    </p>
                </div>

                <button
                    type="button"
                    className="button button--primary"
                    onClick={() =>
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                        })
                    }
                >
                    Перейти к поиску
                </button>
            </section>
        </main>
    );
}

export default CatalogPage;
