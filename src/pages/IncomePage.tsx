import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter } from 'lucide-react';
import { useData } from '../hooks/useData';
import { incomeService, accountService } from '../services/api';
import { TransactionList } from '../components/transactions/TransactionList';
import { MarkPaidModal } from '../components/transactions/MarkPaidModal';
import { Button, Card, CardSkeleton, Select } from '../components/ui';
import { formatCurrency } from '../utils/format';
import type { Income, BankAccount } from '../types';

const incomeTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'salary', label: 'Salário' },
  { value: 'allowance', label: 'Vale' },
  { value: 'bonus', label: 'Bonificação' },
  { value: 'extra', label: 'Renda Extra' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'daily', label: 'Diária' },
  { value: 'other', label: 'Outros' },
];

const statusFilter = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'scheduled', label: 'Agendado' },
];

export function IncomePage() {
  const navigate = useNavigate();
  const { data: items, loading, refresh } = useData<Income>(
    (coupleId) => incomeService.list(coupleId)
  );
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterType && i.type !== filterType) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterType, filterStatus]);

  const totalPaid = useMemo(() =>
    items.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  , [items]);

  const totalPending = useMemo(() =>
    items.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  , [items]);

  async function handleMarkPaid(accountId?: string) {
    if (!markPaidId) return;
    await incomeService.markPaid(markPaidId, accountId);
    setMarkPaidId(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta entrada?')) return;
    await incomeService.delete(id);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Entradas</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} />
          </Button>
          <Button size="sm" onClick={() => navigate('/new/income')}>
            <Plus size={16} /> Nova
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400">Recebido</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400">A receber</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalPending)}</p>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" options={incomeTypes} value={filterType} onChange={e => setFilterType(e.target.value)} />
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
          category: incomeTypes.find(t => t.value === i.type)?.label,
          visibility: i.visibility,
        }))}
        type="income"
        onMarkPaid={(id) => setMarkPaidId(id)}
        onDelete={handleDelete}
        onEdit={(id) => navigate('/edit/income/' + id)}
        emptyMessage="Nenhuma entrada registrada. Toque em + para adicionar."
      />

      <MarkPaidModal
        open={!!markPaidId}
        onClose={() => setMarkPaidId(null)}
        onConfirm={handleMarkPaid}
        accounts={accounts}
        title="Confirmar Recebimento"
      />
    </div>
  );
}
