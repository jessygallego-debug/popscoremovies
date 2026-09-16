-- Only the server-side service role may write to this bucket. There are no
-- authenticated-user INSERT/UPDATE/DELETE policies for profile-photos.
-- Photos are converted to WebP and screened before the server uploads them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 1048576, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
