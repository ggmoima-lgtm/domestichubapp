
-- Add email, city, and area columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN email text,
ADD COLUMN city text,
ADD COLUMN area text;
