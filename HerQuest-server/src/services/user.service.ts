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
};
