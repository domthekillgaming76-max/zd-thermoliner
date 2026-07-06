
/*
# Fix: transactions DELETE policy + bank_statements column aliases

## Summary
Two gaps blocking BankPage from working correctly:

### 1. Transactions — missing DELETE policy
The `transactions` table had SELECT, INSERT, UPDATE policies but no DELETE policy.
BankPage.handleDelete() calls `.delete()` which silently fails for all authenticated users.
Fix: add DELETE policy allowing managers (pdg/patron/directeur) to delete non-auto-generated transactions,
and allow any authenticated user to delete their own manual transactions.

### 2. bank_statements — column name mismatch
BankPage reads: `total_transactions`, `net_balance`, `total_credits`, `total_debits`, `fuel_expenses`, `salary_expenses`
DB has:         `(count)`,             `net_profit`,  `total_income`,  `total_expense`, `total_fuel`,     `total_salary`
Fix: add generated columns that alias the existing columns so BankPage works without code changes.

### 3. Seed company_bank_account if empty
Ensures at least one bank account row exists so the balance card shows data.
*/

-- 1. Add DELETE policy on transactions
DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
TO authenticated
USING (
  auto_generated IS NOT TRUE
  AND (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('pdg','patron','directeur')
    )
  )
);

-- 2. Add alias columns to bank_statements to match BankPage expectations
-- net_balance = net_profit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'net_balance'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN net_balance numeric GENERATED ALWAYS AS (net_profit) STORED;
  END IF;
END $$;

-- total_credits = total_income
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_credits'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN total_credits numeric GENERATED ALWAYS AS (total_income) STORED;
  END IF;
END $$;

-- total_debits = total_expense
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_debits'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN total_debits numeric GENERATED ALWAYS AS (total_expense) STORED;
  END IF;
END $$;

-- fuel_expenses = total_fuel
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'fuel_expenses'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN fuel_expenses numeric GENERATED ALWAYS AS (total_fuel) STORED;
  END IF;
END $$;

-- salary_expenses = total_salary
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'salary_expenses'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN salary_expenses numeric GENERATED ALWAYS AS (total_salary) STORED;
  END IF;
END $$;

-- total_transactions — computed from transactions table via a view alternative:
-- Since GENERATED ALWAYS can't reference another table, add a regular column updated by the RPC
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_transactions'
  ) THEN
    ALTER TABLE bank_statements ADD COLUMN total_transactions integer DEFAULT 0;
  END IF;
END $$;

-- Backfill total_transactions for existing rows
UPDATE bank_statements bs
SET total_transactions = (
  SELECT COUNT(*)::integer
  FROM transactions t
  WHERE EXTRACT(MONTH FROM t.date)::integer = bs.month
    AND EXTRACT(YEAR FROM t.date)::integer = bs.year
);

-- 3. Recreate generate_bank_statement RPC to also populate total_transactions
CREATE OR REPLACE FUNCTION generate_bank_statement(target_month integer, target_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening decimal(12,2) := 0;
  v_income decimal(12,2); v_expense decimal(12,2); v_salary decimal(12,2);
  v_fuel decimal(12,2); v_toll decimal(12,2); v_maint decimal(12,2); v_rent decimal(12,2);
  v_count integer;
BEGIN
  SELECT COALESCE(closing_balance, 0) INTO v_opening FROM bank_statements
  WHERE (year = target_year AND month = target_month - 1)
     OR (target_month = 1 AND year = target_year - 1 AND month = 12)
  ORDER BY year DESC, month DESC LIMIT 1;

  SELECT
    COALESCE(SUM(CASE WHEN type IN ('income','salary','bonus','transfer') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type NOT IN ('income','salary','bonus','transfer') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'salary' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'toll' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END), 0),
    COUNT(*)::integer
  INTO v_income, v_expense, v_salary, v_fuel, v_toll, v_maint, v_rent, v_count
  FROM transactions
  WHERE EXTRACT(MONTH FROM date)::integer = target_month
    AND EXTRACT(YEAR FROM date)::integer = target_year;

  INSERT INTO bank_statements (
    month, year, opening_balance, total_income, total_expense,
    total_salary, total_fuel, total_toll, total_maintenance, total_rent,
    closing_balance, net_profit, total_transactions
  ) VALUES (
    target_month, target_year,
    COALESCE(v_opening,0), COALESCE(v_income,0), COALESCE(v_expense,0),
    COALESCE(v_salary,0), COALESCE(v_fuel,0), COALESCE(v_toll,0),
    COALESCE(v_maint,0), COALESCE(v_rent,0),
    COALESCE(v_opening,0) + COALESCE(v_income,0) - COALESCE(v_expense,0),
    COALESCE(v_income,0) - COALESCE(v_expense,0),
    COALESCE(v_count,0)
  )
  ON CONFLICT (month, year) DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    total_salary = EXCLUDED.total_salary,
    total_fuel = EXCLUDED.total_fuel,
    total_toll = EXCLUDED.total_toll,
    total_maintenance = EXCLUDED.total_maintenance,
    total_rent = EXCLUDED.total_rent,
    closing_balance = EXCLUDED.closing_balance,
    net_profit = EXCLUDED.net_profit,
    total_transactions = EXCLUDED.total_transactions,
    generated_at = now();
END;
$$;

-- 4. Seed company_bank_account if empty
INSERT INTO company_bank_account (account_name, iban_rp, balance)
SELECT 'Z&D Thermoliner', 'FR76 1820 6004 5678 9012 3456 789', 0
WHERE NOT EXISTS (SELECT 1 FROM company_bank_account);
