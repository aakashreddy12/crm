-- Update the balance_amount column calculation to exclude loan_amount
-- Drop the existing generated column
ALTER TABLE projects DROP COLUMN balance_amount;

-- Re-add the column with the updated calculation that excludes loan_amount
ALTER TABLE projects ADD COLUMN balance_amount 
    DECIMAL GENERATED ALWAYS AS (proposal_amount - advance_payment - COALESCE(paid_amount, 0)) STORED;

-- Add a comment explaining the change
COMMENT ON COLUMN projects.balance_amount IS 'Balance amount after subtracting advance payment and paid amount from proposal amount (excluding loan amount)'; 