
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Header() {
    const navigate = useNavigate();

    const { user, isAuthenticated, logout } = useAuth();

    const role = String(user?.role ?? "");

    const isRenter = role === "RENTER";
    const isLessor =
        role === "LESSOR" || role === "LESSER";

    const getNavClass = ({
        isActive,
    }: {
        isActive: boolean;
    }) =>
        isActive
            ? "nav-link active"
            : "nav-link";

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Ошибка выхода из аккаунта:", error);
        }
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
                        className={getNavClass}
                    >
                        Каталог
                    </NavLink>

                    {isAuthenticated && (
                        <>
                            <NavLink
                                to="/favorites"
                                className={getNavClass}
                            >
                                Избранное
                            </NavLink>

                            <NavLink
                                to="/notifications"
                                className={getNavClass}
                            >
                                Уведомления
                            </NavLink>

                            
                            {(isRenter || isLessor) && (
                                <NavLink
                                    to="/bookings"
                                    className={getNavClass}
                                >
                                    {isRenter ? "Мои бронирования" : "Заявки на аренду"}
                                </NavLink>
                            )}


                            {isLessor && (
                                <>
                                    <NavLink
                                        to="/my-rentals"
                                        className={getNavClass}
                                    >
                                        Мои объявления
                                    </NavLink>

                                    <NavLink
                                        to="/blacklist"
                                        className={getNavClass}
                                    >
                                        Чёрный список
                                    </NavLink>
                                </>
                            )}

                            <NavLink
                                to="/profile"
                                className={getNavClass}
                            >
                                Профиль
                            </NavLink>
                        </>
                    )}

                    {!isAuthenticated && (
                        <NavLink
                            to="/login"
                            className={getNavClass}
                        >
                            Профиль
                        </NavLink>
                    )}

                </nav>

                {isAuthenticated ? (
                    <div className="header__account">

                        <span className="header__user-name">
                            {user
                                ? [user.name, user.surname]
                                    .filter(Boolean)
                                    .join(" ")
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
