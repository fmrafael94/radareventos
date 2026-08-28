-- Run once after 0003. Records the safety outcome without retaining images
-- that the automated check rejects.
ALTER TABLE feedback ADD COLUMN image_moderation_status TEXT NOT NULL DEFAULT 'not_applicable';
ALTER TABLE feedback ADD COLUMN image_moderation_reason TEXT;
