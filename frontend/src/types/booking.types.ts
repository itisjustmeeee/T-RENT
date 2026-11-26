export type BookingStatus =
    | "OPEN"
    | "CONFIRMED"
    | "CLOSED"
    | "CANCELLED";

export interface Booking {
    booking_id: number;

    owner_id: number;
    booker_id: number;
    rental_id: number;

    start_date: string;
    end_date: string;

    status: BookingStatus;

    total_price: number | string;
    deposit_amount?: number | string | null;

    guests_count: number;
    comment?: string | null;

    created_at: string;
    updated_at: string;
}