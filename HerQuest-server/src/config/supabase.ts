import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

function getSupabaseUrl(): string {
    const url = process.env.SUPABASE_URL?.trim()
        || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!url || url.includes("your-project-ref")) {
        throw new Error("Set SUPABASE_URL.");
    }
    return url;
}

function getSupabasePublicKey(): string {
    const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
        || process.env.SUPABASE_ANON_KEY?.trim()
        || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!publicKey || publicKey.includes("replace_with")) {
        throw new Error("Set SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY.");
    }
    return publicKey;
}

function getSupabaseSecretKey(): string {
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
    if (!secretKey || secretKey.includes("replace_with")) {
        throw new Error("Set SUPABASE_SECRET_KEY.");
    }
    return secretKey;
}

export function getSupabase(): SupabaseClient {
    if (!publicClient) {
        publicClient = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
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
        adminClient = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });
    }
    return adminClient;
}
