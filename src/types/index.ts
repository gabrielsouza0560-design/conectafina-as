export type TransactionStatus = 'paid' | 'pending' | 'overdue' | 'scheduled' | 'cancelled';

export type TransactionType = 'income' | 'expense' | 'card_purchase' | 'bill' | 'daily_income' | 'transfer';

export type CoupleVisibility = 'individual' | 'shared' | 'household';

export interface Profile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Couple {
  id: string;
  name: string;
  created_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  profile_id: string;
  role: 'owner' | 'partner';
  label: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  couple_id: string;
  name: string;
  type: 'checking' | 'savings' | 'digital' | 'cash' | 'wallet' | 'other';
  balance: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface Category {
  id: string;
  couple_id: string | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Income {
  id: string;
  couple_id: string;
  profile_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  date: string;
  type: 'salary' | 'allowance' | 'bonus' | 'extra' | 'daily' | 'other';
  status: TransactionStatus;
  paid_at: string | null;
  payment_method: string | null;
  visibility: CoupleVisibility;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  couple_id: string;
  profile_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  paid_at: string | null;
  payment_method: string | null;
  payment_account_id: string | null;
  visibility: CoupleVisibility;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface CreditCard {
  id: string;
  couple_id: string;
  profile_id: string;
  name: string;
  bank: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  shared: boolean;
  color: string;
  icon: string;
  created_at: string;
}

export interface CardTransaction {
  id: string;
  couple_id: string;
  card_id: string;
  profile_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  date: string;
  total_installments: number;
  visibility: CoupleVisibility;
  notes: string | null;
  created_at: string;
}

export interface Installment {
  id: string;
  card_transaction_id: string;
  card_id: string;
  number: number;
  amount: number;
  due_date: string;
  status: TransactionStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  card_id: string;
  couple_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  status: TransactionStatus;
  paid_at: string | null;
  payment_account_id: string | null;
  created_at: string;
}

export interface FixedExpense {
  id: string;
  couple_id: string;
  profile_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  due_day: number;
  recurrence: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
  account_id: string | null;
  visibility: CoupleVisibility;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface DailyIncome {
  id: string;
  couple_id: string;
  profile_id: string;
  date: string;
  quantity: number;
  rate: number;
  total: number;
  description: string | null;
  account_id: string | null;
  status: TransactionStatus;
  created_at: string;
}

export interface Transfer {
  id: string;
  couple_id: string;
  profile_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface FinancialGoal {
  id: string;
  couple_id: string;
  profile_id: string | null;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  monthly_contribution: number | null;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  couple_id: string;
  profile_id: string | null;
  title: string;
  body: string;
  type: 'overdue' | 'due_soon' | 'invoice' | 'installment' | 'salary' | 'goal' | 'info';
  read: boolean;
  created_at: string;
}

export interface MonthlyClosing {
  id: string;
  couple_id: string;
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  total_cards: number;
  total_installments: number;
  balance: number;
  data: Record<string, unknown>;
  closed_at: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  profile_id: string;
  amount: number;
  percentage: number | null;
}
