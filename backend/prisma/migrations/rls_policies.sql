-- RLS Policies for MeritView
-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_prep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediators ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediator_partnerships ENABLE ROW LEVEL SECURITY;

-- Users: only yourself or admins
CREATE POLICY user_isolation ON users
  FOR ALL
  USING (id = current_setting('app.current_user_id')::VARCHAR
         OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT'));

-- Disputes: initiator, party, admin, support
CREATE POLICY dispute_isolation ON disputes
  FOR ALL
  USING (
    initiator_user_id = current_setting('app.current_user_id')::VARCHAR
    OR id IN (
      SELECT dispute_id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Parties: only if you are the user, or admin
CREATE POLICY party_isolation ON parties
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id')::VARCHAR
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Briefs: through party membership
CREATE POLICY brief_isolation ON briefs
  FOR ALL
  USING (
    party_id IN (
      SELECT id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Documents: through dispute membership
CREATE POLICY document_isolation ON documents
  FOR ALL
  USING (
    dispute_id IN (
      SELECT dispute_id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR uploaded_by_user_id = current_setting('app.current_user_id')::VARCHAR
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Payments: only your own or admin
CREATE POLICY payment_isolation ON payments
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id')::VARCHAR
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Opinions: through dispute membership
CREATE POLICY opinion_isolation ON opinions
  FOR ALL
  USING (
    dispute_id IN (
      SELECT dispute_id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Evaluator outputs: through dispute membership
CREATE POLICY evaluator_isolation ON evaluator_outputs
  FOR ALL
  USING (
    dispute_id IN (
      SELECT dispute_id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Brief prep sessions: through party membership
CREATE POLICY brief_prep_isolation ON brief_prep_sessions
  FOR ALL
  USING (
    party_id IN (
      SELECT id FROM parties
      WHERE user_id = current_setting('app.current_user_id')::VARCHAR
    )
    OR current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );

-- Audit events: admin or support only
CREATE POLICY audit_event_isolation ON audit_events
  FOR ALL
  USING (
    current_setting('app.current_user_role') IN ('ADMIN', 'SUPPORT')
  );
