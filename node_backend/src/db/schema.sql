-- ===========================
-- Table: UserData
-- ===========================
CREATE TABLE IF NOT EXISTS"UserData" (
    "id" BIGSERIAL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" BIGINT NOT NULL,
    "preferred_contact_method" VARCHAR(255) NOT NULL CHECK (
        "preferred_contact_method" IN ('email', 'phone')
    ),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL DEFAULT NULL
);

-- ===========================
-- Table: HabitTemplate
-- ===========================
CREATE TABLE IF NOT EXISTS"HabitTemplate" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "default_frequency" VARCHAR(255) NOT NULL CHECK (
        "default_frequency" IN ('daily', 'weekly', 'monthly')
    ),
    "is_public" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL DEFAULT NULL
);

-- ===========================
-- Table: UserHabit
-- ===========================
CREATE TABLE IF NOT EXISTS "UserHabit" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "template_id" BIGINT,
    "name" TEXT NOT NULL,
    "frequency" VARCHAR(255) NOT NULL CHECK (
        "frequency" IN ('daily', 'weekly', 'monthly')
    ),
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "create_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT "userhabit_user_id_foreign" FOREIGN KEY ("user_id")
        REFERENCES "UserData"("id") ON DELETE CASCADE,
    CONSTRAINT "userhabit_template_id_foreign" FOREIGN KEY ("template_id")
        REFERENCES "HabitTemplate"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS"userhabit_user_id_index" ON "UserHabit"("user_id");

-- ===========================
-- Table: HabitLogs
-- ===========================
CREATE TABLE IF NOT EXISTS "HabitLogs" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_habit_id" BIGINT NOT NULL,
    "date" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "notes" TEXT,
    "time_completed" TIMESTAMP WITHOUT TIME ZONE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT "habitlogs_user_habit_id_foreign" FOREIGN KEY ("user_habit_id")
        REFERENCES "UserHabit"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "habitlogs_user_habit_id_index" ON "HabitLogs"("user_habit_id");
