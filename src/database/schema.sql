-- ============================================================
-- Conecta Finanças — Schema completo (schema: financas)
-- ============================================================
-- Plataforma financeira para casais
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run)
-- Usa schema separado "financas" para coexistir com outros projetos no mesmo Supabase
-- ============================================================

create extension if not exists pgcrypto;

-- Criar schema separado
create schema if not exists financas;

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfis de usuário (vinculado ao auth.users)
create table financas.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Casal (ambiente financeiro compartilhado)
create table financas.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nosso Casal',
  created_at timestamptz not null default now()
);

-- Membros do casal
create table financas.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'partner')),
  label text not null,
  created_at timestamptz not null default now(),
  unique (couple_id, profile_id)
);

-- Contas bancárias
create table financas.accounts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  name text not null,
  type text not null default 'checking' check (type in ('checking', 'savings', 'digital', 'cash', 'wallet', 'other')),
  balance numeric(14, 2) not null default 0,
  color text not null default '#0A6EFA',
  icon text not null default 'wallet',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Categorias (com seed padrão + customizáveis pelo casal)
create table financas.categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references financas.couples(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null default 'tag',
  color text not null default '#6B7280',
  created_at timestamptz not null default now()
);

-- Entradas (receitas)
create table financas.income (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  account_id uuid references financas.accounts(id) on delete set null,
  category_id uuid references financas.categories(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  type text not null default 'other' check (type in ('salary', 'allowance', 'bonus', 'extra', 'daily', 'other')),
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'scheduled', 'cancelled')),
  paid_at timestamptz,
  payment_method text,
  visibility text not null default 'shared' check (visibility in ('individual', 'shared', 'household', 'children')),
  notes text,
  created_at timestamptz not null default now()
);

-- Despesas
create table financas.expenses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  account_id uuid references financas.accounts(id) on delete set null,
  category_id uuid references financas.categories(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'scheduled', 'cancelled')),
  paid_at timestamptz,
  payment_method text,
  payment_account_id uuid references financas.accounts(id) on delete set null,
  visibility text not null default 'shared' check (visibility in ('individual', 'shared', 'household', 'children')),
  notes text,
  attachment_url text,
  created_at timestamptz not null default now()
);

-- Divisão de despesas
create table financas.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references financas.expenses(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  amount numeric(14, 2) not null,
  percentage numeric(5, 2),
  created_at timestamptz not null default now()
);

-- Cartões de crédito
create table financas.cards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  name text not null,
  bank text not null,
  credit_limit numeric(14, 2) not null default 0,
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  shared boolean not null default false,
  color text not null default '#8B5CF6',
  icon text not null default 'credit-card',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Compras no cartão
create table financas.card_transactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  card_id uuid not null references financas.cards(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  category_id uuid references financas.categories(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  total_installments integer not null default 1 check (total_installments >= 1),
  visibility text not null default 'shared' check (visibility in ('individual', 'shared', 'household', 'children')),
  notes text,
  created_at timestamptz not null default now()
);

-- Parcelas (geradas automaticamente a partir de card_transactions)
create table financas.installments (
  id uuid primary key default gen_random_uuid(),
  card_transaction_id uuid not null references financas.card_transactions(id) on delete cascade,
  card_id uuid not null references financas.cards(id) on delete cascade,
  number integer not null,
  amount numeric(14, 2) not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'scheduled', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Faturas dos cartões
create table financas.invoices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references financas.cards(id) on delete cascade,
  couple_id uuid not null references financas.couples(id) on delete cascade,
  reference_month text not null,
  closing_date date not null,
  due_date date not null,
  total_amount numeric(14, 2) not null default 0,
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'scheduled', 'cancelled')),
  paid_at timestamptz,
  payment_account_id uuid references financas.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (card_id, reference_month)
);

