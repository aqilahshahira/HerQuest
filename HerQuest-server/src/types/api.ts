export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        message: string;
    };
}

export interface CreateQuestInput {
    title: string;
    description: string;
    category: string;
    frequency: string;
    payout_amount: number;
    payout_unit: string;
    is_urgent: boolean;
    is_wfh: boolean;
    state: string;
    location_name: string;
    is_food_related: boolean;
}
