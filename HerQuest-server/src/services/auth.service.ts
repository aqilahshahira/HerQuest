import { getSupabase, getSupabaseAdmin } from "../config/supabase";

export const authService = {
    async signInWithGoogleIdToken(idToken: string) {
        return getSupabase().auth.signInWithIdToken({
            provider: "google",
            token: idToken,
        });
    },

    async signUp(email: string, password: string, fullName: string) {
        return getSupabase().auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
    },

    async signIn(email: string, password: string) {
        return getSupabase().auth.signInWithPassword({ email, password });
    },

    async upsertProfile(profile: Record<string, unknown>) {
        return getSupabaseAdmin().from("users").upsert(profile, { onConflict: "id" });
    },
};
