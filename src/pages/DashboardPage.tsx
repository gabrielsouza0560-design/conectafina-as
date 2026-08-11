import { useState, useMemo } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CreditCard, Wallet, Receipt, Target,
  Bell, TrendingUp, AlertTriangle, ChevronRight, ChevronLeft, Clock,
  ArrowLeftRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardSkeleton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, cardTransactionService, fixedExpenseService, goalService, dailyIncomeService, transferService } from '../services/api';
import { formatCurrency, getMonthName } from '../utils/format';
import type { Income, Expense, CardTransaction, FixedExpense, FinancialGoal, DailyIncome, Transfer } from '../types';

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`cursor-pointer`}
    >
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  const { data: incomes, loading: l1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: cardTx, loading: l3 } = useData<CardTransaction>((c) => cardTransactionService.list(c));
  const { data: bills, loading: l4 } = useData<FixedExpense>((c) => fixedExpenseService.list(c));
  const { data: goals, loading: l5 } = useData<FinancialGoal>((c) => goalService.list(c));
  const { data: dailies, loading: l6 } = useData<DailyIncome>((c) => dailyIncomeService.list(c));
  const { data: transfers, loading: l7 } = useData<Transfer>((c) => transferService.list(c));

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const data = useMemo(() => {
    const monthIncomes = incomes.filter(i => i.date.startsWith(monthStr));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
    const monthCards = cardTx.filter(c => c.date.startsWith(monthStr));
    const monthDailies = dailies.filter(d => d.date.startsWith(monthStr));
    const monthTransfers = transfers.filter(t => t.date.startsWith(monthStr));
    const activeBills = bills.filter(b => b.active);

    const totalIncome = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalCards = monthCards.reduce((s, c) => s + Number(c.amount), 0);
    const totalBills = activeBills.reduce((s, b) => s + Number(b.amount), 0);
    const totalDailies = monthDailies.reduce((s, d) => s + Number(d.total), 0);
    const totalTransfers = monthTransfers.reduce((s, t) => s + Number(t.amount), 0);

    const paidIncome = monthIncomes.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
    const paidExpense = monthExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0);

    const pendingBills = activeBills.length;
    const overdueBills = monthExpenses.filter(e => e.status === 'overdue').length;

    const totalGoalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
    const totalGoalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0);
    const goalsProgress = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

    const balance = totalIncome + totalDailies - totalExpenses - totalCards;

    const alerts: { type: string; message: string }[] = [];
    if (overdueBills > 0) alerts.push({ type: 'overdue', message: `${overdueBills} despesa(s) vencida(s)` });

    activeBills.forEach(b => {
      const dueDate = new Date(selectedYear, selectedMonth, b.due_day);
      const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 3) {
        alerts.push({ type: 'due_soon', message: `${b.description} vence em ${diff} dia(s)` });
      }
    });

    const insights: string[] = [];
    if (totalIncome > 0 && totalExpenses > 0) {
      const ratio = (totalExpenses + totalCards) / totalIncome;
      if (ratio > 0.8) insights.push('Despesas + cartões representam mais de 80% das entradas. Atenção!');
      else if (ratio < 0.5) insights.push('Parabéns! Você está gastando menos da metade do que ganha.');
    }
    if (goals.length > 0 && goalsProgress >= 80) {
      insights.push('Suas metas estão quase completas! Continue assim.');
    }

    return {
      balance, totalIncome, totalExpenses, totalCards, totalDailies, totalTransfers,
      totalInstallments: totalBills, pendingBills, overdueBills,
      goalsProgress, alerts, insights,
      paidIncome, paidExpense,
      incomeCount: monthIncomes.length,
      expenseCount: monthExpenses.length,
      cardCount: monthCards.length,
      dailyCount: monthDailies.length,
      transferCount: monthTransfers.length,
    };
  }, [incomes, expenses, cardTx, bills, goals, dailies, transfers, monthStr, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <CardSkeleton />
        <div className="grid grid-cols-2 gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Olá, <span className="font-medium text-gray-900 dark:text-gray-100">{profile?.name?.split(' ')[0] || 'Usuário'}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-400" />
          {data.alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {data.alerts.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[160px] text-center capitalize">
          {getMonthName(selectedMonth)} {selectedYear}
        </h1>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <Card className={`${data.balance >= 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-600 to-rose-700'} border-0`}>
        <div className="text-white">
          <p className="text-sm opacity-80">Saldo do mês</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(data.balance)}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                <ArrowDownLeft size={14} className="text-green-300" />
              </div>
              <div>
                <p className="text-[10px] opacity-70">Entradas</p>
                <p className="text-sm font-semibold">{formatCurrency(data.totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center">
                <ArrowUpRight size={14} className="text-red-300" />
              </div>
              <div>
                <p className="text-[10px] opacity-70">Despesas</p>
                <p className="text-sm font-semibold">{formatCurrency(data.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CreditCard} label="Cartões" value={formatCurrency(data.totalCards)} color="bg-purple-500" onClick={() => navigate('/cards')} />
        <StatCard icon={Clock} label="Diárias" value={formatCurrency(data.totalDailies)} color="bg-cyan-500" onClick={() => navigate('/daily')} />
        <StatCard icon={Receipt} label="Contas fixas" value={formatCurrency(data.totalInstallments)} color="bg-amber-500" onClick={() => navigate('/bills')} />
        <StatCard icon={ArrowLeftRight} label="Transferências" value={formatCurrency(data.totalTransfers)} color="bg-blue-500" onClick={() => navigate('/transfers')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Wallet} label="Contas pendentes" value={String(data.pendingBills)} color="bg-orange-500" onClick={() => navigate('/bills')} />
        <StatCard icon={Target} label="Metas" value={`${data.goalsProgress}%`} color="bg-emerald-500" onClick={() => navigate('/goals')} />
      </div>

      {data.overdueBills > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {data.overdueBills} {data.overdueBills === 1 ? 'despesa vencida' : 'despesas vencidas'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80">Regularize para evitar juros</p>
            </div>
            <ChevronRight size={18} className="ml-auto text-red-400" />
          </div>
        </Card>
      )}

      {data.alerts.filter(a => a.type === 'due_soon').map((alert, i) => (
        <Card key={i} className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Bell size={16} className="text-white" />
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">{alert.message}</p>
          </div>
        </Card>
      ))}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo do mês</h3>
          <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:underline">
            Relatório completo
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Entradas ({data.incomeCount})</span>
            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(data.totalIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Despesas ({data.expenseCount})</span>
            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(data.totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Cartões ({data.cardCount})</span>
            <span className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(data.totalCards)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Diárias ({data.dailyCount})</span>
            <span className="font-medium text-cyan-600 dark:text-cyan-400">{formatCurrency(data.totalDailies)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Transferências ({data.transferCount})</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(data.totalTransfers)}</span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Saldo</span>
            <span className={`font-bold ${data.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(data.balance)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights</h3>
        </div>
        <div className="space-y-2">
          {data.insights.length > 0 ? (
            data.insights.map((insight, i) => (
              <p key={i} className="text-sm text-gray-600 dark:text-gray-400">{insight}</p>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Registre seus primeiros lançamentos para receber insights personalizados.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
