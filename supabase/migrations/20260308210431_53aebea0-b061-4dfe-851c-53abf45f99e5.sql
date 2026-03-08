
-- Drop the old 4-param overload that conflicts
DROP FUNCTION IF EXISTS public.admin_add_photo(text, uuid, text, text);

-- Drop the old no-token version too
DROP FUNCTION IF EXISTS public.admin_add_photo(uuid, text, text);
