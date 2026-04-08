
DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  v_phones text[] := ARRAY[
    '0710001001','0710001002','0710001003','0710001004','0710001005','0710001006',
    '0710001007','0710001008','0710001009','0710001010','0710001011','0710001012'
  ];
  v_emails text[] := ARRAY[
    'tester1@domestichub.co.za','tester2@domestichub.co.za','tester3@domestichub.co.za',
    'tester4@domestichub.co.za','tester5@domestichub.co.za','tester6@domestichub.co.za',
    'tester7@domestichub.co.za','tester8@domestichub.co.za','tester9@domestichub.co.za',
    'tester10@domestichub.co.za','tester11@domestichub.co.za','tester12@domestichub.co.za'
  ];
  v_names text[] := ARRAY[
    'Test Employer 1','Test Employer 2','Test Employer 3','Test Employer 4','Test Employer 5','Test Employer 6',
    'Test Helper 7','Test Helper 8','Test Helper 9','Test Helper 10','Test Helper 11','Test Helper 12'
  ];
  v_roles text[] := ARRAY[
    'employer','employer','employer','employer','employer','employer',
    'helper','helper','helper','helper','helper','helper'
  ];
  i int;
  v_encrypted_pw text;
  v_skills text[];
  v_category text;
  v_svc text;
BEGIN
  v_encrypted_pw := crypt('test123', gen_salt('bf'));

  FOR i IN 1..12 LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_ids[i], '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_emails[i], v_encrypted_pw, now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_names[i], 'phone', v_phones[i]),
      now(), now()
    );

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_ids[i], v_emails[i], 'email',
      jsonb_build_object('sub', v_ids[i]::text, 'email', v_emails[i]), now(), now(), now());

    INSERT INTO public.profiles (user_id, full_name, phone, email, role, onboarding_completed)
    VALUES (v_ids[i], v_names[i], v_phones[i], v_emails[i], v_roles[i], true);
  END LOOP;

  -- Employers: credits + profiles
  FOR i IN 1..6 LOOP
    INSERT INTO public.credit_wallets (user_id, balance) VALUES (v_ids[i], 4);
    INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (v_ids[i], 4, 'bonus', 'Tester welcome credits', 4);
    INSERT INTO public.employer_profiles (user_id, full_name, email, location)
    VALUES (v_ids[i], v_names[i], v_emails[i], 'Johannesburg, South Africa');
  END LOOP;

  -- Helpers
  FOR i IN 7..12 LOOP
    CASE i
      WHEN 7 THEN v_category := 'domestic'; v_svc := 'domestic'; v_skills := ARRAY['Cleaning','Laundry','Ironing'];
      WHEN 8 THEN v_category := 'domestic'; v_svc := 'domestic'; v_skills := ARRAY['Cooking','Cleaning','Childcare'];
      WHEN 9 THEN v_category := 'gardening'; v_svc := 'gardening'; v_skills := ARRAY['Lawn Mowing','Pruning','Planting'];
      WHEN 10 THEN v_category := 'childcare'; v_svc := 'domestic'; v_skills := ARRAY['Babysitting','Homework Help','Meal Prep'];
      WHEN 11 THEN v_category := 'domestic'; v_svc := 'domestic'; v_skills := ARRAY['Cleaning','Cooking','Shopping'];
      WHEN 12 THEN v_category := 'eldercare'; v_svc := 'domestic'; v_skills := ARRAY['Elderly Care','Medication Management','Companionship'];
    END CASE;

    INSERT INTO public.helpers (
      user_id, full_name, email, phone, category, service_type,
      experience_years, bio, availability, skills, languages,
      location, availability_status, age, gender, nationality
    ) VALUES (
      v_ids[i], v_names[i], v_emails[i], v_phones[i],
      v_category, v_svc, (i - 4),
      'Experienced and reliable worker ready to assist.',
      'Full-time', v_skills, ARRAY['English','Zulu'],
      'Johannesburg, South Africa', 'available',
      25 + i, CASE WHEN i % 2 = 0 THEN 'Female' ELSE 'Male' END,
      'South African'
    );
  END LOOP;

  -- Tester credit emails reference
  FOR i IN 1..6 LOOP
    INSERT INTO public.tester_credit_emails (email, credits_to_grant, redeemed, redeemed_at)
    VALUES (v_emails[i], 4, true, now());
  END LOOP;
END $$;
