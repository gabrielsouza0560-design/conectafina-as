import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, User, Heart, Bell, Shield, Smartphone, Download, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { profile } = useAuth();

  const sections = [
    {
      title: 'Conta',
      items: [
        { icon: User, label: 'Perfil', desc: profile?.name || 'Configurar perfil', onClick: () => navigate('/profile') },
        { icon: Heart, label: 'Casal', desc: 'Gerenciar parceiro(a)', onClick: () => navigate('/couple') },
      ],
    },
    {
      title: 'Aparência',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Tema',
          desc: theme === 'dark' ? 'Modo escuro' : 'Modo claro',
          onClick: toggleTheme,
          toggle: true,
          active: theme === 'dark',
        },
      ],
    },
    {
      title: 'Notificações',
      items: [
        { icon: Bell, label: 'Alertas', desc: 'Vencimentos e lembretes', onClick: () => navigate('/notifications') },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Smartphone, label: 'Instalar app', desc: 'Adicionar à tela inicial (PWA)', onClick: () => {
          if ('beforeinstallprompt' in window) {
            alert('Use o menu do navegador para instalar o app.');
          } else {
            alert('Abra no Chrome e use "Adicionar à tela inicial" no menu.');
          }
        }},
        { icon: Download, label: 'Exportar dados', desc: 'Em breve', onClick: () => alert('Exportação de dados estará disponível em breve!') },
        { icon: Shield, label: 'Privacidade', desc: 'Dados locais e seguros', onClick: () => alert('Seus dados são armazenados de forma segura no Supabase. Nenhum dado é compartilhado com terceiros.') },
        { icon: Info, label: 'Sobre', desc: 'Conecta Finanças v1.0', onClick: () => alert('Conecta Finanças v1.0\nControle financeiro inteligente para casais.\nDesenvolvido com React + Supabase.') },
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</h2>
          <Card className="divide-y divide-gray-100 dark:divide-gray-700 !p-0 overflow-hidden">
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <item.icon size={18} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                {'toggle' in item && (
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${item.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${item.active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                )}
              </button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
