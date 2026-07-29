-- AgenturOS: Aufgaben-Workflow und Arbeitssteuerung

alter table public.tasks
  add column completed_at timestamptz null,
  add column priority text not null default 'normal',
  add column due_date date null;

alter table public.tasks
  add constraint tasks_priority_valid check (priority in ('low', 'normal', 'high'));

comment on column public.tasks.completed_at is 'Zeitpunkt der Erledigung; null bedeutet offen.';
comment on column public.tasks.priority is 'Priorität: low, normal oder high.';
comment on column public.tasks.due_date is 'Optionales Fälligkeitsdatum ohne Uhrzeit.';
