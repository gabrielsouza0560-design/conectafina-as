import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Circle, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, fixedExpenseService, cardService } from '../services/api';
import { Card, CardSkeleton } from '../components/ui';
import { formatCurrency, getMonthName } from '../utils/format';
import type { Income, Expense, FixedExpense, CreditCard as CardType } from '../types';

interface DayEvent {
  id: string;
  type: 'income' | 'expense' | 'bill' | 'installment';
  description: string;
  amount: number;
  status: string;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: incomes, loading: l1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: bills, loading: l3 } = useData<FixedExpense>((c) => fixedExpenseService.list(c));
  const { data: _cards } = useData<CardType>((c) => cardService.list(c));

  const loading = l1 || l2 || l3;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const eventsByDay = useMemo(() => {
    const map: Record<number, DayEvent[]> = {};

    incomes.filter(i => i.date.startsWith(monthStr)).forEach(i => {
      const day = parseInt(i.date.split('-')[2]);
      if (!map[day]) map[day] = [];
      map[day].push({ id: i.id, type: 'income', description: i.description, amount: Number(i.amount), status: i.status });
    });

    expenses.filter(e => e.date.startsWith(monthStr)).forEach(e => {
      const day = parseInt(e.date.split('-')[2]);
      if (!map[day]) map[day] = [];
      map[day].push({ id: e.id, type: 'expense', description: e.description, amount: Number(e.amount), status: e.status });
    });

    bills.filter(b => b.active).forEach(b => {
      const day = b.due_day;
      if (day <= daysInMonth) {
        if (!map[day]) map[day] = [];
        map[day].push({ id: b.id, type: 'bill', description: b.description, amount: Number(b.amount), status: 'pending' });
      }
    });

    return map;
  }, [incomes, expenses, bills, monthStr, daysInMonth]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    Object.values(eventsByDay).flat().forEach(e => {
      if (e.type === 'income') income += e.amount;
      else expense += e.amount;
    });
    return { income, expense };
  }, [eventsByDay]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Calendário</h1>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {getMonthName(month)} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = eventsByDay[day] || [];
            const isToday = isCurrentMonth && day === today;
            const isSelected = selectedDay === day;
            const hasIncome = events.some(e => e.type === 'income');
            const hasExpense = events.some(e => e.type === 'expense' || e.type === 'bill');
            const hasOverdue = events.some(e => e.status === 'overdue');

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                    : isToday
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {day}
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasIncome && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />}
                    {hasExpense && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : hasOverdue ? 'bg-red-500' : 'bg-orange-500'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400">Entradas do mês</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(monthTotals.income)}</p>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">Saídas do mês</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(monthTotals.expense)}</p>
        </Card>
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {selectedDay} de {getMonthName(month)}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum lançamento neste dia</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        event.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : event.type === 'bill'
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {event.status === 'paid' ? (
                          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        ) : event.status === 'overdue' ? (
                          <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                        ) : (
                          <Circle size={16} className={event.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{event.description}</p>
                        <p className="text-xs text-gray-400">
                          {event.type === 'income' ? 'Entrada' : event.type === 'bill' ? 'Conta fixa' : 'Despesa'}
                          {' • '}
                          {event.status === 'paid' ? 'Pago' : event.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${event.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {event.type === 'income' ? '+' : '-'}{formatCurrency(event.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
