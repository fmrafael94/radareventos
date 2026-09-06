-- "resolved" means the automated signal was accepted by an editor. Keep the
-- separate timestamp for the moment its verified data is actually applied to
-- the public agenda, so the two queues are never visually indistinguishable.
ALTER TABLE automation_reviews ADD COLUMN applied_at TEXT;
