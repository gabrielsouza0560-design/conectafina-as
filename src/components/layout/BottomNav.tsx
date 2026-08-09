import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, CreditCard, BarChart3, MoreHorizontal, Plus,
  ArrowDownLeft, ArrowUpRight, ShoppingCart, Receipt, Clock, ArrowLeftRight, X
} from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/cards', icon: CreditCard, label: 'Cartões' },
  { path: '__fab__', icon: Plus, label: 'Lançar' },
  { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
  { path: '/more', icon: MoreHorizontal, label: 'Mais' },
];

const quickActions = [
  { label: 'Nova Entrada', icon: ArrowDownLeft, color: 'bg-green-500', path: '/new/income' },
  { label: 'Nova Despesa', icon: ArrowUpRight, color: 'bg-red-500', path: '/new/expense' },
  { label: 'Compra no Cartão', icon: ShoppingCart, color: 'bg-purple-500', path: '/new/card-purchase' },
  { label: 'Nova Conta', icon: Receipt, color: 'bg-amber-500', path: '/new/bill' },
  { label: 'Nova Diária', icon: Clock, color: 'bg-blue-500', path: '/new/daily' },
  { label: 'Transferência', icon: ArrowLeftRight, color: 'bg-cyan-500', path: '/new/transfer' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={() => setFabOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map(a => (
                  <button
                    key={a.path}
                    onClick={() => { setFabOpen(false); navigate(a.path); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl ${a.color} flex items-center justify-center`}>
                      <a.icon size={22} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 sm:hidden safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map(tab => {
            if (tab.path === '__fab__') {
              return (
                <button
                  key="fab"
                  onClick={() => setFabOpen(!fabOpen)}
                  className="relative -mt-6"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${fabOpen ? 'bg-red-500 rotate-45' : 'bg-blue-600'}`}>
                    {fabOpen ? <X size={26} className="text-white" /> : <Plus size={26} className="text-white" />}
                  </div>
                </button>
              );
            }

            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px]"
              >
                <tab.icon
                  size={22}
                  className={active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
