-- Add payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending';
