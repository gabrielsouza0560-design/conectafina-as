import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { dailyIncomeService } from '../services/api';
import { Button, Card, CardSkeleton, EmptyState } from '../components/ui';
import { formatCurrency, formatDate, getMonthName } from '../utils/format';
import type { DailyIncome } from '../types';

export function DailyIncomePage() {
  const navigate = useNavigate();
  const { data: dailies, loading, refresh } = useData<DailyIncome>(
    (coupleId) => dailyIncomeService.list(coupleId)
  );
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const now = new Date();
  const currentMonth = dailies.filter(d => {
    const dt = new Date(d.date);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });

  const filtered = filter === 'all' ? dailies :
    dailies.filter(d => filter === 'paid' ? d.status === 'paid' : d.status !== 'paid');

  const totalMonth = currentMonth.reduce((s, d) => s + Number(d.total), 0);
  const totalPaid = currentMonth.filter(d => d.status === 'paid').reduce((s, d) => s + Number(d.total), 0);

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta diária?')) return;
    await dailyIncomeService.delete(id);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Diárias</h1>
        </div>
        <Button size="sm" onClick={() => navigate('/new/daily')}>
          <Plus size={16} /> Nova
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-r from-cyan-600 to-cyan-700 border-0">
          <div className="text-white">
            <p className="text-xs text-cyan-200">{getMonthName(now.getMonth())} — Total</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalMonth)}</p>
            <p className="text-xs text-cyan-200 mt-1">{currentMonth.length} diárias</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0">
          <div className="text-white">
            <p className="text-xs text-green-200">Recebido</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-green-200 mt-1">{currentMonth.filter(d => d.status === 'paid').length} pagas</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'paid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'paid' ? 'Pagas' : 'Pendentes'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock size={40} />}
          title="Nenhuma diária"
          description="Registre diárias de trabalho."
          action={<Button size="sm" onClick={() => navigate('/new/daily')}><Plus size={16} /> Nova diária</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    d.status === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-cyan-100 dark:bg-cyan-900/30'
                  }`}>
                    {d.status === 'paid'
                      ? <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                      : <Clock size={20} className="text-cyan-600 dark:text-cyan-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {d.quantity}x {formatCurrency(Number(d.rate))}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(d.date)}
                      {d.description ? ` • ${d.description}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                    {formatCurrency(Number(d.total))}
                  </p>
                  <button
                    onClick={() => handleDelete(d.id)}
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
