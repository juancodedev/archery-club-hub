
-- Migration to add default member password to clubs
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS default_member_password TEXT DEFAULT 'ClubArqueria2024';

-- Update comment for clarity
COMMENT ON COLUMN clubs.default_member_password IS 'The default password used when an administrator manually adds a member to the system.';
