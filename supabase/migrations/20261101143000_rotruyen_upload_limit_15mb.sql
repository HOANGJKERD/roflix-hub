-- Limit each new RoTruyen object to 15 MiB while preserving existing objects.
update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'rotruyen-pages';
