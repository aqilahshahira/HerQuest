import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { applicationService, questService } from "../services";

export const create = asyncHandler(async (req, res) => {
    const body = objectBody(req.body);
    const questId = textField(body.questId ?? body.quest_id, "questId", true, 36);
    const { data, error } = await applicationService.create({
        quest_id: questId,
        applicant_id: req.auth!.userId,
        proposed_rate: body.proposed_rate,
        cover_note: textField(body.coverNote ?? body.cover_note, "coverNote", false, 5000),
    });

    if (error?.code === "23505") {
        const existing = await applicationService.findMineForQuest(req.auth!.userId, questId);
        if (existing.error) throw new HttpError(503, "Unable to load the existing application.");
        res.json({ success: true, data: existing.data });
        return;
    }
    if (error) throw new HttpError(400, "Unable to submit the application.");
    res.status(201).json({ success: true, data });
});

export const listMine = asyncHandler(async (req, res) => {
    const { data, error } = await applicationService.listMine(req.auth!.userId);
    if (error) throw new HttpError(503, "Unable to load applications.");
    res.json({ success: true, data });
});

export const updateStatus = asyncHandler(async (req, res) => {
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
});