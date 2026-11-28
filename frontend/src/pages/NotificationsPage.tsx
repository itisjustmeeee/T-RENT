import { useEffect, useState } from "react";

import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../api/notifications.api";

import type { Notification } from "../types/notifications.types";

function NotificationsPage() {
    const [items, setItems] = useState<Notification[]>([]);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [loadedForFilter, setLoadedForFilter] =
        useState<boolean | null>(null);

    const loading = loadedForFilter !== unreadOnly;
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadNotifications() {
            try {
                const data = await getNotifications(unreadOnly);

                if (active) {
                    setItems(data);
                    setError("");
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    setError("Не удалось загрузить уведомления");
                }
            } finally {
                if (active) {
                    setLoadedForFilter(unreadOnly);
                }
            }
        }

        void loadNotifications();

        return () => {
            active = false;
        };
    }, [unreadOnly]);

    const handleRead = async (notificationId: number) => {
        try {
            setUpdatingId(notificationId);

            await markNotificationRead(notificationId);

            setItems((previous) =>
                previous.map((item) => ({
                    ...item,
                    is_read:
                        item.notification_id === notificationId
                            ? true
                            : item.is_read,
                }))
            );
        } catch (err) {
            console.error(err);
            setError("Не удалось отметить уведомление прочитанным");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReadAll = async () => {
        try {
            setMarkingAll(true);
            setError("");

            await markAllNotificationsRead();

            if (unreadOnly) {
                setItems([]);
            } else {
                setItems((previous) =>
                    previous.map((item) => ({
                        ...item,
                        is_read: true,
                    }))
                );
            }
        } catch (err) {
            console.error(err);
            setError("Не удалось отметить уведомления прочитанными");
        } finally {
            setMarkingAll(false);
        }
    };

    const unreadCount = items.filter(
        (item) => !item.is_read
    ).length;

    return (
        <section className="page-shell">
            <div className="container page-content notifications-page">
                <main className="container notifications-page">
                    <div className="notifications-heading">
                        <div>
                            <h1>Уведомления</h1>
                            <p>
                                Здесь отображаются события,
                                связанные с вашими бронированиями.
                            </p>
                        </div>

                        {!unreadOnly && unreadCount > 0 && (
                            <button
                                type="button"
                                className="notifications-read-all"
                                onClick={handleReadAll}
                                disabled={markingAll}
                            >
                                {markingAll
                                    ? "Обновление..."
                                    : "Отметить все прочитанными"}
                            </button>
                        )}
                    </div>

                    <div className="notifications-filters">
                        <button
                            type="button"
                            className={!unreadOnly ? "active" : ""}
                            onClick={() => setUnreadOnly(false)}
                        >
                            Все
                        </button>

                        <button
                            type="button"
                            className={unreadOnly ? "active" : ""}
                            onClick={() => setUnreadOnly(true)}
                        >
                            Непрочитанные
                        </button>
                    </div>

                    {error && (
                        <p className="page-error">{error}</p>
                    )}

                    {loading ? (
                        <p className="catalog__message">
                            Загрузка уведомлений...
                        </p>
                    ) : items.length === 0 ? (
                        <div className="notifications-empty">
                            <h2>Уведомлений пока нет</h2>
                            <p>
                                Когда появятся новые события,
                                они будут отображаться здесь.
                            </p>
                        </div>
                    ) : (
                        <div className="notifications-list">
                            {items.map((item) => (
                                <article
                                    key={item.notification_id}
                                    className={`notification-item ${
                                        item.is_read ? "is-read" : "is-unread"
                                    }`}
                                >
                                    <div
                                        className={`notification-icon notification-icon--${item.status.toLowerCase()}`}
                                    >
                                        {item.status === "SUCCESS" ? "✓" : "i"}
                                    </div>

                                    <div className="notification-content">
                                        <div className="notification-content__top">
                                            <strong>
                                                {item.status === "SUCCESS"
                                                    ? "Успешное действие"
                                                    : "Информация"}
                                            </strong>

                                            {!item.is_read && (
                                                <span className="notification-new">
                                                    Новое
                                                </span>
                                            )}
                                        </div>

                                        <p>{item.comment}</p>

                                        <time>
                                            {new Date(
                                                item.created_at
                                            ).toLocaleString("ru-RU", {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })}
                                        </time>
                                    </div>

                                    {!item.is_read && (
                                        <button
                                            type="button"
                                            className="notification-read-button"
                                            onClick={() =>
                                                handleRead(item.notification_id)
                                            }
                                            disabled={
                                                updatingId === item.notification_id
                                            }
                                        >
                                            {updatingId === item.notification_id
                                                ? "Сохранение..."
                                                : "Прочитать"}
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </section>
    );
}

export default NotificationsPage;