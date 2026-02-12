-- Allow authenticated users to view employer profiles (so helpers can see job listings)
CREATE POLICY "Authenticated users can view employer profiles"
ON public.employer_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to view other users' names (for employer listings)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
