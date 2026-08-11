-- ============================================================
-- Conecta Finanças — Schema completo para Supabase
-- Executar no SQL Editor: https://supabase.com/dashboard/project/sifpkzbtcsekovqbhwob/sql/new
-- ============================================================

-- 1. Criar schema dedicado
CREATE SCHEMA IF NOT EXISTS financas;

-- 2. Perfis (vinculado ao auth.users)
CREATE TABLE financas.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Casais
CREATE TABLE financas.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Nosso Casal',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Membros do casal
CREATE TABLE financas.couple_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','partner')),
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(couple_id, profile_id)
);

-- 5. Contas bancárias
CREATE TABLE financas.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'checking' CHECK (type IN ('checking','savings','digital','cash','wallet','other')),
  balance numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3B82F6',
  icon text NOT NULL DEFAULT 'Wallet',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Categorias
CREATE TABLE financas.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES financas.couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  icon text NOT NULL DEFAULT 'Tag',
  color text NOT NULL DEFAULT '#6B7280'
);

-- 7. Entradas (receitas)
CREATE TABLE financas.income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES financas.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES financas.categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('salary','allowance','bonus','extra','daily','other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','scheduled','cancelled')),
  paid_at timestamptz,
  payment_method text,
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('individual','shared','household','children')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Despesas
CREATE TABLE financas.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES financas.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES financas.categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','scheduled','cancelled')),
  paid_at timestamptz,
  payment_method text,
  payment_account_id uuid REFERENCES financas.accounts(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('individual','shared','household','children')),
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Cartões de crédito
CREATE TABLE financas.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  bank text NOT NULL DEFAULT '',
  credit_limit numeric NOT NULL DEFAULT 0,
  closing_day int NOT NULL DEFAULT 1,
  due_day int NOT NULL DEFAULT 10,
  shared boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#8B5CF6',
  icon text NOT NULL DEFAULT 'CreditCard',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Transações do cartão
CREATE TABLE financas.card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES financas.cards(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES financas.categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_installments int NOT NULL DEFAULT 1,
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('individual','shared','household','children')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Parcelas
CREATE TABLE financas.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_transaction_id uuid NOT NULL REFERENCES financas.card_transactions(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES financas.cards(id) ON DELETE CASCADE,
  number int NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','scheduled','cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Contas fixas
CREATE TABLE financas.fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES financas.categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_day int NOT NULL DEFAULT 1,
  recurrence text NOT NULL DEFAULT 'monthly' CHECK (recurrence IN ('monthly','bimonthly','quarterly','semiannual','annual')),
  account_id uuid REFERENCES financas.accounts(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('individual','shared','household','children')),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Diárias
CREATE TABLE financas.daily_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  quantity int NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  description text,
  account_id uuid REFERENCES financas.accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','scheduled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Transferências
CREATE TABLE financas.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES financas.profiles(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES financas.accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES financas.accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Metas financeiras
CREATE TABLE financas.financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES financas.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Target',
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  monthly_contribution numeric,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Notificações
CREATE TABLE financas.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES financas.couples(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES financas.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('overdue','due_soon','invoice','installment','salary','goal','info')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security) — cada usuário só vê dados do seu casal
-- ============================================================

ALTER TABLE financas.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.daily_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financas.notifications ENABLE ROW LEVEL SECURITY;

-- Função helper: pega o couple_id do usuário logado
CREATE OR REPLACE FUNCTION financas.my_couple_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cm.couple_id
  FROM financas.couple_members cm
  JOIN financas.profiles p ON p.id = cm.profile_id
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Profiles: usuário vê só o seu
CREATE POLICY profiles_own ON financas.profiles FOR ALL USING (auth_user_id = auth.uid());

-- Couples: usuário vê o casal que pertence
CREATE POLICY couples_member ON financas.couples FOR ALL USING (id = financas.my_couple_id());

-- Couple members: usuário vê membros do seu casal
CREATE POLICY couple_members_own ON financas.couple_members FOR ALL USING (couple_id = financas.my_couple_id());

-- Tabelas que usam couple_id
CREATE POLICY accounts_couple ON financas.accounts FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY categories_couple ON financas.categories FOR ALL USING (couple_id = financas.my_couple_id() OR couple_id IS NULL);
CREATE POLICY income_couple ON financas.income FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY expenses_couple ON financas.expenses FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY cards_couple ON financas.cards FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY card_transactions_couple ON financas.card_transactions FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY fixed_expenses_couple ON financas.fixed_expenses FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY daily_income_couple ON financas.daily_income FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY transfers_couple ON financas.transfers FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY financial_goals_couple ON financas.financial_goals FOR ALL USING (couple_id = financas.my_couple_id());
CREATE POLICY notifications_couple ON financas.notifications FOR ALL USING (couple_id = financas.my_couple_id());

-- Installments: via card_transaction → couple_id
CREATE POLICY installments_couple ON financas.installments FOR ALL USING (
  card_id IN (SELECT id FROM financas.cards WHERE couple_id = financas.my_couple_id())
);

-- ============================================================
-- Trigger: criar perfil + casal automaticamente ao cadastrar
-- ============================================================

CREATE OR REPLACE FUNCTION financas.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = financas
AS $$
DECLARE
  new_profile_id uuid;
  new_couple_id uuid;
BEGIN
  INSERT INTO financas.profiles (auth_user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email, ''))
  RETURNING id INTO new_profile_id;

  INSERT INTO financas.couples (name)
  VALUES ('Nosso Casal')
  RETURNING id INTO new_couple_id;

  INSERT INTO financas.couple_members (couple_id, profile_id, role, label)
  VALUES (new_couple_id, new_profile_id, 'owner', COALESCE(NEW.raw_user_meta_data->>'name', ''));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION financas.handle_new_user();

-- ============================================================
-- Índices para performance
-- ============================================================

CREATE INDEX idx_income_couple_date ON financas.income(couple_id, date);
CREATE INDEX idx_expenses_couple_date ON financas.expenses(couple_id, date);
CREATE INDEX idx_card_tx_couple_date ON financas.card_transactions(couple_id, date);
CREATE INDEX idx_card_tx_card ON financas.card_transactions(card_id);
CREATE INDEX idx_installments_card ON financas.installments(card_id);
CREATE INDEX idx_daily_income_couple_date ON financas.daily_income(couple_id, date);
CREATE INDEX idx_transfers_couple_date ON financas.transfers(couple_id, date);
CREATE INDEX idx_profiles_auth ON financas.profiles(auth_user_id);
CREATE INDEX idx_couple_members_profile ON financas.couple_members(profile_id);
CREATE INDEX idx_couple_members_couple ON financas.couple_members(couple_id);

-- ============================================================
-- Expor schema financas via API (PostgREST)
-- ============================================================

-- Adicionar 'financas' aos schemas expostos:
-- Vá em Settings > API > Schema Settings > adicione "financas"
-- Ou execute:
ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, financas';
NOTIFY pgrst, 'reload config';

-- FIM
