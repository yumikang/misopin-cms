-- Fix Period enum type mismatch in manual_time_closures table
ALTER TABLE manual_time_closures
  ALTER COLUMN period TYPE "Period" USING period::text::"Period";
