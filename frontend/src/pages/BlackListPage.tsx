import { useEffect, useState } from "react";

import {
    getBlacklist,
    removeFromBlacklist,
} from "../api/blacklist.api";

import type { BlacklistItem } from "../types/blacklist.types";

function BlacklistPage() {
    const [items, setItems] = useState<BlacklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        async function loadBlacklist() {
            try {
                const data = await getBlacklist();

                if (active) {
                    setItems(data);
                }
            } catch {
                if (active) {
                    setError("Не удалось загрузить чёрный список");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadBlacklist();

        return () => {
            active = false;
        };
    }, []);

    const handleRemove = async (renterId: number) => {
        const confirmed = window.confirm(
            "Убрать арендатора из чёрного списка?"
        );

        if (!confirmed) return;

        try {
            setRemovingId(renterId);
            setError("");

            await removeFromBlacklist(renterId);

            setItems((previous) =>
                previous.filter(
                    (item) => item.renter_id !== renterId
                )
            );
        } catch {
            setError("Не удалось удалить пользователя из списка");
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <section className="page-shell">
                <div className="container page-content blacklist-page">
                    <p className="page-loading">
                        Загрузка чёрного списка...
                    </p>
                </div>
            </section>
        );
    }

    return (
        <main className="container blacklist-page">
            <div className="blacklist-heading">
                <div>
                    <h1>Чёрный список</h1>
                    <p>
                        Управление арендаторами,
                        которым ограничено бронирование ваших помещений.
                    </p>
                </div>

                <span className="blacklist-count">
                    Всего: {items.length}
                </span>
            </div>

            {error && (
                <p className="page-error">{error}</p>
            )}

            {items.length === 0 ? (
                <div className="blacklist-empty">
                    <h3>Чёрный список пуст</h3>
                    <p>
                        Здесь будут отображаться арендаторы,
                        которых вы добавили в чёрный список.
                    </p>
                </div>
            ) : (
                <div className="blacklist-list">
                    {items.map((item) => (
                        <article
                            className="blacklist-item"
                            key={item.black_list_id}
                        >
                            <div className="blacklist-avatar">
                                {item.renter?.name
                                    ?.charAt(0)
                                    .toUpperCase() || "?"}
                            </div>

                            <div className="blacklist-user">
                                <h3>
                                    {item.renter
                                        ? [
                                            item.renter.name,
                                            item.renter.surname,
                                        ]
                                            .filter(Boolean)
                                            .join(" ")
                                        : `Пользователь #${item.renter_id}`}
                                </h3>

                                <p>
                                    ID арендатора: {item.renter_id}
                                </p>

                                <small>
                                    Добавлен:{" "}
                                    {new Date(
                                        item.created_at
                                    ).toLocaleDateString("ru-RU")}
                                </small>
                            </div>

                            <button
                                type="button"
                                className="blacklist-remove"
                                onClick={() =>
                                    handleRemove(item.renter_id)
                                }
                                disabled={
                                    removingId === item.renter_id
                                }
                            >
                                {removingId === item.renter_id
                                    ? "Удаление..."
                                    : "Убрать из списка"}
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}

export default BlacklistPage;