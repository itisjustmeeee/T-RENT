import type { AuthUser } from "./auth.types";

export type UserRole = string;

export type UserPublic = AuthUser;

export type UserUpdate = Partial<
    Pick<
        AuthUser,
        | "name"
        | "surname"
        | "patronymic"
        | "phone_number"
        | "email"
    >
>;

export interface MessageResponse {
  message: string;
}