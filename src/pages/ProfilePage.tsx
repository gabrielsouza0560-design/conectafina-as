import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Input, Card } from '../components/ui';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, signOut, updateProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    await updateProfile({ name });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Perfil</h1>
      </div>

      <Card>
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <button
              onClick={() => alert('Upload de foto estará disponível em breve!')}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-700 shadow flex items-center justify-center"
              title="Alterar foto"
            >
              <Camera size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Nome"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Button onClick={handleSave} loading={loading} className="w-full">
            {saved ? 'Salvo!' : 'Salvar'}
          </Button>
        </div>
      </Card>

      <Card>
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Moon size={20} className="text-gray-600" /> : <Sun size={20} className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </button>
      </Card>

      <Card>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 text-red-600 dark:text-red-400"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Sair da conta</span>
        </button>
      </Card>
    </div>
  );
}
