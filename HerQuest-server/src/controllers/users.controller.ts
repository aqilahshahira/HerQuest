import { createHmac } from "node:crypto";
import asyncHandler from "../utils/asyncHandler";
import HttpError from "../utils/httpError";
import { objectBody, textField } from "../utils/input";
import { isMyKadEligible, normalizeMyKad } from "../utils/mykad";
import { userService } from "../services";

const MYKAD_REJECTION_MESSAGE =
  "Sign-up could not be completed. Please contact customer service for assistance.";

function profileResponse(profile: {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  mykad_verified: string;
  mykad_hash: string | null;
  profile_avatar_url: string | null;
  bio: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp_alerts_enabled: boolean;
  rating_avg: number;
  completed_quests_count: number;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone_number: profile.phone_number,
    role: profile.role,
    mykad_verified: profile.mykad_verified,
    profile_avatar_url: profile.profile_avatar_url,
    bio: profile.bio,
    state: profile.state,
    city: profile.city,
    latitude: profile.latitude,
    longitude: profile.longitude,
    whatsapp_alerts_enabled: profile.whatsapp_alerts_enabled,
    rating_avg: profile.rating_avg,
    completed_quests_count: profile.completed_quests_count,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    profileComplete: Boolean(
      profile.full_name.trim()
      && profile.phone_number
      && profile.mykad_hash
      && profile.mykad_verified !== "rejected",
    ),
  };
}

export const profile = asyncHandler(async (req, res) => {
  const { data, error } = await userService.getById(
    (req as typeof req & { auth: { userId: string } }).auth.userId,
  );
  if (error) throw new HttpError(503, "Unable to load the user profile.");
  res.json({ success: true, data: profileResponse(data!) });
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
  res.json({ success: true, data: profileResponse(data!) });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const body = objectBody(req.body);
  if (body.mykadConsent !== true) {
    throw new HttpError(400, "Consent is required to process your MyKad number.");
  }

  const fullName = textField(body.fullName, "fullName", true, 150);
  const phoneNumber = textField(body.phoneNumber, "phoneNumber", true, 20);
  if (!/^\+?[0-9\s()-]{7,20}$/.test(phoneNumber)) {
    throw new HttpError(400, "Enter a valid phone number.");
  }

  const mykadInput = textField(body.mykadNumber, "mykadNumber", true, 14);
  const mykadNumber = normalizeMyKad(mykadInput);
  if (!mykadNumber) {
    throw new HttpError(400, "Enter a valid 12-digit MyKad number.");
  }
  const configuredSecret = process.env.MYKAD_HASH_SECRET?.trim();
  const secret =
    configuredSecret && !configuredSecret.includes("replace_with")
      ? configuredSecret
      : process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new HttpError(503, "MyKad verification is not configured on the API server.");
  }

  const userId = (req as typeof req & { auth: { userId: string } }).auth.userId;
  const { data: currentProfile, error: currentProfileError } = await userService.getById(userId);
  if (currentProfileError) throw new HttpError(503, "Unable to load the user profile.");
  if (currentProfile?.mykad_hash) {
    throw new HttpError(409, "Profile information has already been submitted.");
  }

  const mykadHash = createHmac("sha256", secret).update(mykadNumber).digest("hex");
  const isRejected = !isMyKadEligible(mykadNumber);
  const { data, error } = await userService.completeOnboarding(userId, {
    full_name: fullName,
    phone_number: phoneNumber,
    mykad_hash: mykadHash,
    mykad_verified: isRejected ? "rejected" : "pending",
  });
  if (error?.code === "23505") {
    throw new HttpError(409, "That phone number is already associated with an account.");
  }
  if (error) throw new HttpError(503, "Unable to save the profile information.");

  if (isRejected) throw new HttpError(403, MYKAD_REJECTION_MESSAGE);
  res.json({ success: true, data: profileResponse(data!) });
});