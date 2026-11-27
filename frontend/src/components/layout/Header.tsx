import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Header() {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate("/", {replace: true});
    };

    return (
        <header className="site-header">
            <div className="container header__inner">
                <Link to="/" className="header__logo">
                    T-RENT
                </Link>

                <nav className="header__nav">
                    <NavLink
                        to="/rentals"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        Каталог
                    </NavLink>

                    {isAuthenticated ? (
                        <NavLink
                            to="/profile"
                            className={({ isActive }) =>
                                isActive
                                    ? "nav-link active"
                                    : "nav-link"
                            }
                        >
                            Профиль
                        </NavLink>
                    ) : (
                        <NavLink
                            to="/login"
                            className={({ isActive }) =>
                                isActive
                                    ? "nav-link active"
                                    : "nav-link"
                            }
                        >
                            Профиль
                        </NavLink>
                    )}

                    {isAuthenticated && (
                        <NavLink
                            to="/bookings"
                            className={({ isActive }) =>
                                isActive ? "nav-link active" : "nav-link"
                            }
                        >
                            Мои бронирования
                        </NavLink>
                    )}

                    <span className="nav-link nav-link--disabled">
                        Избранное
                    </span>

                    <span className="nav-link nav-link--disabled">
                        Уведомления
                    </span>
                </nav>
                {isAuthenticated ? (
                    <div className="header__account">
                        <span className="header__user-name">
                            {user
                                ? [user.name, user.surname].filter(Boolean).join(" ")
                                : ""}
                        </span>

                        <button
                            type="button"
                            className="button button--secondary"
                            onClick={handleLogout}
                        >
                            Выйти
                        </button>
                    </div>
                ) : (
                    <div className="header__account">
                        <Link
                            to="/register"
                            className="button button--secondary"
                        >
                            Регистрация
                        </Link>

                        <Link
                            to="/login"
                            className="button button--primary"
                        >
                            Войти
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;