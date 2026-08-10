import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowLeftRight, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { transferService, accountService } from '../services/api';
import { Button, Card, CardSkeleton, EmptyState } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/format';
import type { Transfer, BankAccount } from '../types';

export function TransfersPage() {
  const navigate = useNavigate();
  const { data: transfers, loading, refresh } = useData<Transfer>(
    (coupleId) => transferService.list(coupleId)
  );
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  function getAccountName(id: string) {
    return accounts.find(a => a.id === id)?.name || 'Conta';
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transferência?')) return;
    await transferService.delete(id);
    refresh();
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transferências</h1>
        </div>
        <Button size="sm" onClick={() => navigate('/new/transfer')}>
          <Plus size={16} /> Nova
        </Button>
      </div>

      {transfers.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={40} />}
          title="Nenhuma transferência"
          description="Transfira valores entre suas contas."
          action={<Button size="sm" onClick={() => navigate('/new/transfer')}><Plus size={16} /> Nova transferência</Button>}
        />
      ) : (
        <div className="space-y-2">
          {transfers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ArrowLeftRight size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {getAccountName(t.from_account_id)} → {getAccountName(t.to_account_id)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}{t.notes ? ` • ${t.notes}` : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(Number(t.amount))}
                  </p>
                  <button
                    onClick={() => navigate('/edit/transfer/' + t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
