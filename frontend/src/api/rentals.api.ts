import { api } from "./axios";
import type { Rental, RentalListResponse, Category } from "../types/rental.types";

export interface RentalFilters {
    category_id?: number;

    search?: string;
    city?: string;

    min_price?: number;
    max_price?: number;
    min_area?: number;
    min_guests?: number;

    start_at?: string;
    end_at?: string;

    availability?: "FREE" | "BUSY" | "TEMP_CLOSED";

    sort_by?: "newest" | "price_asc" | "price_desc";

    skip?: number;
    take?: number;
}

export async function getRentals(
    filters: RentalFilters = {}
): Promise<RentalListResponse> {
    const response = await api.get<RentalListResponse>("/rentals", {
        params: filters,
    });

    return response.data;
}

export async function getRentalById(
    rentalId: number
): Promise<Rental> {
    const response = await api.get<Rental>(`/rentals/${rentalId}`);

    return response.data;
}

export async function getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>("/categories");

    return response.data;
}
