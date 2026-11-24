import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody } from "../utils/input";
import { userService } from "../services";

export const profile = asyncHandler(async (req, res) => {
  const { data, error } = await userService.getById(
    (req as typeof req & { auth: { userId: string } }).auth.userId,
  );
  if (error) throw new HttpError(503, "Unable to load the user profile.");
  res.json({ success: true, data });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const body = objectBody(req.body);
  const allowedFields = [
    "full_name", "phone_number", "role", "profile_avatar_url", "bio",
    "state", "city", "latitude", "longitude", "whatsapp_alerts_enabled",
  ];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const { data, error } = await userService.update(
    (req as typeof req & { auth: { userId: string } }).auth.userId,
    update,
  );
  if (error) throw new HttpError(400, "Unable to update the user profile.");
  res.json({ success: true, data });
});