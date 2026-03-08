-- Step 1: Add access_key column
ALTER TABLE public.events ADD COLUMN access_key text;
UPDATE public.events SET access_key = UPPER(SUBSTRING(MD5(id::text || created_at::text) FROM 1 FOR 6));
ALTER TABLE public.events ALTER COLUMN access_key SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN access_key SET DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 6));
ALTER TABLE public.events ADD CONSTRAINT events_access_key_unique UNIQUE (access_key);