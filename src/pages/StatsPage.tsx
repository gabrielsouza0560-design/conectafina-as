import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, cardTransactionService } from '../services/api';
import { Card, CardSkeleton } from '../components/ui';
import { formatCurrency, getMonthName } from '../utils/format';
import type { Income, Expense, CardTransaction } from '../types';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'];

export function StatsPage() {
  const navigate = useNavigate();
  const { data: incomes, loading: l1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: cardTx, loading: l3 } = useData<CardTransaction>((c) => cardTransactionService.list(c));

  const [view, setView] = useState<'monthly' | 'category'>('monthly');

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number; cards: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { income: 0, expense: 0, cards: 0 };
    }

    incomes.forEach(inc => {
      const key = inc.date.substring(0, 7);
      if (months[key]) months[key].income += Number(inc.amount);
    });
    expenses.forEach(exp => {
      const key = exp.date.substring(0, 7);
      if (months[key]) months[key].expense += Number(exp.amount);
    });
    cardTx.forEach(ct => {
      const key = ct.date.substring(0, 7);
      if (months[key]) months[key].cards += Number(ct.amount);
    });

    return Object.entries(months).map(([key, val]) => ({
      name: getMonthName(parseInt(key.split('-')[1]) - 1).substring(0, 3),
      Entradas: val.income,
      Despesas: val.expense,
      Cartões: val.cards,
    }));
  }, [incomes, expenses, cardTx]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(exp => {
      const cat = exp.category_id || 'sem-categoria';
      cats[cat] = (cats[cat] || 0) + Number(exp.amount);
    });
    return Object.entries(cats)
      .map(([name, value], i) => ({ name: name === 'sem-categoria' ? 'Sem categoria' : name.substring(0, 12), value, fill: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthIncome = incomes.filter(i => i.date.startsWith(thisMonth)).reduce((s, i) => s + Number(i.amount), 0);
  const monthExpense = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount), 0);
  const monthCards = cardTx.filter(c => c.date.startsWith(thisMonth)).reduce((s, c) => s + Number(c.amount), 0);
  const balance = monthIncome - monthExpense - monthCards;

  const loading = l1 || l2 || l3;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Estatísticas</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            <p className="text-xs text-green-600 dark:text-green-400">Entradas</p>
          </div>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(monthIncome)}</p>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-600 dark:text-red-400">Despesas</p>
          </div>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(monthExpense)}</p>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={16} className="text-purple-600 dark:text-purple-400" />
            <p className="text-xs text-purple-600 dark:text-purple-400">Cartões</p>
          </div>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(monthCards)}</p>
        </Card>
        <Card className={`${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className={balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} />
            <p className={`text-xs ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Saldo</p>
          </div>
          <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{formatCurrency(balance)}</p>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView('monthly')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            view === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          <BarChart3 size={14} className="inline mr-1" /> Mensal
        </button>
        <button
          onClick={() => setView('category')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            view === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          <PieChart size={14} className="inline mr-1" /> Categorias
        </button>
      </div>

      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {view === 'monthly' ? 'Últimos 6 meses' : 'Despesas por categoria'}
          </h3>
          <div className="h-64">
            {view === 'monthly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cartões" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Sem dados de despesas
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
