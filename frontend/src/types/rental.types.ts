export type TimeMeasurement = "HOUR" | "DAY" | "MONTH";

export type RentalAvailability =
    | "FREE"
    | "BUSY"
    | "TEMP_CLOSED";

export interface Category {
    category_id: number;
    name: string;
    desc?: string | null;
}

export interface RentalPhoto {
    photo_id: number;
    url: string;
    sort_order: number;
}

export interface Rental {
    rental_id: number;
    owner_id: number;
    category_id: number | null;

    title: string;
    address: string;

    area: number | string;
    price: number | string;

    time_measurement: TimeMeasurement;

    photo_url: string | null;
    availability: RentalAvailability;

    desc: string | null;
    amount_of_people: number;

    created_at: string;
    updated_at: string;

    category?: Category | null;
    photos?: RentalPhoto[];

    avg_rating?: number | null;
    reviews_count?: number;
}

export interface RentalListResponse {
    items: Rental[];
    total: number;
    skip: number;
    take: number;
}