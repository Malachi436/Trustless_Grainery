-- Credit Payment Tracking Tables
-- Allows owners to track partial/full payments for credit transactions

-- Payment tracking summary (current state)
CREATE TABLE IF NOT EXISTS credit_payment_tracking (
  transaction_id UUID PRIMARY KEY REFERENCES transaction_projections(transaction_id),
  total_amount DECIMAL(10, 2) NOT NULL,
  total_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL, -- PENDING, PAID
  last_payment_date TIMESTAMP,
  last_payment_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment history (audit trail of all payments)
CREATE TABLE IF NOT EXISTS credit_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transaction_projections(transaction_id),
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_tracking_status ON credit_payment_tracking(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_tracking_last_payment ON credit_payment_tracking(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_credit_history_transaction ON credit_payment_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_date ON credit_payment_history(payment_date);

COMMENT ON TABLE credit_payment_tracking IS 'Tracks cumulative payment state for credit transactions';
COMMENT ON TABLE credit_payment_history IS 'Audit trail of all payment recordings for credit transactions';
