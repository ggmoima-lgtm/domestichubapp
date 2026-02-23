
-- Force logout all users by deleting all active refresh tokens
DELETE FROM auth.refresh_tokens;
