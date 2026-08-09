import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, TrendingUp, TrendingDown, CreditCard, ArrowLeftRight, Clock, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, cardTransactionService, transferService, dailyIncomeService, fixedExpenseService } from '../services/api';
import { Card, CardSkeleton } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/format';
import { normalizeText } from '../utils/format';
import type { Income, Expense, CardTransaction, Transfer, DailyIncome, FixedExpense } from '../types';

interface SearchResult {
  id: string;
  type: 'income' | 'expense' | 'card' | 'transfer' | 'daily' | 'bill';
  description: string;
  amount: number;
  date: string;
  status?: string;
}

const typeLabels: Record<string, string> = {
  income: 'Entrada', expense: 'Despesa', card: 'Cartão',
  transfer: 'Transferência', daily: 'Diária', bill: 'Conta fixa',
};

const typeIcons: Record<string, typeof TrendingUp> = {
  income: TrendingUp, expense: TrendingDown, card: CreditCard,
  transfer: ArrowLeftRight, daily: Clock, bill: Receipt,
};

const typeColors: Record<string, string> = {
  income: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  expense: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  card: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  transfer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  daily: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  bill: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
};

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: incomes, loading: l1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: cardTx, loading: l3 } = useData<CardTransaction>((c) => cardTransactionService.list(c));
  const { data: transfers, loading: l4 } = useData<Transfer>((c) => transferService.list(c));
  const { data: dailies, loading: l5 } = useData<DailyIncome>((c) => dailyIncomeService.list(c));
  const { data: bills, loading: l6 } = useData<FixedExpense>((c) => fixedExpenseService.list(c));

  const loading = l1 || l2 || l3 || l4 || l5 || l6;

  const allItems = useMemo((): SearchResult[] => {
    const items: SearchResult[] = [];
    incomes.forEach(i => items.push({ id: i.id, type: 'income', description: i.description, amount: Number(i.amount), date: i.date, status: i.status }));
    expenses.forEach(e => items.push({ id: e.id, type: 'expense', description: e.description, amount: Number(e.amount), date: e.date, status: e.status }));
    cardTx.forEach(c => items.push({ id: c.id, type: 'card', description: c.description, amount: Number(c.amount), date: c.date }));
    transfers.forEach(t => items.push({ id: t.id, type: 'transfer', description: t.notes || 'Transferência', amount: Number(t.amount), date: t.date }));
    dailies.forEach(d => items.push({ id: d.id, type: 'daily', description: d.description || `${d.quantity}x diária`, amount: Number(d.total), date: d.date, status: d.status }));
    bills.forEach(b => items.push({ id: b.id, type: 'bill', description: b.description, amount: Number(b.amount), date: b.created_at.split('T')[0] }));
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, expenses, cardTx, transfers, dailies, bills]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const normalized = normalizeText(query.toLowerCase());
    return allItems.filter(item =>
      normalizeText(item.description.toLowerCase()).includes(normalized) ||
      typeLabels[item.type].toLowerCase().includes(normalized) ||
      item.amount.toString().includes(query)
    ).slice(0, 50);
  }, [query, allItems]);

  const recentItems = allItems.slice(0, 10);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Buscar</h1>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar lançamentos, despesas, entradas..."
          autoFocus
          className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2"><CardSkeleton /><CardSkeleton /></div>
      ) : query.trim() ? (
        <>
          <p className="text-xs text-gray-400">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </p>
          {results.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <Search size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum resultado para "{query}"</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {results.map((item, i) => {
                const Icon = typeIcons[item.type];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeColors[item.type]}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.description}</p>
                          <p className="text-xs text-gray-400">{typeLabels[item.type]} • {formatDate(item.date)}</p>
                        </div>
                        <p className={`text-sm font-semibold ${item.type === 'income' || item.type === 'daily' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Recentes</p>
          <div className="space-y-2">
            {recentItems.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-400 text-center py-4">Nenhum lançamento registrado</p>
              </Card>
            ) : (
              recentItems.map((item, i) => {
                const Icon = typeIcons[item.type];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeColors[item.type]}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.description}</p>
                          <p className="text-xs text-gray-400">{typeLabels[item.type]} • {formatDate(item.date)}</p>
                        </div>
                        <p className={`text-sm font-semibold ${item.type === 'income' || item.type === 'daily' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
