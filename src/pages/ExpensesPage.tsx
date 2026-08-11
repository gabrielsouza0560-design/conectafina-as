import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../hooks/useData';
import { expenseService, accountService, categoryService } from '../services/api';
import { TransactionList } from '../components/transactions/TransactionList';
import { MarkPaidModal } from '../components/transactions/MarkPaidModal';
import { Button, Card, CardSkeleton, Select } from '../components/ui';
import { formatCurrency, getMonthName } from '../utils/format';
import type { Expense, BankAccount, Category } from '../types';

const statusFilter = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'scheduled', label: 'Agendado' },
];

export function ExpensesPage() {
  const navigate = useNavigate();
  const { data: items, loading, refresh } = useData<Expense>(
    (coupleId) => expenseService.list(coupleId)
  );
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );
  const { data: categories } = useData<Category>(
    (coupleId) => categoryService.list(coupleId)
  );

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  const expenseCategories = useMemo(() =>
    categories.filter(c => c.type === 'expense'),
  [categories]);

  const monthItems = useMemo(() =>
    items.filter(i => i.date.startsWith(monthStr)),
  [items, monthStr]);

  const filtered = useMemo(() => {
    return monthItems.filter(i => {
      if (filterCategory && i.category_id !== filterCategory) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    });
  }, [monthItems, filterCategory, filterStatus]);

  const totalPaid = useMemo(() =>
    monthItems.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  , [monthItems]);

  const totalPending = useMemo(() =>
    monthItems.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  , [monthItems]);

  async function handleMarkPaid(accountId?: string, paymentMethod?: string) {
    if (!markPaidId) return;
    await expenseService.markPaid(markPaidId, accountId, paymentMethod);
    setMarkPaidId(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta despesa?')) return;
    await expenseService.delete(id);
    refresh();
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Despesas</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} />
          </Button>
          <Button size="sm" onClick={() => navigate('/new/expense')}>
            <Plus size={16} /> Nova
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center">
          {getMonthName(selectedMonth)} {selectedYear}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">Pago</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400">A pagar</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalPending)}</p>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              placeholder="Todas"
              options={[{ value: '', label: 'Todas' }, ...expenseCategories.map(c => ({ value: c.id, label: c.name }))]}
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            />
            <Select label="Status" options={statusFilter} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} />
          </div>
        </Card>
      )}

      <TransactionList
        items={filtered.map(i => ({
          id: i.id,
          description: i.description,
          amount: Number(i.amount),
          date: i.date,
          status: i.status,
          category: expenseCategories.find(c => c.id === i.category_id)?.name,
          visibility: i.visibility,
        }))}
        type="expense"
        onMarkPaid={(id) => setMarkPaidId(id)}
        onDelete={handleDelete}
        onEdit={(id) => navigate('/edit/expense/' + id)}
        emptyMessage="Nenhuma despesa neste mês."
      />

      <MarkPaidModal
        open={!!markPaidId}
        onClose={() => setMarkPaidId(null)}
        onConfirm={handleMarkPaid}
        accounts={accounts}
        title="Confirmar Pagamento"
      />
    </div>
  );
}
