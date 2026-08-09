import { motion } from 'framer-motion';
import type { TransactionStatus, CoupleVisibility } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import { Check, Trash2, Eye, Users, Home } from 'lucide-react';

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  category?: string;
  visibility?: CoupleVisibility;
  profileName?: string;
}

interface TransactionListProps {
  items: TransactionItem[];
  type: 'income' | 'expense';
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  emptyMessage?: string;
}

const visibilityIcons: Record<CoupleVisibility, React.ReactNode> = {
  individual: <Eye size={12} />,
  shared: <Users size={12} />,
  household: <Home size={12} />,
};

export function TransactionList({ items, type, onMarkPaid, onDelete, emptyMessage }: TransactionListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400 dark:text-gray-500">{emptyMessage || 'Nenhum lançamento encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
            type === 'income' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {type === 'income' ? '+' : '-'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.description}</p>
              {item.visibility && (
                <span className="text-gray-400" title={item.visibility}>
                  {visibilityIcons[item.visibility]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
              {item.category && (
                <span className="text-xs text-gray-400">• {item.category}</span>
              )}
              {item.profileName && (
                <span className="text-xs text-gray-400">• {item.profileName}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-sm font-semibold ${
              type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
            </span>
            <StatusBadge status={item.status} />
          </div>

          {(item.status === 'pending' || item.status === 'overdue') && (
            <div className="flex flex-col gap-1">
              {onMarkPaid && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkPaid(item.id); }}
                  className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  title="Dar baixa"
                >
                  <Check size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
