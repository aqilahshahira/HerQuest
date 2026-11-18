import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

function getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.trim();
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!url || url.includes("your-project-ref")) {
        throw new Error("Set SUPABASE_URL.");
    }
    if (!secretKey || secretKey.includes("replace_with")) {
        throw new Error("Set SUPABASE_SECRET_KEY.");
    }

    return { url, secretKey, anonKey };
}

export function getSupabase(): SupabaseClient {
    if (!publicClient) {
        const { url, secretKey, anonKey } = getSupabaseConfig();
        publicClient = createClient(url, anonKey || secretKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });
    }
    return publicClient;
}

export function getSupabaseAdmin(): SupabaseClient {
    if (!adminClient) {
        const { url, secretKey } = getSupabaseConfig();
        adminClient = createClient(url, secretKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });
    }
    return adminClient;
}
