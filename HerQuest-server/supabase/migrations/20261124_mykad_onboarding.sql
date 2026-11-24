ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS mykad_consent_at TIMESTAMPTZ;
