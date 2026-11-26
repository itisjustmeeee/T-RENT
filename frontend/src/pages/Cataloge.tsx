import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Hero from "../components/rentals/Hero";
import CategoryFilter from "../components/rentals/CategoryFilter";
import { RentalCard } from "../components/rentals/RentalCard";

import axios from "axios";

import { 
    getRentals,
    getCategories,
} from "../api/rentals.api";

import type { 
    Rental,
    Category,
} from "../types/rental.types";

import type { RentalFilters } from "../api/rentals.api";

const PAGE_SIZE = 9;

function CatalogPage() {
    const navigate = useNavigate();

    const [rentals, setRentals] = useState<Rental[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [categoryId, setCategoryId] =
        useState<number | "all">("all");

    const [filters, setFilters] = useState<RentalFilters>({
        sort_by: "newest",
        skip: 0,
        take: PAGE_SIZE,
    });

    const [minPriceInput, setMinPriceInput] = useState("");
    const [maxPriceInput, setMaxPriceInput] = useState("");

    const [priceError, setPriceError] = useState("");

    const [heroKey, setHeroKey] = useState(0);

    const currentPage =
        Math.floor((filters.skip ?? 0) / PAGE_SIZE) + 1;

    const totalPages = Math.max(
        1,
        Math.ceil(total / PAGE_SIZE)
    );

    useEffect(() => {
        let active = true;

        async function loadCategories() {
            try {
                const data = await getCategories();

                if (active) {
                    setCategories(data);
                }
            } catch (err) {
                console.error("Ошибка загрузки категорий:", err);
            }
        }

        loadCategories();

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
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    if (axios.isAxiosError(err)) {
                        const detail = err.response?.data?.detail;

                        setError(
                            typeof detail === "string"
                                ? detail
                                : "Не удалось загрузить помещения. Проверьте сервер"
                        );
                    } else {
                        setError("Произошла непредвиденная ошибка")
                    }
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
    }, [filters]);


    const updateFilters = (
        values: Partial<RentalFilters>
    ) => {
        setFilters((previous) => ({
            ...previous,
            ...values,
            skip: 0,
        }));
    };

    const handleSearch = (values: RentalFilters) => {
        setFilters((previous) => ({
            ...previous,
            ...values,
            skip: 0,
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

        const min = minPriceInput.trim() === ""
            ? undefined
            : Number(minPriceInput);

        const max = maxPriceInput.trim() === ""
            ? undefined
            : Number(maxPriceInput);

        if (
            (min !== undefined && (!Number.isFinite(min) || min < 0)) ||
            (max !== undefined && (!Number.isFinite(max) || max < 0))
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

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) {
            return;
        }

        setFilters((previous) => ({
            ...previous,
            skip: (page - 1) * PAGE_SIZE,
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
                                    "newest" |
                                    "price_asc" |
                                    "price_desc",
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

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    goToPage(currentPage - 1)
                                }
                            >
                                Назад
                            </button>
                            <span>
                                Страница {currentPage} из {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    currentPage === totalPages
                                }
                                onClick={() =>
                                    goToPage(currentPage + 1)
                                }
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
                <h3>Не знаете, какое место выбрать?</h3>
                <p>
                    Расскажите нам о планах - мы поможем
                    найти подходящее пространство
                </p>
            </div>
            <button
                type="button"
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