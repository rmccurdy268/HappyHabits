-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Categories (
  id bigint NOT NULL DEFAULT nextval('"Categories_id_seq"'::regclass),
  name text NOT NULL,
  user_id bigint,
  CONSTRAINT Categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.UserData(id)
);
CREATE TABLE public.HabitLogs (
  id bigint NOT NULL DEFAULT nextval('"HabitLogs_id_seq"'::regclass),
  user_habit_id bigint NOT NULL,
  date timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  time_completed timestamp without time zone,
  CONSTRAINT HabitLogs_pkey PRIMARY KEY (id),
  CONSTRAINT habitlogs_user_habit_id_foreign FOREIGN KEY (user_habit_id) REFERENCES public.UserHabit(id)
);
CREATE TABLE public.HabitTemplate (
  id bigint NOT NULL DEFAULT nextval('"HabitTemplate_id_seq"'::regclass),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  category_id bigint,
  CONSTRAINT HabitTemplate_pkey PRIMARY KEY (id),
  CONSTRAINT HabitTemplate_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.Categories(id)
);
CREATE TABLE public.UserData (
  id bigint NOT NULL DEFAULT nextval('"UserData_id_seq"'::regclass),
  username text NOT NULL,
  phone bigint NOT NULL,
  preferred_contact_method character varying NOT NULL CHECK (preferred_contact_method::text = ANY (ARRAY['email'::character varying, 'phone'::character varying]::text[])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  auth_user_id uuid UNIQUE,
  CONSTRAINT UserData_pkey PRIMARY KEY (id)
);
CREATE TABLE public.UserHabit (
  id bigint NOT NULL DEFAULT nextval('"UserHabit_id_seq"'::regclass),
  user_id bigint NOT NULL,
  template_id bigint,
  name text NOT NULL,
  times_per_day integer NOT NULL DEFAULT 1 CHECK (times_per_day > 0),
  is_active boolean NOT NULL DEFAULT true,
  create_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  category_id bigint,
  description text NOT NULL,
  CONSTRAINT UserHabit_pkey PRIMARY KEY (id),
  CONSTRAINT userhabit_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.UserData(id),
  CONSTRAINT userhabit_template_id_foreign FOREIGN KEY (template_id) REFERENCES public.HabitTemplate(id),
  CONSTRAINT UserHabit_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.Categories(id)
);