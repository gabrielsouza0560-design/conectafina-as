import { supabase } from '../lib/supabase';
import type {
  Income, Expense, FixedExpense, BankAccount, Category,
  CreditCard, CardTransaction, Installment, Transfer, DailyIncome,
  FinancialGoal, Notification
} from '../types';

type TableName = 'income' | 'expenses' | 'fixed_expenses' | 'accounts' | 'categories'
  | 'cards' | 'card_transactions' | 'installments' | 'transfers'
  | 'daily_income' | 'financial_goals' | 'notifications';

async function query<T>(table: TableName, coupleId: string, options?: {
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
  limit?: number;
}): Promise<T[]> {
  if (!supabase) return [];
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

async function insert<T>(table: TableName, record: Partial<T>): Promise<T> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.from(table).insert(record as any).select().single();
  if (error) throw error;
  return data as T;
}

async function update<T>(table: TableName, id: string, updates: Partial<T>): Promise<T> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.from(table).update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
}

async function remove(table: TableName, id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
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

export const categoryService = {
  list: (coupleId: string) =>
    query<Category>('categories', coupleId, { orderBy: 'name', ascending: true }),
  listGlobal: async (): Promise<Category[]> => {
    if (!supabase) return [];
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
    if (!supabase) return [];
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
