-- Add username cache column to users table.
-- This allows the web dashboard to display real Discord usernames
-- without having to make a Discord API call on every page load.
-- The value is written through on every bot interaction and used as
-- the primary source; the Discord API is only a last-resort fallback.
ALTER TABLE users ADD COLUMN username TEXT;
