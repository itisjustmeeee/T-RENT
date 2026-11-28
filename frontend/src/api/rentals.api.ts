import { api } from "./axios";

import type {
    Rental,
    Category,
} from "../types/rental.types";

export interface RentalFilters {
    category_id?: number;
    search?: string;

    min_price?: number;
    max_price?: number;
    min_area?: number;
    min_guests?: number;

    availability?: "FREE" | "BUSY" | "TEMP_CLOSED";

    sort_by?: "newest" | "price_asc" | "price_desc";

    skip?: number;
    take?: number;
}

export interface RentalListResponse {
    items: Rental[];
    total: number;
    skip: number;
    take: number;
}

export interface CreateRentalPayload {
    title: string;
    address: string;
    area: number;
    price: number;
    time_measurement: "HOUR" | "DAY" | "MONTH";
    category_id?: number;
    desc: string;
    amount_of_people: number;
    photo_url?: string;
    availability: string;
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
    const response = await api.get<Rental>(
        `/rentals/${rentalId}`
    );

    return response.data;
}

export async function getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>("/categories");

    return response.data;
}

export const getMyRentals = async (): Promise<Rental[]> => {
    const response = await api.get("/users/me/rentals");
    return response.data;
};

export const createRental = async (
    data: CreateRentalPayload
): Promise<Rental> => {
    const response = await api.post("/rentals", data);
    return response.data;
};

export const deleteRental = async (
    rentalId: number
): Promise<void> => {
    await api.delete(`/rentals/${rentalId}`);
};