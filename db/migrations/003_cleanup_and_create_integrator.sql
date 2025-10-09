-- Clear all existing integrators, projects, and related data
-- This is a destructive operation and should only be used in development
BEGIN;

-- To avoid foreign key constraints, we'll need to delete from child tables first
-- The order is important.
DELETE FROM "public"."gui_file_versions";
DELETE FROM "public"."gui_files";
DELETE FROM "public"."sync_history";
DELETE FROM "public"."scenes";
DELETE FROM "public"."device_controls";
DELETE FROM "public"."devices";
DELETE FROM "public"."controllers";
DELETE FROM "public"."projects";
DELETE FROM "public"."ai_usage";
DELETE FROM "public"."ai_api_keys";
DELETE FROM "public"."images";
DELETE FROM "public"."integrators";

-- Reset sequences if you have any auto-incrementing IDs that you want to start from 1
-- For UUIDs this is not strictly necessary, but good practice for serials.

-- Add a new default integrator for development
INSERT INTO "public"."integrators" ("name", "email", "password_hash", "subscription_tier", "status")
VALUES
('Test Integrator', 'test@test.com', '$2b$10$RQsz6amAAlUoWxgE0ix1KO2Y7kg.A1oyfUytUG3mFAUKogdMPZK2i', 'free', 'active');

COMMIT;
