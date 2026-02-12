
-- Add availability_status to helpers
ALTER TABLE public.helpers ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable'));

-- Create placements table
CREATE TABLE public.placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  helper_id UUID NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  hired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view their own placements" ON public.placements FOR SELECT USING (auth.uid() = employer_id);
CREATE POLICY "Employers can insert placements" ON public.placements FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update their placements" ON public.placements FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Helpers can view placements involving them" ON public.placements FOR SELECT USING (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);

CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON public.placements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  helper_id UUID NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES public.placements(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can see reviews (public trust signal)
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Employers can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update their reviews" ON public.reviews FOR UPDATE USING (auth.uid() = employer_id);

-- Unique constraint: one review per placement
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_placement UNIQUE (placement_id);
