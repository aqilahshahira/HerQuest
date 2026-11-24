export type UserRole = "applicant" | "owner" | "both";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type JobCategory =
    | "Post-Partum Cook"
    | "One-Time Driver"
    | "Chef"
    | "Poster Designer"
    | "Event Crew"
    | "Technician"
    | "Caretaker"
    | "Tutor"
    | "Remote Admin"
    | "Other";
export type QuestFrequency = "one_time" | "recurring" | "flexible";
export type QuestStatus = "open" | "in_progress" | "completed" | "cancelled";
export type ApplicationStatus = "pending" | "interviewing" | "hired" | "declined" | "withdrawn";
export type NotificationStatus = "queued" | "sent" | "delivered" | "failed";

export interface UserProfile {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    role: UserRole;
    mykad_verified: VerificationStatus;
    mykad_hash: string | null;
    profile_avatar_url: string | null;
    bio: string | null;
    state: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    whatsapp_alerts_enabled: boolean;
    rating_avg: number;
    completed_quests_count: number;
    created_at: string;
    updated_at: string;
}

export interface Quest {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    category: JobCategory;
    frequency: QuestFrequency;
    payout_amount: number;
    payout_unit: string;
    is_urgent: boolean;
    is_wfh: boolean;
    state: string;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    is_food_related: boolean;
    status: QuestStatus;
    scheduled_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface QuestDirectoryItem {
    id: string;
    title: string;
    description: string;
    category: JobCategory;
    type: JobCategory;
    frequency: QuestFrequency;
    price: number;
    unit: string;
    urgent: boolean;
    is_wfh: boolean;
    state: string;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    is_food_related: boolean;
    status: QuestStatus;
    scheduled_date: string | null;
    created_at: string;
    owner_name: string;
    dietary: string[];
}

export interface Application {
    id: string;
    quest_id: string;
    applicant_id: string;
    status: ApplicationStatus;
    proposed_rate: number | null;
    cover_note: string | null;
    applied_at: string;
    updated_at: string;
    quests?: Quest;
}

export interface Conversation {
    id: string;
    application_id: string;
    quest_id: string;
    owner_id: string;
    applicant_id: string;
    last_message_at: string;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}
