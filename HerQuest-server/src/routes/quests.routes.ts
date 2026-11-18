import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { questService } from "../services";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
    const category = textField(req.query.category, "category", false, 100);
    const state = textField(req.query.state, "state", false, 50);
    const { data, error } = await questService.listOpen(category, state);
    if (error) throw new HttpError(503, "Unable to load quests.");
    res.json({ success: true, data });
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const questId = textField(req.params.id, "id", true, 36);
    const { data, error } = await questService.getById(questId);
    if (error) throw new HttpError(503, "Unable to load the quest.");
    if (!data) throw new HttpError(404, "Quest not found.");
    res.json({ success: true, data });
}));

router.post("/", isAuthenticated, asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const quest = {
        owner_id: req.auth!.userId,
        title: textField(body.title, "title", true, 200),
        description: textField(body.description, "description", true, 5000),
        category: textField(body.category, "category", true, 100),
        frequency: textField(body.frequency, "frequency", false, 30) || "one_time",
        payout_amount: body.payout_amount,
        payout_unit: textField(body.payout_unit, "payout_unit", false, 30) || "per quest",
        is_urgent: Boolean(body.is_urgent),
        is_wfh: Boolean(body.is_wfh),
        state: textField(body.state, "state", true, 50),
        location_name: textField(body.location_name, "location_name", false, 150),
        is_food_related: Boolean(body.is_food_related),
    };

    if (typeof quest.payout_amount !== "number" || quest.payout_amount < 0) {
        throw new HttpError(400, "payout_amount must be a positive number.");
    }

    const { data, error } = await questService.create(req.auth!.userId, {
        title: quest.title,
        description: quest.description,
        category: quest.category,
        frequency: quest.frequency,
        payout_amount: quest.payout_amount as number,
        payout_unit: quest.payout_unit,
        is_urgent: quest.is_urgent,
        is_wfh: quest.is_wfh,
        state: quest.state,
        location_name: quest.location_name,
        is_food_related: quest.is_food_related,
    });
    if (error) throw new HttpError(400, "Unable to create the quest.");
    res.status(201).json({ success: true, data });
}));

router.patch("/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const { data: existing, error: existingError } =
        await questService.getOwnerId(textField(req.params.id, "id", true, 36));
    if (existingError) throw new HttpError(503, "Unable to load the quest.");
    if (!existing) throw new HttpError(404, "Quest not found.");
    if (existing.owner_id !== req.auth!.userId) {
        throw new HttpError(403, "You can only update your own quests.");
    }

    const allowed = [
        "title", "description", "category", "frequency", "payout_amount",
        "payout_unit", "is_urgent", "is_wfh", "state", "location_name",
        "is_food_related", "status", "scheduled_date",
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowed) {
        if (body[field] !== undefined) update[field] = body[field];
    }

    const { data, error } = await questService.update(
        textField(req.params.id, "id", true, 36),
        update,
    );
    if (error) throw new HttpError(400, "Unable to update the quest.");
    res.json({ success: true, data });
}));

export default router;