-- Contas fixas / recorrentes
create table financas.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  category_id uuid references financas.categories(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_day integer not null check (due_day between 1 and 31),
  recurrence text not null default 'monthly' check (recurrence in ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')),
  account_id uuid references financas.accounts(id) on delete set null,
  visibility text not null default 'shared' check (visibility in ('individual', 'shared', 'household', 'children')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Diárias
create table financas.daily_income (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  date date not null default current_date,
  quantity integer not null default 1 check (quantity > 0),
  rate numeric(14, 2) not null check (rate > 0),
  total numeric(14, 2) generated always as (quantity * rate) stored,
  description text,
  account_id uuid references financas.accounts(id) on delete set null,
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Transferências entre contas
create table financas.transfers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid not null references financas.profiles(id),
  from_account_id uuid not null references financas.accounts(id),
  to_account_id uuid not null references financas.accounts(id),
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  check (from_account_id != to_account_id)
);

-- Metas financeiras
create table financas.financial_goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid references financas.profiles(id),
  name text not null,
  icon text not null default 'target',
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0,
  deadline date,
  monthly_contribution numeric(14, 2),
  description text,
  created_at timestamptz not null default now()
);

-- Notificações
create table financas.notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  profile_id uuid references financas.profiles(id),
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('overdue', 'due_soon', 'invoice', 'installment', 'salary', 'goal', 'info')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Comprovantes / anexos
create table financas.attachments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_url text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

-- Fechamento mensal
create table financas.monthly_closings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references financas.couples(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  total_income numeric(14, 2) not null default 0,
  total_expenses numeric(14, 2) not null default 0,
  total_cards numeric(14, 2) not null default 0,
  total_installments numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  data jsonb not null default '{}',
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (couple_id, year, month)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index idx_profiles_auth on financas.profiles(auth_user_id);
create index idx_couple_members_couple on financas.couple_members(couple_id);
create index idx_couple_members_profile on financas.couple_members(profile_id);
create index idx_accounts_couple on financas.accounts(couple_id);
create index idx_income_couple_date on financas.income(couple_id, date);
create index idx_expenses_couple_date on financas.expenses(couple_id, date);
create index idx_cards_couple on financas.cards(couple_id);
create index idx_card_transactions_card on financas.card_transactions(card_id);
create index idx_card_transactions_couple_date on financas.card_transactions(couple_id, date);
create index idx_installments_card on financas.installments(card_id);
create index idx_installments_due on financas.installments(due_date, status);
create index idx_invoices_card on financas.invoices(card_id);
create index idx_fixed_expenses_couple on financas.fixed_expenses(couple_id);
create index idx_daily_income_couple on financas.daily_income(couple_id, date);
create index idx_transfers_couple on financas.transfers(couple_id);
create index idx_goals_couple on financas.financial_goals(couple_id);
create index idx_notifications_couple on financas.notifications(couple_id, read);
create index idx_attachments_entity on financas.attachments(entity_type, entity_id);
create index idx_closings_couple on financas.monthly_closings(couple_id, year, month);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table financas.profiles enable row level security;
alter table financas.couples enable row level security;
alter table financas.couple_members enable row level security;
alter table financas.accounts enable row level security;
alter table financas.categories enable row level security;
alter table financas.income enable row level security;
alter table financas.expenses enable row level security;
alter table financas.expense_splits enable row level security;
alter table financas.cards enable row level security;
alter table financas.card_transactions enable row level security;
alter table financas.installments enable row level security;
alter table financas.invoices enable row level security;
alter table financas.fixed_expenses enable row level security;
alter table financas.daily_income enable row level security;
alter table financas.transfers enable row level security;
alter table financas.financial_goals enable row level security;
alter table financas.notifications enable row level security;
alter table financas.attachments enable row level security;
alter table financas.monthly_closings enable row level security;

-- Helper: retorna os couple_ids a que o usuário logado pertence
create or replace function financas.my_couple_ids()
returns setof uuid
language sql stable security definer
as $$
  select cm.couple_id
  from financas.couple_members cm
  join financas.profiles p on p.id = cm.profile_id
  where p.auth_user_id = auth.uid()
$$;

-- Helper: retorna o profile_id do usuário logado
create or replace function financas.my_profile_id()
returns uuid
language sql stable security definer
as $$
  select id from financas.profiles where auth_user_id = auth.uid() limit 1
$$;

-- === PROFILES ===
create policy profiles_select on financas.profiles for select to authenticated
  using (auth_user_id = auth.uid() or id in (
    select cm2.profile_id from financas.couple_members cm2
    where cm2.couple_id in (select financas.my_couple_ids())
  ));
create policy profiles_insert on financas.profiles for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy profiles_update on financas.profiles for update to authenticated
  using (auth_user_id = auth.uid());

-- === COUPLES ===
create policy couples_select on financas.couples for select to authenticated
  using (id in (select financas.my_couple_ids()));
create policy couples_insert on financas.couples for insert to authenticated
  with check (true);
create policy couples_update on financas.couples for update to authenticated
  using (id in (select financas.my_couple_ids()));

-- === COUPLE_MEMBERS ===
create policy cm_select on financas.couple_members for select to authenticated
  using (couple_id in (select financas.my_couple_ids()));
create policy cm_insert on financas.couple_members for insert to authenticated
  with check (profile_id = financas.my_profile_id() or couple_id in (select financas.my_couple_ids()));
create policy cm_delete on financas.couple_members for delete to authenticated
  using (couple_id in (select financas.my_couple_ids()));

-- === Macro: policy para tabelas com couple_id ===

-- ACCOUNTS
create policy accounts_select on financas.accounts for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy accounts_insert on financas.accounts for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy accounts_update on financas.accounts for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy accounts_delete on financas.accounts for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- CATEGORIES
create policy cat_select on financas.categories for select to authenticated using (couple_id is null or couple_id in (select financas.my_couple_ids()));
create policy cat_insert on financas.categories for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy cat_update on financas.categories for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy cat_delete on financas.categories for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- INCOME
create policy income_select on financas.income for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy income_insert on financas.income for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy income_update on financas.income for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy income_delete on financas.income for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- EXPENSES
create policy expenses_select on financas.expenses for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy expenses_insert on financas.expenses for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy expenses_update on financas.expenses for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy expenses_delete on financas.expenses for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- EXPENSE_SPLITS
create policy splits_select on financas.expense_splits for select to authenticated
  using (expense_id in (select id from financas.expenses where couple_id in (select financas.my_couple_ids())));
create policy splits_insert on financas.expense_splits for insert to authenticated
  with check (expense_id in (select id from financas.expenses where couple_id in (select financas.my_couple_ids())));
create policy splits_delete on financas.expense_splits for delete to authenticated
  using (expense_id in (select id from financas.expenses where couple_id in (select financas.my_couple_ids())));

-- CARDS
create policy cards_select on financas.cards for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy cards_insert on financas.cards for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy cards_update on financas.cards for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy cards_delete on financas.cards for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- CARD_TRANSACTIONS
create policy ct_select on financas.card_transactions for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy ct_insert on financas.card_transactions for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy ct_update on financas.card_transactions for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy ct_delete on financas.card_transactions for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- INSTALLMENTS
create policy inst_select on financas.installments for select to authenticated
  using (card_id in (select id from financas.cards where couple_id in (select financas.my_couple_ids())));
create policy inst_insert on financas.installments for insert to authenticated
  with check (card_id in (select id from financas.cards where couple_id in (select financas.my_couple_ids())));
create policy inst_update on financas.installments for update to authenticated
  using (card_id in (select id from financas.cards where couple_id in (select financas.my_couple_ids())));

-- INVOICES
create policy inv_select on financas.invoices for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy inv_insert on financas.invoices for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy inv_update on financas.invoices for update to authenticated using (couple_id in (select financas.my_couple_ids()));

-- FIXED_EXPENSES
create policy fe_select on financas.fixed_expenses for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy fe_insert on financas.fixed_expenses for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy fe_update on financas.fixed_expenses for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy fe_delete on financas.fixed_expenses for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- DAILY_INCOME
create policy di_select on financas.daily_income for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy di_insert on financas.daily_income for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy di_update on financas.daily_income for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy di_delete on financas.daily_income for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- TRANSFERS
create policy tr_select on financas.transfers for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy tr_insert on financas.transfers for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy tr_delete on financas.transfers for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- FINANCIAL_GOALS
create policy fg_select on financas.financial_goals for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy fg_insert on financas.financial_goals for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy fg_update on financas.financial_goals for update to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy fg_delete on financas.financial_goals for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- NOTIFICATIONS
create policy notif_select on financas.notifications for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy notif_insert on financas.notifications for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy notif_update on financas.notifications for update to authenticated using (couple_id in (select financas.my_couple_ids()));

-- ATTACHMENTS
create policy att_select on financas.attachments for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy att_insert on financas.attachments for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy att_delete on financas.attachments for delete to authenticated using (couple_id in (select financas.my_couple_ids()));

-- MONTHLY_CLOSINGS
create policy mc_select on financas.monthly_closings for select to authenticated using (couple_id in (select financas.my_couple_ids()));
create policy mc_insert on financas.monthly_closings for insert to authenticated with check (couple_id in (select financas.my_couple_ids()));
create policy mc_update on financas.monthly_closings for update to authenticated using (couple_id in (select financas.my_couple_ids()));

-- ============================================================
-- GRANTS
-- ============================================================

grant usage on schema financas to authenticated, anon;
grant select, insert, update, delete on all tables in schema financas to authenticated;

-- ============================================================
-- TRIGGER: auto-criar profile quando um usuário se cadastra
-- ============================================================

create or replace function financas.handle_new_user()
returns trigger
language plpgsql security definer set search_path = financas
as $$
begin
  insert into financas.profiles (auth_user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function financas.handle_new_user();

-- ============================================================
-- TRIGGER: gerar parcelas automaticamente ao criar compra no cartão
-- ============================================================

create or replace function financas.generate_installments()
returns trigger
language plpgsql security definer set search_path = financas
as $$
declare
  i integer;
  installment_amount numeric(14,2);
  card_record record;
  base_date date;
begin
  if new.total_installments <= 0 then
    return new;
  end if;

  select * into card_record from financas.cards where id = new.card_id;
  installment_amount := round(new.amount / new.total_installments, 2);
  base_date := new.date;

  for i in 1..new.total_installments loop
    insert into financas.installments (card_transaction_id, card_id, number, amount, due_date, status)
    values (
      new.id,
      new.card_id,
      i,
      installment_amount,
      (base_date + (i || ' months')::interval)::date,
      'pending'
    );
  end loop;

  return new;
end;
$$;

create trigger on_card_transaction_created
  after insert on financas.card_transactions
  for each row execute function financas.generate_installments();

-- ============================================================
-- TRIGGER: atualizar saldo da conta ao dar baixa em income/expense
-- ============================================================

create or replace function financas.update_account_balance_income()
returns trigger
language plpgsql security definer set search_path = financas
as $$
begin
  if new.status = 'paid' and (old.status is null or old.status != 'paid') and new.account_id is not null then
    update financas.accounts set balance = balance + new.amount where id = new.account_id;
  end if;
  if old.status = 'paid' and new.status != 'paid' and old.account_id is not null then
    update financas.accounts set balance = balance - old.amount where id = old.account_id;
  end if;
  return new;
end;
$$;

create trigger on_income_status_change
  after update on financas.income
  for each row execute function financas.update_account_balance_income();

create or replace function financas.update_account_balance_expense()
returns trigger
language plpgsql security definer set search_path = financas
as $$
begin
  if new.status = 'paid' and (old.status is null or old.status != 'paid') then
    if new.payment_account_id is not null then
      update financas.accounts set balance = balance - new.amount where id = new.payment_account_id;
    elsif new.account_id is not null then
      update financas.accounts set balance = balance - new.amount where id = new.account_id;
    end if;
  end if;
  if old.status = 'paid' and new.status != 'paid' then
    if old.payment_account_id is not null then
      update financas.accounts set balance = balance + old.amount where id = old.payment_account_id;
    elsif old.account_id is not null then
      update financas.accounts set balance = balance + old.amount where id = old.account_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_expense_status_change
  after update on financas.expenses
  for each row execute function financas.update_account_balance_expense();

-- TRIGGER: atualizar saldo ao transferir
create or replace function financas.handle_transfer()
returns trigger
language plpgsql security definer set search_path = financas
as $$
begin
  update financas.accounts set balance = balance - new.amount where id = new.from_account_id;
  update financas.accounts set balance = balance + new.amount where id = new.to_account_id;
  return new;
end;
$$;

create trigger on_transfer_created
  after insert on financas.transfers
  for each row execute function financas.handle_transfer();

-- ============================================================
-- SEED: Categorias padrão
-- ============================================================

-- Categorias de entrada
insert into financas.categories (couple_id, name, type, icon, color) values
  (null, 'Salário', 'income', 'banknote', '#10B981'),
  (null, 'Vale', 'income', 'ticket', '#06B6D4'),
  (null, 'Bonificação', 'income', 'gift', '#8B5CF6'),
  (null, 'Renda Extra', 'income', 'plus-circle', '#F59E0B'),
  (null, 'Diária', 'income', 'clock', '#3B82F6'),
  (null, 'Outros', 'income', 'circle-dot', '#6B7280');

-- Categorias de despesa
insert into financas.categories (couple_id, name, type, icon, color) values
  (null, 'Alimentação', 'expense', 'utensils', '#EF4444'),
  (null, 'Casa', 'expense', 'home', '#F97316'),
  (null, 'Transporte', 'expense', 'car', '#3B82F6'),
  (null, 'Saúde', 'expense', 'heart-pulse', '#10B981'),
  (null, 'Educação', 'expense', 'graduation-cap', '#8B5CF6'),
  (null, 'Lazer', 'expense', 'gamepad-2', '#EC4899'),
  (null, 'Compras', 'expense', 'shopping-bag', '#F59E0B'),
  (null, 'Serviços', 'expense', 'wrench', '#6366F1'),
  (null, 'Assinaturas', 'expense', 'repeat', '#14B8A6'),
  (null, 'Outros', 'expense', 'circle-dot', '#6B7280');

-- ============================================================
-- STORAGE: bucket para comprovantes
-- ============================================================

insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false) on conflict (id) do nothing;

create policy att_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy att_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
create policy att_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments');
