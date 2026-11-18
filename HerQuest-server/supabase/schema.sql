
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE user_role AS ENUM ('applicant', 'owner', 'both');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE job_category AS ENUM (
    'Post-Partum Cook',
    'One-Time Driver',
    'Chef',
    'Poster Designer',
    'Event Crew',
    'Technician',
    'Caretaker',
    'Tutor',
    'Remote Admin',
    'Other'
);
CREATE TYPE quest_frequency AS ENUM ('one_time', 'recurring', 'flexible');
CREATE TYPE quest_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'interviewing', 'hired', 'declined', 'withdrawn');
CREATE TYPE wa_notif_status AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL DEFAULT 'HerQuest Member',
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    role user_role NOT NULL DEFAULT 'both',
    mykad_verified verification_status NOT NULL DEFAULT 'unverified',
    mykad_hash VARCHAR(255),
    profile_avatar_url TEXT,
    bio TEXT,

    state VARCHAR(50),
    city VARCHAR(100),
    latitude DECIMAL(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(9,6) CHECK (longitude BETWEEN -180 AND 180),

    whatsapp_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_avg BETWEEN 0 AND 5),
    completed_quests_count INT NOT NULL DEFAULT 0 CHECK (completed_quests_count >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, full_name, email, phone_number)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
            'HerQuest Member'
        ),
        NEW.email,
        NEW.phone
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL CHECK (LENGTH(BTRIM(title)) > 0),
    description TEXT NOT NULL CHECK (LENGTH(BTRIM(description)) > 0),
    category job_category NOT NULL,
    frequency quest_frequency NOT NULL DEFAULT 'one_time',

    payout_amount DECIMAL(10,2) NOT NULL CHECK (payout_amount >= 0),
    payout_unit VARCHAR(30) NOT NULL DEFAULT 'per quest',
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    is_wfh BOOLEAN NOT NULL DEFAULT FALSE,

    state VARCHAR(50) NOT NULL CHECK (LENGTH(BTRIM(state)) > 0),
    location_name VARCHAR(150),
    latitude DECIMAL(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(9,6) CHECK (longitude BETWEEN -180 AND 180),

    is_food_related BOOLEAN NOT NULL DEFAULT FALSE,
    status quest_status NOT NULL DEFAULT 'open',
    scheduled_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE quest_dietary_specs (
    quest_id UUID PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,

    is_halal BOOLEAN NOT NULL DEFAULT FALSE,
    no_pork BOOLEAN NOT NULL DEFAULT FALSE,
    no_alcohol BOOLEAN NOT NULL DEFAULT FALSE,

    avoid_beef_guanyin BOOLEAN NOT NULL DEFAULT FALSE,
    no_five_pungent_roots BOOLEAN NOT NULL DEFAULT FALSE,

    is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_egg BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_dairy BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_honey BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_figs BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_shellfish_oysters BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE OR REPLACE FUNCTION public.check_food_quest_dietary_specs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.quests
        WHERE id = NEW.quest_id AND is_food_related = TRUE
    ) THEN
        RAISE EXCEPTION 'Dietary requirements can only be set for food-related quests.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_quest_dietary_specs
    BEFORE INSERT OR UPDATE ON quest_dietary_specs
    FOR EACH ROW EXECUTE FUNCTION public.check_food_quest_dietary_specs();

CREATE OR REPLACE FUNCTION public.prevent_disabling_food_quest_with_specs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF OLD.is_food_related = TRUE
       AND NEW.is_food_related = FALSE
       AND EXISTS (
           SELECT 1 FROM public.quest_dietary_specs
           WHERE quest_id = OLD.id
       ) THEN
        RAISE EXCEPTION 'Remove dietary requirements before marking a quest as non-food-related.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_quest_food_flag
    BEFORE UPDATE OF is_food_related ON quests
    FOR EACH ROW EXECUTE FUNCTION public.prevent_disabling_food_quest_with_specs();
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status application_status NOT NULL DEFAULT 'pending',
    proposed_rate DECIMAL(10,2) CHECK (proposed_rate IS NULL OR proposed_rate >= 0),
    cover_note TEXT,

    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_quest_applicant UNIQUE (quest_id, applicant_id)
);
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT distinct_conversation_members CHECK (owner_id <> applicant_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(BTRIM(content)) > 0),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE bookmarks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, quest_id)
);
CREATE TABLE whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    message_payload TEXT NOT NULL,
    deep_link_url TEXT,
    delivery_status wa_notif_status NOT NULL DEFAULT 'queued',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quests_set_updated_at
    BEFORE UPDATE ON quests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_set_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE VIEW public.quest_directory AS
