import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowLeftRight, Target, Calendar, Bell, Search, FileText,
  Users, Settings, Receipt, Clock, LogOut, Moon, Sun, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui';

const sections = [
  {
    title: 'Financeiro',
    items: [
      { icon: Receipt, label: 'Contas a Pagar', path: '/bills', color: 'text-amber-500' },
      { icon: Wallet, label: 'Contas Bancárias', path: '/accounts', color: 'text-blue-500' },
      { icon: ArrowLeftRight, label: 'Transferências', path: '/transfers', color: 'text-cyan-500' },
      { icon: Clock, label: 'Diárias', path: '/daily', color: 'text-indigo-500' },
    ],
  },
  {
    title: 'Planejamento',
    items: [
      { icon: Target, label: 'Metas', path: '/goals', color: 'text-green-500' },
      { icon: Calendar, label: 'Calendário', path: '/calendar', color: 'text-purple-500' },
      { icon: FileText, label: 'Relatórios', path: '/reports', color: 'text-orange-500' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { icon: Users, label: 'Casal', path: '/couple', color: 'text-pink-500' },
      { icon: Bell, label: 'Notificações', path: '/notifications', color: 'text-red-500' },
      { icon: Search, label: 'Busca', path: '/search', color: 'text-gray-500' },
    ],
  },
];

export function MorePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mais</h1>

      <Card>
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900 dark:text-gray-100">{profile?.name || 'Usuário'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </Card>

      {sections.map(section => (
        <div key={section.title}>
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2 px-1">{section.title}</p>
          <Card padding={false}>
            {section.items.map((item, i) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  i < section.items.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <item.icon size={20} className={item.color} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">{item.label}</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))}
          </Card>
        </div>
      ))}

      <Card padding={false}>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700"
        >
          {theme === 'light' ? <Moon size={20} className="text-gray-500" /> : <Sun size={20} className="text-amber-400" />}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700"
        >
          <Settings size={20} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">Configurações</span>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3"
        >
          <LogOut size={20} className="text-red-500" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1 text-left">Sair</span>
        </button>
      </Card>
    </div>
  );
}
