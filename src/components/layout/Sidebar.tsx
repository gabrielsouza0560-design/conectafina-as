import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, CreditCard, BarChart3, Wallet, ArrowLeftRight, Target, Calendar,
  Bell, FileText, Search, Settings, LogOut, PlusCircle, Receipt, Users, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const mainLinks = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/income', icon: PlusCircle, label: 'Entradas' },
  { path: '/expenses', icon: Receipt, label: 'Despesas' },
  { path: '/bills', icon: FileText, label: 'Contas' },
  { path: '/cards', icon: CreditCard, label: 'Cartões' },
  { path: '/accounts', icon: Wallet, label: 'Contas Bancárias' },
  { path: '/transfers', icon: ArrowLeftRight, label: 'Transferências' },
];

const secondaryLinks = [
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/calendar', icon: Calendar, label: 'Calendário' },
  { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
  { path: '/couple', icon: Users, label: 'Casal' },
  { path: '/notifications', icon: Bell, label: 'Notificações' },
  { path: '/search', icon: Search, label: 'Busca' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className="hidden sm:flex flex-col w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 fixed left-0 top-0 z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Conecta Finanças</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Controle financeiro inteligente</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        <p className="px-3 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">Principal</p>
        {mainLinks.map(link => {
          const active = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <link.icon size={18} />
              {link.label}
            </button>
          );
        })}

        <p className="px-3 pt-4 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">Ferramentas</p>
        {secondaryLinks.map(link => {
          const active = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <link.icon size={18} />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings size={18} />
          Configurações
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>

        {profile && (
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{profile.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{profile.email}</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
