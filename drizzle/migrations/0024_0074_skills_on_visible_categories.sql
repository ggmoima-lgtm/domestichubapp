update public.skills s
set category_id = twin.visible_id
from (
  select hidden.id as hidden_id, visible.id as visible_id
  from (values
    ('Cook / Household Cook', 'Household Cook'),
    ('Garden Maintenance Worker', 'Garden Maintenance'),
    ('Landscaping Assistant', 'Landscaping'),
    ('Lawn Care Worker', 'Lawn Care'),
    ('Patient / Home Care Assistant', 'Home Care Assistant')
  ) as pair(hidden_name, visible_name)
  join public.worker_categories hidden on hidden.name = pair.hidden_name and not hidden.is_active
  join public.worker_categories visible on visible.name = pair.visible_name and visible.is_active
) as twin
where s.category_id = twin.hidden_id
  and not exists (
    select 1 from public.skills other
    where other.category_id = twin.visible_id and lower(other.name) = lower(s.name)
  );

insert into public.skills (category_id, name, is_active)
select c.id, v.skill, true
from (values
  ('Cleaner', 'General cleaning'), ('Cleaner', 'Deep cleaning'), ('Cleaner', 'Window cleaning'), ('Cleaner', 'Carpet cleaning'), ('Cleaner', 'Office cleaning'),
  ('Housekeeper', 'Laundry'), ('Housekeeper', 'Ironing'), ('Housekeeper', 'Deep cleaning'),
  ('House Manager', 'Household management'), ('House Manager', 'Staff supervision'), ('House Manager', 'Grocery and supplies'), ('House Manager', 'Scheduling'),
  ('Household Cook', 'Baking'), ('Household Cook', 'Special diets'), ('Household Cook', 'Meal planning'),
  ('Laundry / Ironing', 'Laundry'), ('Laundry / Ironing', 'Ironing'), ('Laundry / Ironing', 'Folding'), ('Laundry / Ironing', 'Stain removal'),
  ('Nanny', 'Homework help'), ('Nanny', 'School runs'), ('Nanny', 'Meal preparation'), ('Nanny', 'Play and activities'),
  ('Babysitter', 'Evening care'), ('Babysitter', 'Weekend care'), ('Babysitter', 'Play and activities'),
  ('Night Nanny', 'Newborn care'), ('Night Nanny', 'Overnight supervision'),
  ('Au Pair', 'Language practice'), ('Au Pair', 'Light housework'),
  ('After-School Care', 'School runs'), ('After-School Care', 'Meal preparation'), ('After-School Care', 'Play and activities'),
  ('Child Minder', 'Child supervision'), ('Child Minder', 'Meal preparation'), ('Child Minder', 'Play and activities'),
  ('Elderly Caregiver', 'Personal care'), ('Elderly Caregiver', 'Meal preparation'), ('Elderly Caregiver', 'Medication reminders'), ('Elderly Caregiver', 'Mobility assistance'),
  ('Home Care Assistant', 'Personal care'), ('Home Care Assistant', 'Light housekeeping'), ('Home Care Assistant', 'Companionship'),
  ('Companion Care', 'Conversation and outings'), ('Companion Care', 'Light housekeeping'),
  ('Disability Support Carer', 'Mobility assistance'), ('Disability Support Carer', 'Medication reminders'), ('Disability Support Carer', 'Meal assistance'),
  ('Gardener', 'Hedge trimming'), ('Gardener', 'Weeding'), ('Gardener', 'Planting'), ('Gardener', 'Garden cleaning'), ('Gardener', 'Irrigation'),
  ('Garden Maintenance', 'Lawn mowing'), ('Garden Maintenance', 'Weeding'), ('Garden Maintenance', 'Planting'),
  ('Lawn Care', 'Lawn mowing'), ('Lawn Care', 'Edging'), ('Lawn Care', 'Fertilising'), ('Lawn Care', 'Lawn repair'),
  ('Landscaping', 'Garden design'), ('Landscaping', 'Paving'), ('Landscaping', 'Planting'), ('Landscaping', 'Irrigation'),
  ('Outdoor Maintenance', 'Pressure washing'), ('Outdoor Maintenance', 'Gutter cleaning'), ('Outdoor Maintenance', 'Fence repair'), ('Outdoor Maintenance', 'Garden cleaning'),
  ('Pool Cleaner', 'Chemical balancing'), ('Pool Cleaner', 'Filter cleaning'), ('Pool Cleaner', 'Pool vacuuming'),
  ('Plumber', 'Leak repair'), ('Plumber', 'Blocked drains'), ('Plumber', 'Geyser repair'), ('Plumber', 'Tap and toilet repair'), ('Plumber', 'Pipe installation'),
  ('Electrician', 'Wiring'), ('Electrician', 'Lighting installation'), ('Electrician', 'Fault finding'), ('Electrician', 'Plug and switch repair'), ('Electrician', 'DB board work'),
  ('Handyman', 'Shelving and hanging'), ('Handyman', 'Door and lock repair'), ('Handyman', 'General repairs'),
  ('Carpenter', 'Cupboards'), ('Carpenter', 'Doors and frames'), ('Carpenter', 'Decking'), ('Carpenter', 'Furniture repair'),
  ('Painter', 'Interior painting'), ('Painter', 'Exterior painting'), ('Painter', 'Wall preparation'), ('Painter', 'Waterproofing'),
  ('Tiler', 'Floor tiling'), ('Tiler', 'Wall tiling'), ('Tiler', 'Grouting'), ('Tiler', 'Tile repair'),
  ('Appliance Repair', 'Washing machine repair'), ('Appliance Repair', 'Fridge repair'), ('Appliance Repair', 'Oven and stove repair'), ('Appliance Repair', 'Dishwasher repair'),
  ('General Maintenance', 'Minor repairs'), ('General Maintenance', 'Door and lock repair'), ('General Maintenance', 'Painting touch-ups'),
  ('General Helper', 'General help'), ('General Helper', 'Moving things'), ('General Helper', 'Errands'), ('General Helper', 'Light cleaning'),
  ('Driver', 'School runs'), ('Driver', 'Airport transfers'), ('Driver', 'Errands'), ('Driver', 'Long-distance driving'),
  ('Errand Assistant', 'Grocery shopping'), ('Errand Assistant', 'Collecting parcels'), ('Errand Assistant', 'Admin and queueing'), ('Errand Assistant', 'Pharmacy runs'),
  ('House Sitter', 'Overnight stays'), ('House Sitter', 'Pet care'), ('House Sitter', 'Plant care'), ('House Sitter', 'Security checks'),
  ('Moving / Furniture Assistance', 'Packing'), ('Moving / Furniture Assistance', 'Loading and unloading'), ('Moving / Furniture Assistance', 'Furniture assembly'), ('Moving / Furniture Assistance', 'Furniture moving'),
  ('Pet Care / Dog Walker', 'Dog walking'), ('Pet Care / Dog Walker', 'Pet feeding'), ('Pet Care / Dog Walker', 'Pet sitting'), ('Pet Care / Dog Walker', 'Grooming')
) as v(category, skill)
join public.worker_categories c on c.name = v.category and c.is_active
where not exists (
  select 1 from public.skills s
  where s.category_id = c.id and lower(s.name) = lower(v.skill)
);