-- One message template per reason, per target.
alter table public.targets
  add column if not exists templates jsonb not null default jsonb_build_object(
    'wfh',   'I''ll be working from home today. {excuse}',
    'leave', 'I''ll be on leave today. {excuse}',
    'late',  'I''ll be running late today. {excuse}'
  );

-- Keep whatever template existing targets already had for "working from home".
update public.targets set templates = jsonb_set(templates, '{wfh}', to_jsonb(template));
