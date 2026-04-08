
-- Create 9 new test user accounts
DO $$
DECLARE
  v_uid uuid;
  v_hash text;
  v_accounts jsonb := '[
    {"email":"tester13@domestichub.co.za","phone":"0710001013","role":"employer","name":"Tester Thirteen"},
    {"email":"tester14@domestichub.co.za","phone":"0710001014","role":"helper","name":"Tester Fourteen"},
    {"email":"tester15@domestichub.co.za","phone":"0710001015","role":"employer","name":"Tester Fifteen"},
    {"email":"tester16@domestichub.co.za","phone":"0710001016","role":"helper","name":"Tester Sixteen"},
    {"email":"tester17@domestichub.co.za","phone":"0710001017","role":"employer","name":"Tester Seventeen"},
    {"email":"google1@domestichub.co.za","phone":"0710001018","role":"employer","name":"Google One"},
    {"email":"google2@domestichub.co.za","phone":"0710001019","role":"helper","name":"Google Two"},
    {"email":"tester18@domestichub.co.za","phone":"0710001020","role":"helper","name":"Tester Eighteen"},
    {"email":"tester19@domestichub.co.za","phone":"0710001021","role":"employer","name":"Tester Nineteen"}
  ]';
  v_acc jsonb;
  v_email text;
  v_phone text;
  v_role text;
  v_name text;
BEGIN
  v_hash := crypt('test123', gen_salt('bf'));

  FOR v_acc IN SELECT * FROM jsonb_array_elements(v_accounts)
  LOOP
    v_email := v_acc->>'email';
    v_phone := v_acc->>'phone';
    v_role := v_acc->>'role';
    v_name := v_acc->>'name';
    v_uid := gen_random_uuid();

    -- Insert auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, email_change, phone_change, phone_change_token,
      reauthentication_token, created_at, updated_at
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', v_email, v_hash, now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', v_name, 'phone', v_phone),
      'authenticated', 'authenticated',
      '', '', '', '', '', '', '', '',
      now(), now()
    );

    -- Insert identity
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', v_uid::text, now(), now(), now());

    -- Insert profile
    INSERT INTO public.profiles (user_id, full_name, phone, role, email, onboarding_completed)
    VALUES (v_uid, v_name, v_phone, v_role, v_email, true);

    -- Employer-specific data
    IF v_role = 'employer' THEN
      INSERT INTO public.employer_profiles (user_id, full_name, email)
      VALUES (v_uid, v_name, v_email);

      INSERT INTO public.credit_wallets (user_id, balance)
      VALUES (v_uid, 4);

      INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
      VALUES (v_uid, 4, 'bonus', 'Tester welcome credits', 4);
    END IF;

    -- Helper-specific data
    IF v_role = 'helper' THEN
      INSERT INTO public.helpers (
        user_id, full_name, email, phone, category, service_type,
        skills, languages, experience_years, bio,
        availability_status, availability
      ) VALUES (
        v_uid, v_name, v_email, v_phone, 'Domestic Worker', 'domestic',
        ARRAY['Cleaning','Laundry','Cooking'], ARRAY['English','Zulu'],
        2, 'Experienced domestic worker ready for new opportunities.',
        'available', 'Full-time'
      );
    END IF;
  END LOOP;
END;
$$;

-- Add tester credit emails for auto-grant on future signups
INSERT INTO public.tester_credit_emails (email, credits_to_grant) VALUES
  ('tester13@domestichub.co.za', 4),
  ('tester15@domestichub.co.za', 4),
  ('tester17@domestichub.co.za', 4),
  ('google1@domestichub.co.za', 4),
  ('tester19@domestichub.co.za', 4);
