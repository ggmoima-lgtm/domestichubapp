-- Job alert frequency options change from Instant/Daily/Weekly to
-- Daily/Weekly/Monthly - product request to drop Instant and add Monthly.
--
-- Any alert already saved with frequency = 'Instant' is moved to 'Daily'
-- first (the same fallback the client's own asFrequency() already applies
-- to any value it doesn't recognize), so the constraint swap below has
-- nothing left to reject.
update public.job_alerts set frequency = 'Daily' where frequency = 'Instant';

alter table public.job_alerts drop constraint if exists job_alerts_frequency_check;

alter table public.job_alerts add constraint job_alerts_frequency_check check (frequency in ('Daily', 'Weekly', 'Monthly'));