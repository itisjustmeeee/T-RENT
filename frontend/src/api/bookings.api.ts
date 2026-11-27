import { api } from "./axios";

import type {
    Booking,
    BookingCreate,
    BookingStatus,
} from "../types/booking.types";

export interface BookingUpdate {
    start_date?: string;
    end_date?: string;
    guests_count?: number;
    comment?: string;
}

export async function createBooking(
    data: BookingCreate
): Promise<Booking> {
    const response = await api.post<Booking>(
        "/bookings",
        data
    );

    return response.data;
}

export async function getMyBookings(): Promise<Booking[]> {
    const response = await api.get<Booking[]>(
        "/users/me/bookings"
    );

    return response.data;
}

export async function confirmBooking(
    bookingId: number
): Promise<Booking> {
    const response = await api.patch<Booking>(
        `/bookings/${bookingId}/confirm`
    );

    return response.data;
}

export async function updateBookingStatus(
    bookingId: number,
    status: BookingStatus
): Promise<Booking> {
    const response = await api.patch<Booking>(
        `/bookings/${bookingId}/status`,
        { status }
    );

    return response.data;
}

export async function editBooking(
    bookingId: number,
    data: BookingUpdate
): Promise<Booking> {
    const response = await api.patch<Booking>(
        `/bookings/${bookingId}`,
        data
    );

    return response.data;
}