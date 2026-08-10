import { supabase } from '../lib/supabase';
import type {
  Income, Expense, FixedExpense, BankAccount, Category,
  CreditCard, CardTransaction, Installment, Transfer, DailyIncome,
  FinancialGoal, Notification
} from '../types';

type TableName = 'income' | 'expenses' | 'fixed_expenses' | 'accounts' | 'categories'
  | 'cards' | 'card_transactions' | 'installments' | 'transfers'
  | 'daily_income' | 'financial_goals' | 'notifications';

// --- localStorage helpers for demo mode ---

function localKey(table: TableName) {
  return `conecta_demo_${table}`;
}

function localGet<T>(table: TableName): T[] {
  try {
    const raw = localStorage.getItem(localKey(table));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function localSet<T>(table: TableName, data: T[]) {
  localStorage.setItem(localKey(table), JSON.stringify(data));
}

function localQuery<T extends Record<string, unknown>>(table: TableName, coupleId: string, options?: {
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
  limit?: number;
}): T[] {
  let items = localGet<T>(table).filter(i => i.couple_id === coupleId || !i.couple_id);

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        items = items.filter(i => i[key] === value);
      }
    }
  }

  const orderBy = options?.orderBy || 'created_at';
  const asc = options?.ascending ?? false;
  items.sort((a, b) => {
    const va = String(a[orderBy] ?? '');
    const vb = String(b[orderBy] ?? '');
    return asc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  if (options?.limit) items = items.slice(0, options.limit);
  return items;
}

function localInsert<T extends Record<string, unknown>>(table: TableName, record: Partial<T>): T {
  const items = localGet<T>(table);
  const newItem = {
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as T;
  items.push(newItem);
  localSet(table, items);
  return newItem;
}

function localUpdate<T extends Record<string, unknown>>(table: TableName, id: string, updates: Partial<T>): T {
  const items = localGet<T>(table);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Item não encontrado');
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
  localSet(table, items);
  return items[idx];
}

function localRemove(table: TableName, id: string): void {
  const items = localGet<Record<string, unknown>>(table);
  localSet(table, items.filter(i => i.id !== id));
}

// --- Supabase + fallback ---

async function query<T extends Record<string, unknown>>(table: TableName, coupleId: string, options?: {
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
  limit?: number;
}): Promise<T[]> {
  if (!supabase) return localQuery<T>(table, coupleId, options);
  let q = supabase.from(table).select('*').eq('couple_id', coupleId);

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        q = q.eq(key, value);
      }
    }
  }

  q = q.order(options?.orderBy || 'created_at', { ascending: options?.ascending ?? false });

  if (options?.limit) q = q.limit(options.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as T[];
}

async function insert<T extends Record<string, unknown>>(table: TableName, record: Partial<T>): Promise<T> {
  if (!supabase) return localInsert<T>(table, record);
  const { data, error } = await supabase.from(table).insert(record as any).select().single();
  if (error) throw error;
  return data as T;
}

async function update<T extends Record<string, unknown>>(table: TableName, id: string, updates: Partial<T>): Promise<T> {
  if (!supabase) return localUpdate<T>(table, id, updates);
  const { data, error } = await supabase.from(table).update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
}

async function remove(table: TableName, id: string): Promise<void> {
  if (!supabase) { localRemove(table, id); return; }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export const incomeService = {
  list: (coupleId: string, filters?: Record<string, unknown>) =>
    query<Income>('income', coupleId, { orderBy: 'date', filters }),
  create: (data: Partial<Income>) => insert<Income>('income', data),
  update: (id: string, data: Partial<Income>) => update<Income>('income', id, data),
  delete: (id: string) => remove('income', id),
  markPaid: (id: string, accountId?: string) =>
    update<Income>('income', id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      ...(accountId ? { account_id: accountId } : {}),
    } as Partial<Income>),
};

export const expenseService = {
  list: (coupleId: string, filters?: Record<string, unknown>) =>
    query<Expense>('expenses', coupleId, { orderBy: 'date', filters }),
  create: (data: Partial<Expense>) => insert<Expense>('expenses', data),
  update: (id: string, data: Partial<Expense>) => update<Expense>('expenses', id, data),
  delete: (id: string) => remove('expenses', id),
  markPaid: (id: string, paymentAccountId?: string, paymentMethod?: string) =>
    update<Expense>('expenses', id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      ...(paymentAccountId ? { payment_account_id: paymentAccountId } : {}),
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    } as Partial<Expense>),
};

