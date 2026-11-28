import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth.types";

function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [name, setName]= useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [role, setRole] = useState<UserRole>("RENTER");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setError("");

        if (password.length < 8) {
            setError("Пароль должен содержать минимум 8 символов");
            return;
        }

        if (password !== confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }

        setLoading(true);

        try {
            await register({
                name: name.trim(),
                surname: surname.trim() || undefined,
                email: email.trim().toLowerCase(),
                phone_number: phone.trim() || undefined,
                password,
                role,
            });

            navigate("/rentals", { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;

                setError(
                    typeof detail === "string"
                        ? detail
                        : "Не удалось зарегистрироваться"
                );
            } else {
                setError("Произошла непредвиденная ошибка");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link to="/" className="auth-logo">
                    T-RENT
                </Link>

                <h1>Создать аккаунт</h1>

                <p className="auth-subtitle">
                    Присоединяйтесь к T-RENT
                </p>

                <form onSubmit={handleSubmit}>
                    <label className="auth-field">
                        <span>Имя</span>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ваше имя"
                            required
                            autoComplete="given-name"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Фамилия</span>

                        <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder="Ваша фамилия"
                            autoComplete="family-name"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Email</span>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@mail.ru"
                            required
                            autoComplete="email"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Телефон</span>

                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+7 900 888-88-88"
                            autoComplete="tel"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Тип аккаунта</span>

                        <select
                            value={role}
                            onChange={(e) =>
                                setRole(e.target.value as UserRole)
                            }
                        >
                            <option value="RENTER">
                                Арендатор - ищу помещение
                            </option>
                            <option value="LESSER">
                                Арендодатель - сдаю помещение
                            </option>
                        </select>
                    </label>
                    <label className="auth-field">
                        <span>Пароль</span>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Минимум 8 символов"
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Повторите пароль</span>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            placeholder="Повторите пароль"
                            required
                            autoComplete="new-password"
                        />
                    </label>
                    {error && (
                        <p className="auth-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="button button--primary auth-submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Создание аккаунта..."
                            : "Зарегистрироваться"
                        }
                    </button>
                </form>
                <p className="auth-bottom">
                    Уже есть аккаунт?{" "}
                    <Link to="/login">
                        Войти
                    </Link>
                </p>
            </section>
        </main>
    );
}

export default RegisterPage;