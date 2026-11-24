import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { textField } from "../utils/input";
import { conversationService } from "../services";

const router = Router();

async function getAuthorizedConversation(applicationId: string, userId: string) {
    const { data: application, error } = await conversationService.getApplication(applicationId);
    if (error) throw new HttpError(503, "Unable to load the application.");
    if (!application) throw new HttpError(404, "Application not found.");

    const questData = application.quests as unknown;
    const quest = Array.isArray(questData)
        ? questData[0] as { owner_id: string } | undefined
        : questData as { owner_id: string } | null;
    if (!quest || (application.applicant_id !== userId && quest.owner_id !== userId)) {
        throw new HttpError(403, "You are not a member of this conversation.");
    }

    const result = await conversationService.ensureConversation(
        application.id,
        application.quest_id,
        quest.owner_id,
        application.applicant_id,
    );
    if (result.error || !result.data) {
        throw new HttpError(503, "Unable to open the conversation.");
    }
    return result.data;
}

router.get("/:applicationId", isAuthenticated, asyncHandler(async (req, res) => {
    const applicationId = textField(req.params.applicationId, "applicationId", true, 36);
    const conversation = await getAuthorizedConversation(applicationId, req.auth!.userId);
    const { data: messages, error } = await conversationService.listMessages(conversation.id);
    if (error) throw new HttpError(503, "Unable to load messages.");
    const { error: readError } =
        await conversationService.markRead(conversation.id, req.auth!.userId);
    if (readError) throw new HttpError(503, "Unable to mark messages as read.");
    res.json({ success: true, data: { conversation, messages: messages ?? [] } });
}));

router.post("/:applicationId/messages", isAuthenticated, asyncHandler(async (req, res) => {
    const applicationId = textField(req.params.applicationId, "applicationId", true, 36);
    const conversation = await getAuthorizedConversation(applicationId, req.auth!.userId);
    const content = typeof req.body?.content === "string"
        ? req.body.content.trim()
        : "";
    if (!content) throw new HttpError(400, "Message content is required.");
    if (content.length > 5000) throw new HttpError(400, "Message is too long.");

    const { data, error } = await conversationService.sendMessage(
        conversation.id,
        req.auth!.userId,
        content,
    );
    if (error) throw new HttpError(400, "Unable to send the message.");
    res.status(201).json({ success: true, data });
}));

router.patch("/:applicationId/read", isAuthenticated, asyncHandler(async (req, res) => {
    const applicationId = textField(req.params.applicationId, "applicationId", true, 36);
    const conversation = await getAuthorizedConversation(applicationId, req.auth!.userId);
    const { error } = await conversationService.markRead(conversation.id, req.auth!.userId);
    if (error) throw new HttpError(503, "Unable to mark messages as read.");
    res.json({ success: true, data: { conversationId: conversation.id } });
}));

export default router;
