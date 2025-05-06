-- Add payment_mode and payment_date columns to the payment_history table
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('Cash', 'UPI', 'Loan')) DEFAULT 'Cash';
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;

-- Add a comment explaining the changes
COMMENT ON COLUMN payment_history.payment_mode IS 'Payment mode: Cash, UPI, or Loan';
COMMENT ON COLUMN payment_history.payment_date IS 'Date when the payment was made (can be different from created_at)'; 