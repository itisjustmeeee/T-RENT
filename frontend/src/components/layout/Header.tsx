import { Link, NavLink } from "react-router-dom";

function Header() {
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

                    <NavLink to="/login" className="nav-link">
                        Профиль
                    </NavLink>

                    <span className="nav-link nav-link--disabled">
                        Бронирования
                    </span>

                    <span className="nav-link nav-link--disabled">
                        Избранное
                    </span>

                    <span className="nav-link nav-link--disabled">
                        Уведомления
                    </span>
                </nav>
                <Link
                    to="/login"
                    className="button button--secondary"
                >
                    Войти
                </Link>
            </div>
        </header>
    );
}

export default Header;