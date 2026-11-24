import type { RequestHandler } from "express";
import { getSupabase, getSupabaseAdmin } from "../config/supabase";
import HttpError from "../utils/httpError";
import asyncHandler from "../utils/asyncHandler";

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                email: string;
                role: string;
            };
        }
    }
}

export const isAuthenticated: RequestHandler = asyncHandler(async (req, _res, next) => {
    const match = req.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new HttpError(401, "Login is required.");

    const db = getSupabase();
    const { data, error } = await db.auth.getUser(match[1]);
    if (error || !data.user) throw new HttpError(401, "Login has expired or is invalid.");

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingProfile, error: profileError } = await supabaseAdmin
        .from("users")
        .select("id, email, role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profileError) throw new HttpError(503, "Unable to load the user profile.");
    let profile = existingProfile;
    if (!profile) {
        const metadata = data.user.user_metadata;
        const fullName =
            typeof metadata.full_name === "string" && metadata.full_name.trim()
                ? metadata.full_name.trim()
                : typeof metadata.name === "string" && metadata.name.trim()
                    ? metadata.name.trim()
                    : "HerQuest Member";
        const { data: createdProfile, error: createError } = await supabaseAdmin
            .from("users")
            .upsert({
                id: data.user.id,
                email: data.user.email ?? null,
                full_name: fullName,
            }, { onConflict: "id" })
            .select("id, email, role")
            .single();
        if (createError) throw new HttpError(503, "Unable to create the user profile.");
        profile = createdProfile;
    }

    req.auth = {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
    };
    next();
});
