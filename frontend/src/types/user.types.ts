export type UserRole = "RENTER" | "LESSER";

export interface User {
    id: number;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    avatar?: string;
    rating?: number;
}