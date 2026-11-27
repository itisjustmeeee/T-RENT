import { api } from "./axios";

import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    MessageResponse,
    AuthUser,
} from "../types/auth.types";

export async function registerUser(
    data: RegisterRequest
): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
        "/auth/register",
        data
    );

    return response.data;
}

export async function loginUser(
    data: LoginRequest
): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
        "/auth/login",
        data
    );

    return response.data;
}

export async function refreshTokens(
    refreshToken: string
): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>(
        "/auth/refresh",
        null,
        {
            params: {
                refresh_token: refreshToken,
            },
        }
    );

    return response.data;
}

export async function logoutUser(
    refreshToken: string
): Promise<MessageResponse> {
    const response = await api.delete<MessageResponse>(
        "/auth/logout",
        {
            params: {
                refresh_token: refreshToken,
            },
        }
    );

    return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<AuthUser>("/users/me");

    return response.data;
}