SELECT
    q.id,
    q.title,
    q.description,
    q.category,
    q.category AS "type",
    q.frequency,
    q.payout_amount AS price,
    q.payout_unit AS unit,
    q.is_urgent AS urgent,
    q.is_wfh,
    q.state,
    q.location_name AS location,
    q.latitude,
    q.longitude,
    q.is_food_related,
    q.status,
    q.scheduled_date,
    q.created_at,
    u.full_name AS owner_name,
    ARRAY_REMOVE(ARRAY[
        CASE WHEN d.is_halal THEN 'halal' END,
        CASE WHEN d.no_pork AND d.no_alcohol THEN 'no-pork-alcohol' END,
        CASE WHEN d.avoid_beef_guanyin THEN 'no-beef' END,
        CASE WHEN d.no_five_pungent_roots THEN 'no-wu-hun' END,
        CASE WHEN d.exclude_egg THEN 'no-egg' END,
        CASE WHEN d.exclude_dairy THEN 'no-dairy' END,
        CASE WHEN d.exclude_honey THEN 'no-honey' END,
        CASE WHEN d.exclude_figs THEN 'no-figs' END,
        CASE WHEN d.exclude_shellfish_oysters THEN 'no-oysters' END
    ]::TEXT[], NULL) AS dietary
FROM public.quests q
JOIN public.users u ON u.id = q.owner_id
LEFT JOIN public.quest_dietary_specs d ON d.quest_id = q.id
WHERE q.status = 'open';

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON TABLE public.users, public.quests, public.quest_dietary_specs,
    public.applications, public.conversations, public.messages, public.bookmarks,
    public.whatsapp_notifications, public.quest_directory
    FROM anon, authenticated;

GRANT SELECT ON public.quest_directory TO anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (
    full_name, phone_number, profile_avatar_url, bio, state, city,
    latitude, longitude, whatsapp_alerts_enabled
) ON public.users TO authenticated;
GRANT SELECT ON public.quests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_dietary_specs TO authenticated;
GRANT SELECT, INSERT ON public.applications TO authenticated;
GRANT UPDATE (status) ON public.applications TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT ON public.whatsapp_notifications TO authenticated;
CREATE INDEX idx_users_state_city ON users(state, city);
CREATE INDEX idx_quests_open_created ON quests(created_at DESC) WHERE status = 'open';
CREATE INDEX idx_quests_owner_status ON quests(owner_id, status);
CREATE INDEX idx_quests_category ON quests(category);
CREATE INDEX idx_quests_state ON quests(state);
CREATE INDEX idx_quests_urgent ON quests(is_urgent) WHERE is_urgent = TRUE;
CREATE INDEX idx_quests_food ON quests(is_food_related) WHERE is_food_related = TRUE;
CREATE INDEX idx_applications_quest ON applications(quest_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_dietary_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
    ON users FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Anyone can read open quests"
    ON quests FOR SELECT TO anon, authenticated
    USING (status = 'open' OR owner_id = (SELECT auth.uid()));
CREATE POLICY "Quest owners can create quests"
    ON quests FOR INSERT TO authenticated
    WITH CHECK (
        owner_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM users
            WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'both')
        )
    );
CREATE POLICY "Quest owners can update their quests"
    ON quests FOR UPDATE TO authenticated
    USING (owner_id = (SELECT auth.uid()))
    WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY "Quest owners can delete their quests"
    ON quests FOR DELETE TO authenticated
    USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Users can read dietary specs for visible quests"
    ON quest_dietary_specs FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id
              AND (q.status = 'open' OR q.owner_id = (SELECT auth.uid()))
        )
    );
CREATE POLICY "Quest owners can manage dietary specs"
    ON quest_dietary_specs FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.owner_id = (SELECT auth.uid())
              AND q.is_food_related = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.owner_id = (SELECT auth.uid())
              AND q.is_food_related = TRUE
        )
    );

CREATE POLICY "Applicants and quest owners can read applications"
    ON applications FOR SELECT TO authenticated
    USING (
        applicant_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.owner_id = (SELECT auth.uid())
        )
    );
CREATE POLICY "Users can apply to open quests"
    ON applications FOR INSERT TO authenticated
    WITH CHECK (
        applicant_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.status = 'open'
              AND q.owner_id <> (SELECT auth.uid())
        )
    );
CREATE POLICY "Applicants can withdraw their applications"
    ON applications FOR UPDATE TO authenticated
    USING (applicant_id = (SELECT auth.uid()))
    WITH CHECK (applicant_id = (SELECT auth.uid()) AND status = 'withdrawn');
CREATE POLICY "Quest owners can update application status"
    ON applications FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.owner_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quests q
            WHERE q.id = quest_id AND q.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Conversation members can read conversations"
    ON conversations FOR SELECT TO authenticated
    USING (owner_id = (SELECT auth.uid()) OR applicant_id = (SELECT auth.uid()));
CREATE POLICY "Conversation members can read messages"
    ON messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
              AND (c.owner_id = (SELECT auth.uid()) OR c.applicant_id = (SELECT auth.uid()))
        )
    );
CREATE POLICY "Conversation members can send messages"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
              AND (c.owner_id = (SELECT auth.uid()) OR c.applicant_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Users can read their bookmarks"
    ON bookmarks FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can add their own bookmarks"
    ON bookmarks FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can remove their own bookmarks"
    ON bookmarks FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read their WhatsApp notification logs"
    ON whatsapp_notifications FOR SELECT TO authenticated
    USING (recipient_user_id = (SELECT auth.uid()));
