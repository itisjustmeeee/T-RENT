import { api } from "./axios";
import type { Rental } from "../types/rental.types";

export const getFavorites = async (): Promise<Rental[]> => {
    const response = await api.get<Rental[]>("/favorites");
    return response.data;
};

export const addFavorite = async (rentalId: number) => {
    const response = await api.post("/favorites", {
        rental_id: rentalId,
    });

    return response.data;
};

export const removeFavorite = async (rentalId: number) => {
    const response = await api.delete(
        `/favorites/${rentalId}`
    );

    return response.data;
};