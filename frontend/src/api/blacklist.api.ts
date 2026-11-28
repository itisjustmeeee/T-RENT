import { api } from "./axios";

import type {
    BlacklistItem,
    BlacklistCreate,
} from "../types/blacklist.types";

import type {
    MessageResponse,
} from "../types/auth.types";

export const getBlacklist = async (): Promise<BlacklistItem[]> => {
    const response = await api.get<BlacklistItem[]>(
        "/users/me/blacklist"
    );

    return response.data;
};

export const addToBlacklist = async (
    data: BlacklistCreate
): Promise<BlacklistItem> => {
    const response = await api.post<BlacklistItem>(
        "/users/me/blacklist",
        data
    );

    return response.data;
};

export const removeFromBlacklist = async (
    renterId: number
): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(
        `/users/me/blacklist/${renterId}`
    );

    return response.data;
};