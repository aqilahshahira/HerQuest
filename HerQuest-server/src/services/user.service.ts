import { getSupabaseAdmin } from "../config/supabase";
import type { UserProfile } from "../types";

export const userService = {
    async getById(userId: string) {
        return getSupabaseAdmin()
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
    },

    async update(userId: string, update: Partial<UserProfile>) {
        return getSupabaseAdmin()
            .from("users")
            .update(update)
            .eq("id", userId)
            .select("*")
            .single();
    },

    async completeOnboarding(
        userId: string,
        profile: Pick<
            UserProfile,
            "full_name" | "phone_number" | "mykad_hash" | "mykad_verified" | "mykad_consent_at"
        >,
    ) {
        return getSupabaseAdmin()
            .from("users")
            .update(profile)
            .eq("id", userId)
            .is("mykad_hash", null)
            .select("*")
            .single();
    },
};
