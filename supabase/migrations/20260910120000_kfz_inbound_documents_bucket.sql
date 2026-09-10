-- Private durable storage for Kfz landing documents.
-- Additive. Apply on Preview/Production remains an Owner step.
-- Pattern matches user-files (private bucket) without client insert/select policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kfz-inbound-documents',
  'kfz-inbound-documents',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]::text[]
);

-- Least privilege: no storage.objects policies for anon or authenticated on this bucket.
-- service_role (server-side upload and authorized review) bypasses RLS.
-- There is no public URL and no client-side upload path.