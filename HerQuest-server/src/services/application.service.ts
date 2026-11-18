import { getSupabaseAdmin } from "../config/supabase";
import type { Application } from "../types";

export const applicationService = {
    async create(application: {
        quest_id: string;
        applicant_id: string;
        proposed_rate: unknown;
        cover_note: string;
    }) {
        return getSupabaseAdmin()
            .from("applications")
            .insert(application)
            .select("*")
            .single();
    },

    async listMine(applicantId: string) {
        return getSupabaseAdmin()
            .from("applications")
            .select("*, quests(*)")
            .eq("applicant_id", applicantId)
            .order("applied_at", { ascending: false });
    },

    async getById(applicationId: string) {
        return getSupabaseAdmin()
            .from("applications")
            .select("id, quest_id")
            .eq("id", applicationId)
            .maybeSingle();
    },

    async updateStatus(applicationId: string, status: string) {
        return getSupabaseAdmin()
            .from("applications")
            .update({ status })
            .eq("id", applicationId)
            .select("*")
            .single();
    },
};
