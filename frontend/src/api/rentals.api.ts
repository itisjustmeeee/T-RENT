import { api } from "./axios";
import type { Rental, TimeMeasurement, RentalAvailability } from "../types/rental.types";

export interface RentalCreateRequest {
    title: string;
    address: string;
    area: number;
    price: number;
    time_measurement: TimeMeasurement;
    category_id?: number | null;
    desc?: string | null;
    amount_of_people: number;
    photo_url?: string | null;
    availability?: RentalAvailability;
}

export const getRentals = async(): Promise<Rental[]> => {
    const response = await api.get<Rental[]>("/rentals");
    return response.data;
};

export const getRentalById = async (
    id: number
): Promise<Rental> => {
    const response = await api.get<Rental>(`/rentals/${id}`);
    return response.data;
};

export const createRental = async (
    data: RentalCreateRequest
): Promise<Rental> => {
    const response = await api.post<Rental>("/rentals", data);
    return response.data;
};

export const getCategories = async () => {
    const response = await api.get('/categories');
    return response.data;
};

