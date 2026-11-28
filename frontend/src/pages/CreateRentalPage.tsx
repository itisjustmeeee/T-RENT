
import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

import {
    createRental,
    getCategories,
} from "../api/rentals.api";

function getCreateErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (typeof detail === "string") {
            return detail;
        }

        if (Array.isArray(detail)) {
            return detail
                .map((item) => item.msg ?? "Ошибка заполнения")
                .join(", ");
        }

        return "Не удалось создать объявление";
    }

    return "Произошла непредвиденная ошибка";
}

type TimeMeasurement = "HOUR" | "DAY" | "MONTH";

type RentalCategory =
    Awaited<ReturnType<typeof getCategories>>[number];

interface RentalForm {
    title: string;
    address: string;
    area: string;
    price: string;
    time_measurement: TimeMeasurement;
    category_id: string;
    desc: string;
    amount_of_people: string;
    photo_url: string;
    availability: string;
}

const initialForm: RentalForm = {
    title: "",
    address: "",
    area: "",
    price: "",
    time_measurement: "HOUR",
    category_id: "",
    desc: "",
    amount_of_people: "1",
    photo_url: "",
    availability: "AVAILABLE",
};

function CreateRentalPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState<RentalForm>(initialForm);

    const [categories, setCategories] =
        useState<RentalCategory[]>([]);

    const [categoriesLoading, setCategoriesLoading] =
        useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

                if (active) {
                    setError("Не удалось загрузить категории помещений");
                }
            } finally {
                if (active) {
                    setCategoriesLoading(false);
                }
            }
        }

        void loadCategories();

        return () => {
            active = false;
        };
    }, []);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement |
            HTMLTextAreaElement |
            HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setError("");

        const area = Number(form.area);
        const price = Number(form.price);
        const guests = Number(form.amount_of_people);

        if (
            !Number.isFinite(area) ||
            area <= 0 ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Number.isInteger(guests) ||
            guests < 1
        ) {
            setError("Проверьте площадь, цену и количество гостей");
            return;
        }

        try {
            setLoading(true);

            await createRental({
                title: form.title.trim(),
                address: form.address.trim(),
                area,
                price,
                time_measurement: form.time_measurement,
                ...(form.category_id
                    ? { category_id: Number(form.category_id) }
                    : {}),
                desc: form.desc.trim(),
                amount_of_people: guests,
                ...(form.photo_url.trim()
                    ? { photo_url: form.photo_url.trim() }
                    : {}),
                availability: form.availability,
            });

            navigate("/my-rentals", { replace: true });
        } catch (err) {
            console.error("Ошибка создания объявления:", err);
            setError(getCreateErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="page-shell">
            <div className="container create-rental-page">

                <div className="create-rental-heading">
                    <div>
                        <h1>Добавить помещение</h1>

                        <p>
                            Заполните информацию о помещении,
                            чтобы разместить объявление в каталоге T-RENT.
                        </p>
                    </div>

                    <Link
                        to="/my-rentals"
                        className="button button--secondary"
                    >
                        Назад к объявлениям
                    </Link>
                </div>

                {error && (
                    <p className="page-error">
                        {error}
                    </p>
                )}

                <form
                    className="create-rental-form"
                    onSubmit={handleSubmit}
                >
                    <div className="create-rental-section">
                        <h2>Основная информация</h2>

                        <label className="create-rental-field">
                            Название помещения

                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Например, конференц-зал"
                                maxLength={150}
                                required
                            />
                        </label>

                        <label className="create-rental-field">
                            Адрес помещения

                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Город, улица, дом"
                                required
                            />
                        </label>

                        <label className="create-rental-field">
                            Категория

                            <select
                                name="category_id"
                                value={form.category_id}
                                onChange={handleChange}
                                disabled={categoriesLoading}
                            >
                                <option value="">
                                    Без категории
                                </option>

                                {categories.map((category) => (
                                    <option
                                        key={category.category_id}
                                        value={category.category_id}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>

                            {categoriesLoading && (
                                <small>Загрузка категорий...</small>
                            )}
                        </label>

                        <label className="create-rental-field">
                            Описание

                            <textarea
                                name="desc"
                                value={form.desc}
                                onChange={handleChange}
                                placeholder="Расскажите о помещении, его особенностях и условиях аренды"
                                rows={5}
                                maxLength={3000}
                            />
                        </label>
                    </div>

                    <div className="create-rental-section">
                        <h2>Характеристики помещения</h2>

                        <div className="create-rental-grid">
                            <label className="create-rental-field">
                                Площадь, м²

                                <input
                                    type="number"
                                    name="area"
                                    value={form.area}
                                    onChange={handleChange}
                                    min="0.1"
                                    step="0.1"
                                    placeholder="Например, 50"
                                    required
                                />
                            </label>

                            <label className="create-rental-field">
                                Максимальное количество гостей

                                <input
                                    type="number"
                                    name="amount_of_people"
                                    value={form.amount_of_people}
                                    onChange={handleChange}
                                    min="1"
                                    max="500"
                                    step="1"
                                    required
                                />
                            </label>
                        </div>
                    </div>

                    <div className="create-rental-section">
                        <h2>Стоимость аренды</h2>

                        <div className="create-rental-grid">
                            <label className="create-rental-field">
                                Цена

                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Например, 1500"
                                    required
                                />
                            </label>

                            <label className="create-rental-field">
                                Единица оплаты

                                <select
                                    name="time_measurement"
                                    value={form.time_measurement}
                                    onChange={handleChange}
                                >
                                    <option value="HOUR">За час</option>
                                    <option value="DAY">За день</option>
                                    <option value="MONTH">За месяц</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="create-rental-section">
                        <h2>Фотография и доступность</h2>

                        <label className="create-rental-field">
                            Ссылка на фотографию

                            <input
                                type="url"
                                name="photo_url"
                                value={form.photo_url}
                                onChange={handleChange}
                                placeholder="https://example.com/photo.jpg"
                            />

                            <small>
                                Укажи прямую ссылку на изображение.
                                Загрузка фотографий с компьютера
                                пока не поддерживается.
                            </small>
                        </label>

                        {form.photo_url.trim() && (
                            <div className="create-rental-preview">
                                <p>Предварительный просмотр:</p>

                                <img
                                    src={form.photo_url}
                                    alt="Предварительный просмотр помещения"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                    onLoad={(e) => {
                                        e.currentTarget.style.display = "block";
                                    }}
                                />
                            </div>
                        )}

                        <label className="create-rental-field">
                            Доступность

                            <select
                                name="availability"
                                value={form.availability}
                                onChange={handleChange}
                            >
                                <option value="AVAILABLE">
                                    Доступно для аренды
                                </option>

                                <option value="UNAVAILABLE">
                                    Временно недоступно
                                </option>
                            </select>
                        </label>
                    </div>

                    <div className="create-rental-actions">
                        <Link
                            to="/my-rentals"
                            className="button button--secondary"
                        >
                            Отмена
                        </Link>

                        <button
                            type="submit"
                            className="button button--primary"
                            disabled={loading || categoriesLoading}
                        >
                            {loading
                                ? "Создание объявления..."
                                : "Опубликовать объявление"}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default CreateRentalPage;
