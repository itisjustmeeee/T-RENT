import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../context/AuthContext";

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            await login({
                email: email.trim().toLowerCase(),
                password,
            });

            navigate("/rentals", { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;

                setError(
                    typeof detail === "string"
                        ? detail
                        : "Не удалось выполнить вход"
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

                <h1>С возвращением!</h1>

                <p className="auth-subtitle">
                    Войдите в аккаунт, чтобы продолжить
                </p>

                <form onSubmit={handleSubmit}>
                    <label className="auth-field">
                        <span>Email</span>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="example@mail.ru"
                            required
                            autoComplete="email"
                        />
                    </label>
                    <label className="auth-field">
                        <span>Пароль</span>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Введите пароль"
                            required
                            autoComplete="current-password"
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
                        {loading ? "Выполняется вход..." : "Войти"}
                    </button>
                </form>
                <p className="auth-bottom">
                    Еще нет аккаунта?{" "}
                    <Link to="/register">
                        Зарегистрироваться
                    </Link>
                </p>
            </section>
        </main>
    );
}

export default LoginPage;