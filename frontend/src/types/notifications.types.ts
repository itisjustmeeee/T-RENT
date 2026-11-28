export type NotificationStatus = "INFO" | "SUCCESS";

export interface Notification {
    notification_id: number;
    owner_id: number;
    status: NotificationStatus;
    comment: string;
    is_read: boolean;
    created_at: string;
}