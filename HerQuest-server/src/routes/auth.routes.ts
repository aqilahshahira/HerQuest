import { Router, type Request, type Response } from "express";
import type { Session, User } from "@supabase/supabase-js";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { authService, userService } from "../services";

const router = Router();
const googleStateCookie = "herquest_google_oauth_state";
const googleOAuthError = "Could not complete Google login. Please try again.";
const loginCanceledMessage = "Login was canceled. Please try again.";

function getClientOrigin(): string {
    return process.env.CLIENT_URL?.split(",")[0]?.trim() || "http://localhost:3000";
}

function redirectToLogin(res: Response, message: string): void {
    const loginUrl = new URL("/login", getClientOrigin());
    loginUrl.searchParams.set("error", message);
    res.redirect(loginUrl.toString());
}

function getCookie(req: Request, name: string): string | null {
    const cookies = req.headers.cookie?.split(";") ?? [];
    for (const cookie of cookies) {
        const separator = cookie.indexOf("=");
        if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
        return cookie.slice(separator + 1).trim();
    }
    return null;
}

function clearGoogleStateCookie(res: Response): void {
    res.clearCookie(googleStateCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/google",
    });
}

function getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_CALLBACK_URL?.trim();

    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri };
}

router.get("/google", asyncHandler(async (_req, res) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
        console.error("[Google OAuth] Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.");
        redirectToLogin(res, googleOAuthError);
        return;
    }

    const state = randomBytes(32).toString("hex");
    const google = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);

    res.cookie(googleStateCookie, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
        path: "/api/auth/google",
    });
    res.redirect(google.generateAuthUrl({
        access_type: "online",
        prompt: "select_account",
        scope: ["openid", "email", "profile"],
        state,
    }));
}));

router.get("/google/callback", asyncHandler(async (req, res) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
        clearGoogleStateCookie(res);
        redirectToLogin(res, googleOAuthError);
        return;
    }

    const google = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
    const state = typeof req.query.state === "string" && req.query.state.length <= 128
        ? req.query.state
        : "";
    const savedState = getCookie(req, googleStateCookie);
    const stateMatches = state.length === savedState?.length &&
        savedState !== null &&
        timingSafeEqual(Buffer.from(state), Buffer.from(savedState));
    clearGoogleStateCookie(res);

    if (!stateMatches) {
        redirectToLogin(res, googleOAuthError);
        return;
    }

    if (req.query.error) {
        const message = req.query.error === "access_denied"
            ? loginCanceledMessage
            : googleOAuthError;
        redirectToLogin(res, message);
        return;
    }

    const code = typeof req.query.code === "string" && req.query.code.length <= 4096
        ? req.query.code
        : "";
    if (!code) {
        redirectToLogin(res, googleOAuthError);
        return;
    }

    let idToken: string;
    try {
        const { tokens } = await google.getToken(code);
        if (!tokens.id_token) throw new Error("Google did not return an ID token.");
        const ticket = await google.verifyIdToken({
            idToken: tokens.id_token,
            audience: config.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            throw new Error("Google returned an incomplete or unverified account.");
        }
        idToken = tokens.id_token;
    } catch (error) {
        console.error("[Google OAuth] Google token exchange or verification failed.", error);
        redirectToLogin(res, googleOAuthError);
        return;
    }

    let user: User;
    let session: Session;
    try {
        const result = await authService.signInWithGoogleIdToken(idToken);
        if (result.error || !result.data.user || !result.data.session) {
            console.error("[Google OAuth] Supabase sign-in failed.", result.error?.message ?? "No session returned.");
            redirectToLogin(res, googleOAuthError);
            return;
        }
        user = result.data.user;
        session = result.data.session;
    } catch (error) {
        console.error("[Google OAuth] Supabase sign-in request failed.", error);
        redirectToLogin(res, googleOAuthError);
        return;
    }

    try {
        const { error: profileError } = await authService.upsertProfile({
            id: user.id,
            full_name: user.user_metadata.full_name ??
                user.user_metadata.name ?? "HerQuest Member",
            email: user.email ?? null,
        });
        if (profileError) {
            console.error("[Google OAuth] User profile setup failed.", profileError.message);
            redirectToLogin(res, googleOAuthError);
            return;
        }
    } catch (error) {
        console.error("[Google OAuth] User profile setup request failed.", error);
        redirectToLogin(res, googleOAuthError);
        return;
    }

    const loginUrl = new URL("/login", getClientOrigin());
    loginUrl.hash = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    }).toString();
    res.redirect(loginUrl.toString());
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