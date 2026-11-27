export interface BlacklistRenter {
    user_id: number;
    name: string;
    surname?: string | null;
    email?: string;
}

export interface BlacklistItem {
    black_list_id: number;
    lesser_id: number;
    renter_id: number;
    is_closed: boolean;
    created_at: string;
    fine_id: number | null;
    renter: BlacklistRenter | null;
}

export interface BlacklistCreate {
    renter_id: number;
    fine_id?: number | null;
}