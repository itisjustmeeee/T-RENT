import { api } from "./axios";
import type { Notification } from "../types/notifications.types";

export const getNotifications = async (
    unreadOnly = false
): Promise<Notification[]> => {
    const response = await api.get<Notification[]>(
        "/notifications/me",
        {
            params: {
                unread_only: unreadOnly,
                skip: 0,
                take: 50,
            },
        }
    );

    return response.data;
};

export const markNotificationRead = async (
    notificationId: number
) => {
    const response = await api.patch(
        `/notifications/me/${notificationId}/read`
    );

    return response.data;
};

export const markAllNotificationsRead = async () => {
    const response = await api.patch(
        "/notifications/me/read-all"
    );

    return response.data;
};