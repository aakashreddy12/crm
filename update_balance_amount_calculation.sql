-- First, drop the existing generated column
ALTER TABLE projects DROP COLUMN balance_amount;

-- Re-add the column with the updated calculation
ALTER TABLE projects ADD COLUMN balance_amount 
    DECIMAL GENERATED ALWAYS AS (proposal_amount - advance_payment - COALESCE(paid_amount, 0) - COALESCE(loan_amount, 0)) STORED;

-- Add a comment explaining the change
COMMENT ON COLUMN projects.balance_amount IS 'Balance amount after subtracting advance payment, paid amount, and loan amount from proposal amount'; 