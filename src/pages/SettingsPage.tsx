import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, User, Heart, Bell, Shield, Smartphone, Download, Upload, CloudUpload, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { Card } from '../components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DATA_TABLES = [
  'conecta_demo_income',
  'conecta_demo_expenses',
  'conecta_demo_fixed_expenses',
  'conecta_demo_accounts',
  'conecta_demo_categories',
  'conecta_demo_cards',
  'conecta_demo_card_transactions',
  'conecta_demo_installments',
  'conecta_demo_transfers',
  'conecta_demo_daily_income',
  'conecta_demo_financial_goals',
  'conecta_demo_notifications',
  'conecta_users',
  'conecta_auth',
  'cf-theme',
];

const TABLE_MAP: Record<string, string> = {
  conecta_demo_income: 'income',
  conecta_demo_expenses: 'expenses',
  conecta_demo_fixed_expenses: 'fixed_expenses',
  conecta_demo_accounts: 'accounts',
  conecta_demo_categories: 'categories',
  conecta_demo_cards: 'cards',
  conecta_demo_card_transactions: 'card_transactions',
  conecta_demo_installments: 'installments',
  conecta_demo_transfers: 'transfers',
  conecta_demo_daily_income: 'daily_income',
  conecta_demo_financial_goals: 'financial_goals',
  conecta_demo_notifications: 'notifications',
};

function exportAllData(): string {
  const data: Record<string, unknown> = {};
  for (const key of DATA_TABLES) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  }
  data._exportedAt = new Date().toISOString();
  data._version = '1.0';
  return JSON.stringify(data, null, 2);
}

function importAllData(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return { success: false, error: 'Arquivo inválido.' };

    let imported = 0;
    for (const key of DATA_TABLES) {
      if (key in data) {
        const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
        localStorage.setItem(key, value);
        imported++;
      }
    }
    if (imported === 0) return { success: false, error: 'Nenhum dado encontrado no arquivo.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Arquivo JSON inválido.' };
  }
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { profile, coupleId } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setInstallPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Para instalar no iPhone/iPad:\n\n1. Toque no botão Compartilhar (ícone de quadrado com seta)\n2. Toque em "Adicionar à Tela de Início"');
      } else {
        alert('Para instalar:\n\nAbra no Chrome ou Edge e use o menu do navegador → "Instalar aplicativo" ou "Adicionar à tela inicial".');
      }
    }
  }

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conecta-financas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Backup exportado com sucesso!');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = importAllData(reader.result as string);
      if (result.success) {
        alert('Dados importados com sucesso! A página vai recarregar.');
        window.location.reload();
      } else {
        alert(`Erro ao importar: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleMigrateToCloud() {
    if (!supabase || !supabaseConfigured) {
      alert('Supabase não está configurado. A migração para a nuvem não está disponível.');
      return;
    }
    if (!profile || !coupleId) {
      alert('Você precisa estar logado com uma conta Supabase para migrar. Faça logout e cadastre-se novamente.');
      return;
    }

    const hasData = Object.keys(TABLE_MAP).some(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      try { const arr = JSON.parse(raw); return Array.isArray(arr) && arr.length > 0; } catch { return false; }
    });

    if (!hasData) {
      alert('Não há dados locais para migrar.');
      return;
    }

    if (!confirm('Isso vai enviar todos os dados salvos neste dispositivo para a nuvem (Supabase).\n\nDados existentes na nuvem NÃO serão apagados.\n\nContinuar?')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);

    let totalMigrated = 0;
    let totalErrors = 0;
    const details: string[] = [];

    for (const [localKey, supabaseTable] of Object.entries(TABLE_MAP)) {
      const raw = localStorage.getItem(localKey);
      if (!raw) continue;

      let items: Record<string, unknown>[];
      try { items = JSON.parse(raw); } catch { continue; }
      if (!Array.isArray(items) || items.length === 0) continue;

      const cleaned = items.map(item => {
        const row: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item)) {
          if (k === 'updated_at') continue;
          row[k] = v;
        }
        row.couple_id = coupleId;
        row.profile_id = profile.id;
        delete row.id;
        return row;
      });

      const { error, data } = await supabase.from(supabaseTable).insert(cleaned).select('id');

      if (error) {
        totalErrors++;
        details.push(`${supabaseTable}: ERRO - ${error.message}`);
      } else {
        const count = data?.length ?? cleaned.length;
        totalMigrated += count;
        details.push(`${supabaseTable}: ${count} registros migrados`);
      }
    }

    setMigrating(false);

    const summary = `Migração concluída!\n\n${details.join('\n')}\n\nTotal: ${totalMigrated} registros migrados, ${totalErrors} erros.`;
    setMigrationResult(summary);
    alert(summary);
  }

  const hasLocalData = Object.keys(TABLE_MAP).some(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  });

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
      title: 'Dados',
      items: [
        ...(supabaseConfigured && hasLocalData ? [{
          icon: CloudUpload,
          label: migrating ? 'Migrando...' : 'Migrar para a nuvem',
          desc: migrating ? 'Enviando dados para o Supabase...' : 'Enviar dados locais para o Supabase',
          onClick: handleMigrateToCloud,
          highlight: true,
        }] : []),
        { icon: Download, label: 'Exportar backup', desc: 'Salvar todos os dados em arquivo JSON', onClick: handleExport, highlight: false },
        { icon: Upload, label: 'Importar backup', desc: 'Restaurar dados de outro dispositivo', onClick: handleImportClick, highlight: false },
      ],
    },
    {
      title: 'App',
      items: [
        ...(!isInstalled ? [{
          icon: Smartphone,
          label: 'Instalar aplicativo',
          desc: installPrompt ? 'Toque para instalar na tela inicial' : 'Adicionar à tela inicial (PWA)',
          onClick: handleInstallClick,
          highlight: !!installPrompt,
        }] : []),
        { icon: Shield, label: 'Privacidade', desc: 'Dados locais e seguros', onClick: () => alert('Seus dados são armazenados de forma segura. Nenhum dado é compartilhado com terceiros.') },
        { icon: Info, label: 'Sobre', desc: 'Conecta Finanças v1.0', onClick: () => alert('Conecta Finanças v1.0\nGestão financeira simples, organizada e inteligente.\nDesenvolvido com React + TypeScript.') },
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {migrationResult && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-line">{migrationResult}</p>
        </Card>
      )}

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</h2>
          <Card className="divide-y divide-gray-100 dark:divide-gray-700 !p-0 overflow-hidden">
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                disabled={'label' in item && item.label === 'Migrando...'}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left ${
                  'highlight' in item && item.highlight ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${'label' in item && item.label === 'Migrando...' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  'highlight' in item && item.highlight
                    ? 'bg-blue-100 dark:bg-blue-900/40'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <item.icon size={18} className={
                    'highlight' in item && item.highlight
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    'highlight' in item && item.highlight
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>{item.label}</p>
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