export const fixedExpenseService = {
  list: (coupleId: string) =>
    query<FixedExpense>('fixed_expenses', coupleId, { orderBy: 'due_day', ascending: true }),
  create: (data: Partial<FixedExpense>) => insert<FixedExpense>('fixed_expenses', data),
  update: (id: string, data: Partial<FixedExpense>) => update<FixedExpense>('fixed_expenses', id, data),
  delete: (id: string) => remove('fixed_expenses', id),
};

export const accountService = {
  list: (coupleId: string) =>
    query<BankAccount>('accounts', coupleId, { orderBy: 'name', ascending: true }),
  create: (data: Partial<BankAccount>) => insert<BankAccount>('accounts', data),
  update: (id: string, data: Partial<BankAccount>) => update<BankAccount>('accounts', id, data),
  delete: (id: string) => remove('accounts', id),
};

const DEMO_CATEGORIES: Category[] = [
  // Entradas
  { id: 'cat-i-01', couple_id: null, name: 'Salário', type: 'income', icon: 'banknote', color: '#10B981' },
  { id: 'cat-i-02', couple_id: null, name: 'Vale', type: 'income', icon: 'ticket', color: '#06B6D4' },
  { id: 'cat-i-03', couple_id: null, name: 'Bonificação', type: 'income', icon: 'gift', color: '#8B5CF6' },
  { id: 'cat-i-04', couple_id: null, name: 'Renda Extra', type: 'income', icon: 'plus-circle', color: '#F59E0B' },
  { id: 'cat-i-05', couple_id: null, name: 'Freelance', type: 'income', icon: 'laptop', color: '#3B82F6' },
  { id: 'cat-i-06', couple_id: null, name: 'Diária', type: 'income', icon: 'clock', color: '#14B8A6' },
  { id: 'cat-i-07', couple_id: null, name: 'Outros', type: 'income', icon: 'circle-dot', color: '#6B7280' },
  // Despesas
  { id: 'cat-e-01', couple_id: null, name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#EF4444' },
  { id: 'cat-e-02', couple_id: null, name: 'Supermercado', type: 'expense', icon: 'shopping-cart', color: '#F97316' },
  { id: 'cat-e-03', couple_id: null, name: 'Casa', type: 'expense', icon: 'home', color: '#8B5CF6' },
  { id: 'cat-e-04', couple_id: null, name: 'Aluguel', type: 'expense', icon: 'building', color: '#6366F1' },
  { id: 'cat-e-05', couple_id: null, name: 'Energia', type: 'expense', icon: 'zap', color: '#F59E0B' },
  { id: 'cat-e-06', couple_id: null, name: 'Água', type: 'expense', icon: 'droplets', color: '#06B6D4' },
  { id: 'cat-e-07', couple_id: null, name: 'Internet', type: 'expense', icon: 'wifi', color: '#3B82F6' },
  { id: 'cat-e-08', couple_id: null, name: 'Celular', type: 'expense', icon: 'smartphone', color: '#10B981' },
  { id: 'cat-e-09', couple_id: null, name: 'Transporte', type: 'expense', icon: 'car', color: '#64748B' },
  { id: 'cat-e-10', couple_id: null, name: 'Combustível', type: 'expense', icon: 'fuel', color: '#78716C' },
  { id: 'cat-e-11', couple_id: null, name: 'Saúde', type: 'expense', icon: 'heart-pulse', color: '#EC4899' },
  { id: 'cat-e-12', couple_id: null, name: 'Farmácia', type: 'expense', icon: 'pill', color: '#F43F5E' },
  { id: 'cat-e-13', couple_id: null, name: 'Educação', type: 'expense', icon: 'graduation-cap', color: '#8B5CF6' },
  { id: 'cat-e-14', couple_id: null, name: 'Filhos', type: 'expense', icon: 'baby', color: '#A855F7' },
  { id: 'cat-e-15', couple_id: null, name: 'Roupas', type: 'expense', icon: 'shirt', color: '#E11D48' },
  { id: 'cat-e-16', couple_id: null, name: 'Lazer', type: 'expense', icon: 'gamepad-2', color: '#D946EF' },
  { id: 'cat-e-17', couple_id: null, name: 'Delivery', type: 'expense', icon: 'bike', color: '#EF4444' },
  { id: 'cat-e-18', couple_id: null, name: 'Assinaturas', type: 'expense', icon: 'repeat', color: '#14B8A6' },
  { id: 'cat-e-19', couple_id: null, name: 'Pet', type: 'expense', icon: 'paw-print', color: '#B45309' },
  { id: 'cat-e-20', couple_id: null, name: 'Beleza', type: 'expense', icon: 'sparkles', color: '#DB2777' },
  { id: 'cat-e-21', couple_id: null, name: 'Presentes', type: 'expense', icon: 'gift', color: '#7C3AED' },
  { id: 'cat-e-22', couple_id: null, name: 'Compras', type: 'expense', icon: 'shopping-bag', color: '#F59E0B' },
  { id: 'cat-e-23', couple_id: null, name: 'Serviços', type: 'expense', icon: 'wrench', color: '#6366F1' },
  { id: 'cat-e-24', couple_id: null, name: 'Outros', type: 'expense', icon: 'circle-dot', color: '#6B7280' },
];

export const categoryService = {
  list: async (coupleId: string): Promise<Category[]> => {
    if (!supabase) return DEMO_CATEGORIES;
    const [custom, global] = await Promise.all([
      query<Category>('categories', coupleId, { orderBy: 'name', ascending: true }),
      categoryService.listGlobal(),
    ]);
    return custom.length > 0 ? custom : global.length > 0 ? global : DEMO_CATEGORIES;
  },
  listGlobal: async (): Promise<Category[]> => {
    if (!supabase) return DEMO_CATEGORIES;
    const { data } = await supabase.from('categories').select('*').is('couple_id', null).order('name');
    return (data || []) as Category[];
  },
  create: (data: Partial<Category>) => insert<Category>('categories', data),
};

export const cardService = {
  list: (coupleId: string) =>
    query<CreditCard>('cards', coupleId, { orderBy: 'name', ascending: true }),
  create: (data: Partial<CreditCard>) => insert<CreditCard>('cards', data),
  update: (id: string, data: Partial<CreditCard>) => update<CreditCard>('cards', id, data),
  delete: (id: string) => remove('cards', id),
};

export const cardTransactionService = {
  list: (coupleId: string, filters?: Record<string, unknown>) =>
    query<CardTransaction>('card_transactions', coupleId, { orderBy: 'date', filters }),
  create: (data: Partial<CardTransaction>) => insert<CardTransaction>('card_transactions', data),
  delete: (id: string) => remove('card_transactions', id),
};

export const installmentService = {
  listByCard: async (cardId: string): Promise<Installment[]> => {
    if (!supabase) {
      return localGet<Installment>('installments').filter(i => i.card_id === cardId);
    }
    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('card_id', cardId)
      .order('due_date');
    if (error) throw error;
    return (data || []) as Installment[];
  },
  markPaid: (id: string) =>
    update<Installment>('installments', id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    } as Partial<Installment>),
};

