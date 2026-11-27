export type UserRole = "RENTER" | "LESSER";

export interface AuthUser {
    user_id: number;
    email: string;
    name: string;
    surname?: string | null;
    patronymic?: string | null;
    phone_number?: string | null;
    role: UserRole;
    is_verified?: boolean;
    is_blocked?: boolean;
}

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
    user: AuthUser;
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface MessageResponse {
    message: string;
}