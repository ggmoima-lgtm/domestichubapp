ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_helper_id_fkey;
ALTER TABLE public.messages ALTER COLUMN helper_id DROP NOT NULL;