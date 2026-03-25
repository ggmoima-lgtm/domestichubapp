
-- Delete Gontse (employer) data
DELETE FROM employer_profiles WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM job_posts WHERE employer_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM saved_helpers WHERE employer_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM profile_unlocks WHERE employer_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM reviews WHERE employer_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM placements WHERE employer_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM blocked_users WHERE blocker_id = '33b4485c-1e06-490a-9c84-472df29515b1' OR blocked_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM user_reports WHERE reporter_id = '33b4485c-1e06-490a-9c84-472df29515b1' OR reported_user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM terms_acceptances WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM notification_preferences WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM push_tokens WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM credit_wallets WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM credit_transactions WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM audit_logs WHERE actor_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM otp_codes WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM messages WHERE sender_id = '33b4485c-1e06-490a-9c84-472df29515b1' OR receiver_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM user_roles WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';
DELETE FROM profiles WHERE user_id = '33b4485c-1e06-490a-9c84-472df29515b1';

-- Delete Kamo (helper) data
DELETE FROM terms_acceptances WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM notification_preferences WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM push_tokens WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM credit_wallets WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM credit_transactions WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM audit_logs WHERE actor_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM otp_codes WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM user_roles WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';
DELETE FROM profiles WHERE user_id = '8d9b1332-72a0-487b-bc2f-933bd20e6813';

-- Delete auth users
DELETE FROM auth.users WHERE id IN ('33b4485c-1e06-490a-9c84-472df29515b1', '8d9b1332-72a0-487b-bc2f-933bd20e6813');
