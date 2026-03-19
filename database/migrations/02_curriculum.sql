-- Tạo extension pgcrypto nếu chưa có
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng curriculum_programs
CREATE TABLE IF NOT EXISTS curriculum_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL, -- KINDY/STARTERS/MOVERS/FLYERS (string)
    total_units INT NOT NULL,
    lessons_per_unit INT NOT NULL DEFAULT 7,
    sessions_per_week INT NOT NULL DEFAULT 2,
    fee_plan_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo bảng curriculum_units
CREATE TABLE IF NOT EXISTS curriculum_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES curriculum_programs(id) ON DELETE CASCADE,
    unit_no INT NOT NULL,
    title TEXT NOT NULL,
    total_lessons INT NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, unit_no)
);

-- Tạo bảng curriculum_unit_lessons
CREATE TABLE IF NOT EXISTS curriculum_unit_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
    lesson_no INT NOT NULL,
    title TEXT NOT NULL,
    session_pattern TEXT NOT NULL, -- "1&2" | "3" | "4&5" | "6&7"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(unit_id, lesson_no)
);
