import type { Rental } from "../../types/rental.types";

interface RentalCardProps {
    rental: Rental;
    onClick: () => void;
}

export function RentalCard({
    rental,
    onClick,
}: RentalCardProps) {
    const imageUrl =
        rental.photo_url ||
        rental.photos?.[0]?.url;

    const price = Number(rental.price).toLocaleString("ru-RU");

    const categoryName =
        rental.category?.name ?? "Помещение";

    const timeLabel = {
        HOUR: "час",
        DAY: "день",
        MONTH: "месяц",
    }[rental.time_measurement];

    return (
        <article className="rental-card">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={rental.title}
                    className="rental-card__image"
                    loading="lazy"
                />
            ) : (
                <div className="rental-card__placeholder">
                    Фото отсутствует
                </div>
            )}

            <div className="rental-card__content">
                <h3 className="rental-card__title">
                    {rental.title}
                </h3>

                <span className="category-badge">
                    {categoryName}
                </span>

                <p className="rental-card__description">
                    {rental.desc || "Описание пока не добавлено"}
                </p>

                <div className="rental-card__features">
                    <span>{rental.area} м²</span>
                    <span>до {rental.amount_of_people} гостей</span>
                </div>

                <div className="rental-card__rating">
                    ★ {rental.avg_rating ?? "Нет оценок"}
                    {" . "}
                    {rental.reviews_count ?? 0} отзывов
                </div>

                <div className="rental-card__footer">
                    <div className="rental-card__price">
                        {price} ₽ / {timeLabel}
                    </div>

                    <button
                        className="button button--primaty"
                        onClick={onClick}
                    >
                        Подробнее
                    </button>
                </div>

                <p className="rental-card__address">
                    {rental.address}
                </p>
            </div>
        </article>
    );
}