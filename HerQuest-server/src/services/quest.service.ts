import { getSupabaseAdmin } from "../config/supabase";
import type { CreateQuestInput, Quest, QuestDirectoryItem } from "../types";

export const questService = {
    async listOpen(category?: string, state?: string) {
        let query = getSupabaseAdmin()
            .from("quest_directory")
            .select("*")
            .eq("status", "open")
            .order("created_at", { ascending: false });

        if (category) query = query.eq("category", category);
        if (state) query = query.eq("state", state);
        return query;
    },

    async getById(questId: string) {
        return getSupabaseAdmin()
            .from("quest_directory")
            .select("*")
            .eq("id", questId)
            .maybeSingle();
    },

    async create(ownerId: string, input: CreateQuestInput) {
        return getSupabaseAdmin()
            .from("quests")
            .insert({ owner_id: ownerId, ...input })
            .select("*")
            .single();
    },

    async update(questId: string, update: Partial<Quest>) {
        return getSupabaseAdmin()
            .from("quests")
            .update(update)
            .eq("id", questId)
            .select("*")
            .single();
    },

    async getOwnerId(questId: string) {
        return getSupabaseAdmin()
            .from("quests")
            .select("owner_id")
            .eq("id", questId)
            .maybeSingle();
    },
};
