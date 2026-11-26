import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <section className="page">
            <p className="eyebrow">Для работы, встреч и вдохновения</p>

            <h1>Ваши планы.</h1>
            <h1>Подходящее место</h1>

            <p className="eyebrow">Лофты, студии и кабинеты - арендуйте на несколько часов, а не на целый день</p>
            <Link to="/rentals" className="button button--primary">
                Посмотреть объявления
            </Link>
        </section>
    );
}