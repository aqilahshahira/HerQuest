import { getSupabaseAdmin } from "../config/supabase";

export const conversationService = {
    async getApplication(applicationId: string) {
        return getSupabaseAdmin()
            .from("applications")
            .select("id, quest_id, applicant_id, quests(owner_id)")
            .eq("id", applicationId)
            .maybeSingle();
    },

    async ensureConversation(applicationId: string, questId: string, ownerId: string, applicantId: string) {
        const existing = await getSupabaseAdmin()
            .from("conversations")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle();
        if (existing.error) return existing;
        if (existing.data) return existing;

        return getSupabaseAdmin()
            .from("conversations")
            .insert({
                application_id: applicationId,
                quest_id: questId,
                owner_id: ownerId,
                applicant_id: applicantId,
            })
            .select("*")
            .single();
    },

    async listMessages(conversationId: string) {
        return getSupabaseAdmin()
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
    },

    async sendMessage(conversationId: string, senderId: string, content: string) {
        const sent = await getSupabaseAdmin()
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content,
            })
            .select("*")
            .single();
        if (sent.error) return sent;

        await getSupabaseAdmin()
            .from("conversations")
            .update({ last_message_at: sent.data.created_at })
            .eq("id", conversationId);
        return sent;
    },

    async markRead(conversationId: string, readerId: string) {
        return getSupabaseAdmin()
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", readerId);
    },
};