export const transferService = {
  list: (coupleId: string) =>
    query<Transfer>('transfers', coupleId, { orderBy: 'date' }),
  create: (data: Partial<Transfer>) => insert<Transfer>('transfers', data),
  delete: (id: string) => remove('transfers', id),
};

export const dailyIncomeService = {
  list: (coupleId: string) =>
    query<DailyIncome>('daily_income', coupleId, { orderBy: 'date' }),
  create: (data: Partial<DailyIncome>) => insert<DailyIncome>('daily_income', data),
  delete: (id: string) => remove('daily_income', id),
};

export const goalService = {
  list: (coupleId: string) =>
    query<FinancialGoal>('financial_goals', coupleId, { orderBy: 'deadline', ascending: true }),
  create: (data: Partial<FinancialGoal>) => insert<FinancialGoal>('financial_goals', data),
  update: (id: string, data: Partial<FinancialGoal>) => update<FinancialGoal>('financial_goals', id, data),
  delete: (id: string) => remove('financial_goals', id),
};

export const notificationService = {
  list: (coupleId: string) =>
    query<Notification>('notifications', coupleId, { orderBy: 'created_at', limit: 50 }),
  markRead: (id: string) =>
    update<Notification>('notifications', id, { read: true } as Partial<Notification>),
};
