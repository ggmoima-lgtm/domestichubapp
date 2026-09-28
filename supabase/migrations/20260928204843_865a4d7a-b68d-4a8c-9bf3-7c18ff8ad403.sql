update public.job_alerts set frequency = 'Daily' where frequency = 'Instant';

alter table public.job_alerts drop constraint if exists job_alerts_frequency_check;

alter table public.job_alerts add constraint job_alerts_frequency_check check (frequency in ('Daily', 'Weekly', 'Monthly'));