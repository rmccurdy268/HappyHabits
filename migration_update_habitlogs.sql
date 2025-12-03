-- Migration: Update HabitLogs table
-- 1. Change date column from timestamp to date type
-- 2. Remove completed column (if a log exists, it means completed)

-- Step 1: Convert existing timestamp dates to date type
-- This preserves existing data by extracting just the date portion
ALTER TABLE public."HabitLogs"
ALTER COLUMN date TYPE date USING date::date;

-- Step 2: Remove the completed column (no longer needed)
-- If a log exists, it means the habit was completed
ALTER TABLE public."HabitLogs"
DROP COLUMN IF EXISTS completed;

-- Note: The date column default will remain CURRENT_DATE (PostgreSQL will handle this automatically)
-- If you need to explicitly set it, you can run:
-- ALTER TABLE public."HabitLogs" ALTER COLUMN date SET DEFAULT CURRENT_DATE;

