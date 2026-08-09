import { useState, useEffect } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, CreditCard, Wallet, Receipt, Target,
  Bell, TrendingUp, AlertTriangle, ChevronRight, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardSkeleton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';

interface DashboardData {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  totalCards: number;
  totalInstallments: number;
  pendingBills: number;
  overdueBills: number;
  goalsProgress: number;
  alerts: { type: string; message: string }[];
  insights: string[];
}

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
  const { profile, coupleId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data] = useState<DashboardData>({
    balance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalCards: 0,
    totalInstallments: 0,
    pendingBills: 0,
    overdueBills: 0,
    goalsProgress: 0,
    alerts: [],
    insights: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const now = new Date();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{monthName} {now.getFullYear()}</h1>
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

      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
        <div className="text-white">
          <p className="text-sm text-blue-200">Saldo atual</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(data.balance)}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                <ArrowDownLeft size={14} className="text-green-300" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200">Entradas</p>
                <p className="text-sm font-semibold">{formatCurrency(data.totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center">
                <ArrowUpRight size={14} className="text-red-300" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200">Despesas</p>
                <p className="text-sm font-semibold">{formatCurrency(data.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CreditCard} label="Cartões" value={formatCurrency(data.totalCards)} color="bg-purple-500" onClick={() => navigate('/cards')} />
        <StatCard icon={Receipt} label="Parcelas" value={formatCurrency(data.totalInstallments)} color="bg-amber-500" onClick={() => navigate('/cards')} />
        <StatCard icon={Wallet} label="Contas pendentes" value={String(data.pendingBills)} color="bg-orange-500" onClick={() => navigate('/bills')} />
        <StatCard icon={Target} label="Metas" value={`${data.goalsProgress}%`} color="bg-cyan-500" onClick={() => navigate('/goals')} />
      </div>

      {data.overdueBills > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {data.overdueBills} {data.overdueBills === 1 ? 'conta vencida' : 'contas vencidas'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80">Regularize para evitar juros</p>
            </div>
            <ChevronRight size={18} className="ml-auto text-red-400" />
          </div>
        </Card>
      )}

      {!coupleId && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Configure seu ambiente</p>
              <p className="text-xs text-blue-600 dark:text-blue-400/80">Crie ou entre em um casal para começar</p>
            </div>
            <button
              onClick={() => navigate('/couple')}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
            >
              Configurar
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Previsão do mês</h3>
          <button onClick={() => navigate('/stats')} className="text-xs text-blue-600 hover:underline">
            Ver mais
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Entradas previstas</span>
            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(data.totalIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Despesas previstas</span>
            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(data.totalExpenses + data.totalCards)}</span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Saldo previsto</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data.balance)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights</h3>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Registre seus primeiros lançamentos para receber insights personalizados.
          </p>
        </div>
      </Card>
    </div>
  );
}
