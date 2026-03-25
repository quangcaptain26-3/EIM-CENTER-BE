-- Mô tả: Hệ thống — audit logs và thông báo user (FK auth_users).

SET client_encoding = 'UTF8';

-- ============================================================
-- MODULE 9A: HE THONG - AUDIT LOGS & NOTIFICATIONS
-- ============================================================
-- Dam bao pgcrypto duoc kich hoat de dung gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- BANG: system_audit_logs
-- Ghi lai moi hanh dong quan trong trong he thong (ai lam gi, khi nao)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Nguoi thuc hien hanh dong (NULL neu la he thong tu dong / anonymous)
    actor_user_id   UUID        NULL REFERENCES auth_users(id) ON DELETE SET NULL,

    -- Vi du: "AUTH_LOGIN", "STUDENT_CREATE", "INVOICE_CREATE"
    action          TEXT        NOT NULL,

    -- Ten entity bi tac dong, vi du: "auth_user", "student", "invoice"
    entity          TEXT        NOT NULL,

    -- UUID cua ban ghi entity bi tac dong (NULL neu action khong gan voi entity cu the)
    entity_id       UUID        NULL,

    -- Thong tin bo sung linh hoat (IP, payload diff, user-agent, v.v.)
    meta            JSONB       NOT NULL DEFAULT '{}'::JSONB,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de tra cuu nhanh theo nguoi thuc hien
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON system_audit_logs (actor_user_id);

-- Index de loc theo loai hanh dong
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON system_audit_logs (action);

-- Index de truy van log theo thoi gian (DESC de lay moi nhat nhanh nhat)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON system_audit_logs (created_at DESC);

-- ============================================================
-- BANG: system_notifications
-- Thong bao gui den tung user trong he thong
-- ============================================================
CREATE TABLE IF NOT EXISTS system_notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User nhận thông báo; xoá user thì xoá luôn thông báo của họ
    user_id     UUID        NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,

    -- Tiêu đề thông báo
    title       TEXT        NOT NULL,

    -- Nội dung chi tiết thông báo
    body        TEXT        NOT NULL,

    -- Đã đọc hay chưa (mặc định chưa đọc)
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de lay tat ca thong bao cua mot user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON system_notifications (user_id);

-- Index de loc thong bao chua doc cua user (dung cho badge count)
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON system_notifications (user_id, is_read)
    WHERE is_read = FALSE;

-- Index de sap xep thong bao moi nhat len dau
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON system_notifications (created_at DESC);
