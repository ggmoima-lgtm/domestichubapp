
-- Delete old tester profiles and their auth users
DELETE FROM public.helpers WHERE user_id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a',
  'cb549c0b-7166-481b-ac26-79514b8b11d4','56d10e67-0349-4bfc-ba39-b09c99d00452','5532162b-ee59-4eda-9ea4-4994ba4615ba',
  'cbd25fe3-d8c0-4d47-a8e8-c28c35d3399c','140c3fa8-0322-41e6-a151-7a2e9344d94e','a3651629-ece0-4292-ac72-5fa8b4711304'
);

DELETE FROM public.employer_profiles WHERE user_id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a'
);

DELETE FROM public.credit_wallets WHERE user_id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a'
);

DELETE FROM public.credit_transactions WHERE user_id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a'
);

DELETE FROM public.profiles WHERE user_id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a',
  'cb549c0b-7166-481b-ac26-79514b8b11d4','56d10e67-0349-4bfc-ba39-b09c99d00452','5532162b-ee59-4eda-9ea4-4994ba4615ba',
  'cbd25fe3-d8c0-4d47-a8e8-c28c35d3399c','140c3fa8-0322-41e6-a151-7a2e9344d94e','a3651629-ece0-4292-ac72-5fa8b4711304'
);

DELETE FROM auth.users WHERE id IN (
  '2eea9316-6bd3-400b-886d-2e05fcf6fdb1','1f5567cc-b170-45be-95aa-0aa9a695ebc1','c98eb5b0-b0c7-446f-8ad2-76a72ab50970',
  'ecf035ba-0c63-49f8-84f5-75a147606953','950d3e47-0562-46ce-9590-0d65e27b06c0','e31f2cfa-200e-42e1-8c99-39de1ecd318a',
  'cb549c0b-7166-481b-ac26-79514b8b11d4','56d10e67-0349-4bfc-ba39-b09c99d00452','5532162b-ee59-4eda-9ea4-4994ba4615ba',
  'cbd25fe3-d8c0-4d47-a8e8-c28c35d3399c','140c3fa8-0322-41e6-a151-7a2e9344d94e','a3651629-ece0-4292-ac72-5fa8b4711304'
);

-- Also clean old tester_credit_emails that don't have proper emails
DELETE FROM public.tester_credit_emails WHERE email NOT LIKE '%@%';
