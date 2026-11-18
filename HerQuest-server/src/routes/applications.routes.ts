import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { applicationService, questService } from "../services";

const router = Router();

router.post("/", isAuthenticated, asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const questId = textField(body.questId ?? body.quest_id, "questId", true, 36);

    const { data, error } = await applicationService.create({
        quest_id: questId,
        applicant_id: req.auth!.userId,
        proposed_rate: body.proposed_rate,
        cover_note: textField(body.coverNote ?? body.cover_note, "coverNote", false, 5000),
    });
    if (error) throw new HttpError(400, "Unable to submit the application.");
    res.status(201).json({ success: true, data });
}));

router.get("/mine", isAuthenticated, asyncHandler(async (req, res) => {
    const { data, error } = await applicationService.listMine(req.auth!.userId);
    if (error) throw new HttpError(503, "Unable to load applications.");
    res.json({ success: true, data });
}));

router.patch("/:id/status", isAuthenticated, asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const status = textField(body.status, "status", true, 30);

    const applicationId = textField(req.params.id, "id", true, 36);
    const { data: application, error: applicationError } =
        await applicationService.getById(applicationId);
    if (applicationError) throw new HttpError(503, "Unable to load the application.");
    if (!application) throw new HttpError(404, "Application not found.");

    const { data: quest, error: questError } =
        await questService.getOwnerId(application.quest_id);
    if (questError) throw new HttpError(503, "Unable to verify quest ownership.");
    if (!quest || quest.owner_id !== req.auth!.userId) {
        throw new HttpError(403, "Only the quest owner can change application status.");
    }

    const { data, error } = await applicationService.updateStatus(applicationId, status);
    if (error) throw new HttpError(400, "Unable to update the application.");
    res.json({ success: true, data });
}));

export default router;
