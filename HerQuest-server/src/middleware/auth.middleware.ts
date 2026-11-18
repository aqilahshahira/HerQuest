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

    const { data: profile, error: profileError } = await getSupabaseAdmin()
        .from("users")
        .select("id, email, role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profileError) throw new HttpError(503, "Unable to load the user profile.");
    if (!profile) throw new HttpError(403, "User profile not found.");

    req.auth = {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
    };
    next();
});
