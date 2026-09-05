-- Persist the editor's publication checklist data. This makes a later bulk
-- publication deterministic: only fields explicitly saved by a reviewer are
-- considered, never a raw public submission.
ALTER TABLE feedback ADD COLUMN review_data_json TEXT;
