export type BookingStatus =
    | "OPEN"
    | "CONFIRMED"
    | "CLOSED"
    | "CANCELLED";

export interface BookingCreate {
    rental_id: number;
    start_date: string;
    end_date: string;
    guests_count: number;
    comment?: string;
}

export interface BookingUser {
    user_id: number;
    name: string;
    surname?: string | null;
    email: string;
    phone_number?: string | null;
}

export interface BookingRental {
    rental_id: number;
    title: string;
    address: string;
    price: number | string;
    time_measurement: "HOUR" | "DAY" | "MONTH";
    photo_url?: string | null;
    amount_of_people: number;
}

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

    rental?: BookingRental | null;
    owner?: BookingUser | null;
    booker?: BookingUser | null;
}