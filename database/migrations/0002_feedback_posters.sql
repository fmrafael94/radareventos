-- Run once on the existing Cloudflare D1 database before enabling public poster uploads.
ALTER TABLE feedback ADD COLUMN poster_url TEXT;
ALTER TABLE feedback ADD COLUMN poster_object_key TEXT;
ALTER TABLE feedback ADD COLUMN poster_file_name TEXT;
