-- Allow uploads to event-originals bucket (anon key used from admin dashboard)
CREATE POLICY "Upload access for event originals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-originals');

-- Allow service role to delete from event-originals
CREATE POLICY "Service role delete event originals"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-originals' AND (SELECT current_setting('role') = 'service_role'));

-- Allow signed URL reads for event-originals (edge function uses service role, but just in case)
CREATE POLICY "Service role read event originals"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-originals' AND (SELECT current_setting('role') = 'service_role'));