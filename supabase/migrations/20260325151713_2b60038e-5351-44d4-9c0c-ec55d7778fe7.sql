
-- Delete Kamo Segone (helper) data
DELETE FROM helper_sensitive_data WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM badge_awards WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM job_applications WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM video_flags WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM saved_helpers WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM profile_unlocks WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM reviews WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM placements WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM messages WHERE helper_id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';
DELETE FROM helpers WHERE id = 'd92a8b59-1811-4bc7-be95-ae1c7d434494';

-- Delete Kamo Segone profile and auth-related data
DELETE FROM terms_acceptances WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM notification_preferences WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM push_tokens WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM credit_wallets WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM credit_transactions WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM audit_logs WHERE actor_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM otp_codes WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';
DELETE FROM profiles WHERE user_id = 'f1f2c5a6-2db9-42b6-b367-94edf2568325';

-- Delete Gontse Given Moima (employer) data
DELETE FROM employer_profiles WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM job_posts WHERE employer_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM saved_helpers WHERE employer_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM profile_unlocks WHERE employer_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM reviews WHERE employer_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM placements WHERE employer_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM blocked_users WHERE blocker_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c' OR blocked_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM user_reports WHERE reporter_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c' OR reported_user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM terms_acceptances WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM notification_preferences WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM push_tokens WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM credit_wallets WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM credit_transactions WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM audit_logs WHERE actor_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM otp_codes WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM messages WHERE sender_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c' OR receiver_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';
DELETE FROM profiles WHERE user_id = '7f6004d1-495b-481d-9b87-3ac5fad0018c';

-- Delete auth users
DELETE FROM auth.users WHERE id IN ('7f6004d1-495b-481d-9b87-3ac5fad0018c', 'f1f2c5a6-2db9-42b6-b367-94edf2568325');
