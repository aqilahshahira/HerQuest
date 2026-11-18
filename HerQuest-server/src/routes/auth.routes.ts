import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { authService, userService } from "../services";

const router = Router();
function getClientOrigin(): string {
    return process.env.CLIENT_URL?.split(",")[0]?.trim() || "http://localhost:3000";
}

router.get("/google", asyncHandler(async (_req, res) => {
    const redirectTo = new URL("/login", getClientOrigin()).toString();
    const { data, error } = await authService.signInWithGoogle(redirectTo);
    if (error || !data.url) {
        console.error("[Google OAuth] Supabase OAuth request failed.", error?.message);
        throw new HttpError(503, "Google login is unavailable. Please try again.");
    }
    res.redirect(data.url);
}));

router.post("/signup", asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const fullName = textField(body.fullName ?? body.name, "fullName", true, 150);
    const email = textField(body.email, "email", true, 255).toLowerCase();
    const password = textField(body.password, "password", true, 128);
    const phoneNumber = textField(body.phoneNumber, "phoneNumber", false, 20);
    const state = textField(body.state, "state", false, 50);

    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");

    const { data, error } = await authService.signUp(email, password, fullName);
    if (error) throw new HttpError(error.status && error.status < 500 ? 400 : 503, error.message);
    if (!data.user) throw new HttpError(400, "Unable to create the account.");

    const { error: profileError } = await authService.upsertProfile({
        id: data.user.id,
        full_name: fullName,
        email,
        phone_number: phoneNumber || null,
        state: state || null,
    });

    if (profileError) throw new HttpError(503, "Account created but profile setup failed.");

    res.status(201).json({
        success: true,
        data: {
            user: data.user,
            session: data.session,
        },
    });
}));

router.post("/login", asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const email = textField(body.email, "email", true, 255).toLowerCase();
    const password = textField(body.password, "password", true, 128);

    const { data, error } = await authService.signIn(email, password);
    if (error) throw new HttpError(401, "Email or password is incorrect.");

    res.json({
        success: true,
        data: {
            user: data.user,
            session: data.session,
            accessToken: data.session?.access_token,
        },
    });
}));

router.post("/logout", isAuthenticated, asyncHandler(async (req, res) => {
    res.json({ success: true, message: "Logged out successfully." });
}));

router.get("/me", isAuthenticated, asyncHandler(async (req, res) => {
    const { data, error } = await userService.getById(req.auth!.userId);
    if (error) throw new HttpError(503, "Unable to load the user profile.");
    res.json({ success: true, data });
}));

router.patch("/me", isAuthenticated, asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const allowedFields = [
        "full_name", "phone_number", "role", "profile_avatar_url", "bio",
        "state", "city", "latitude", "longitude", "whatsapp_alerts_enabled",
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) update[field] = body[field];
    }

    const { data, error } = await userService.update(req.auth!.userId, update);
    if (error) throw new HttpError(400, "Unable to update the user profile.");
    res.json({ success: true, data });
}));

export default router;