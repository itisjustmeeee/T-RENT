import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <section className="page">
            <h1>404</h1>

            <p>
                Страница не найдена
            </p>

            <Link to="/" className="button button-primary">
                На главную
            </Link>
        </section>
    );
}