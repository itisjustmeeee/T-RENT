import { api } from "./axios";

export type UserRole = "RENTER" | "LESSRE";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    surname?: string;
    patronymic?: string;
    phone_number?: string;
    role: UserRole;
}

export interface AuthResponse {
    user: {
        user_id: number;
        role: UserRole;
        name: string;
        surname?: string | null;
        email: string;
    };

    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export const login = async (
    data: LoginRequest
): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
        "/auth/login",
        data
    );

    localStorage.setItem(
        "access_token",
        response.data.access_token
    );

    localStorage.setItem(
        "refresh_token",
        response.data.refresh_token
    );

    return response.data;
};

export const register = async (
    data: RegisterRequest
): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
        "/auth/register",
        data
    );

    localStorage.setItem(
        "access_token",
        response.data.access_token
    );

    localStorage.setItem(
        "refresh_token",
        response.data.refresh_token
    );

    return response.data;
};