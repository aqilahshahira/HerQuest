import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { authService } from "../services";
import * as usersController from "../controllers/users.controller";

const router = Router();
function getClientOrigin(): string {
    const origins = process.env.CLIENT_URL?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
    if (process.env.NODE_ENV === "production") {
        const productionOrigin = origins.find((origin) => origin.startsWith("https://"));
        if (productionOrigin) return productionOrigin;
        throw new HttpError(503, "Set CLIENT_URL to the deployed HTTPS application URL.");
    }
    return origins[0] || "http://localhost:3000";
}

router.get("/google", asyncHandler(async (_req, res) => {
    const loginUrl = new URL("/login", getClientOrigin());
    loginUrl.searchParams.set("provider", "google");
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

router.get("/me", isAuthenticated, usersController.profile);
router.patch("/me", isAuthenticated, usersController.updateProfile);

export default router;