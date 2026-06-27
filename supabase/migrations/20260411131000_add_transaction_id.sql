-- Add transaction_id column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;
