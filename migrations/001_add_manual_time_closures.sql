-- Migration: Add manual_time_closures table
-- Date: 2025-11-06
-- Description: Allow admins to manually close specific time slots for reservations

BEGIN;

-- Create manual_time_closures table
CREATE TABLE IF NOT EXISTS manual_time_closures (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    closure_date DATE NOT NULL,
    period VARCHAR(20) NOT NULL,
    time_slot_start VARCHAR(5) NOT NULL,
    time_slot_end VARCHAR(5),
    service_id TEXT,
    reason TEXT,
    created_by VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    -- Foreign key to services table
    CONSTRAINT fk_manual_closures_service
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    -- Unique constraint: prevent duplicate closures
    CONSTRAINT unique_closure
        UNIQUE (closure_date, period, time_slot_start, service_id)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_closures_date_active
    ON manual_time_closures(closure_date, is_active);

CREATE INDEX IF NOT EXISTS idx_closures_date_period_active
    ON manual_time_closures(closure_date, period, is_active);

CREATE INDEX IF NOT EXISTS idx_closures_service
    ON manual_time_closures(service_id);

-- Add comment for documentation
COMMENT ON TABLE manual_time_closures IS 'Stores manually closed time slots by administrators';

COMMIT;
