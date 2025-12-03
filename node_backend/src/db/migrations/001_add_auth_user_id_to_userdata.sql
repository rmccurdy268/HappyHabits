-- Migration: Add auth_user_id column to UserData table
-- This column links UserData records to Supabase Auth users

ALTER TABLE public."UserData"
ADD COLUMN IF NOT EXISTS "auth_user_id" UUID UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "UserData_auth_user_id_index" 
ON public."UserData"("auth_user_id");

-- Add comment to document the column
COMMENT ON COLUMN public."UserData"."auth_user_id" IS 'References the user ID from Supabase Auth (auth.users.id)';

