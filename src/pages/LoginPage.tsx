import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', partnerName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      if (!form.name || !form.email || !form.password) {
        setError('Preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('As senhas não conferem.');
        setLoading(false);
        return;
      }
      const result = await signUp(form.email, form.password, form.name, form.partnerName || undefined);
      if (result.error) setError(result.error);
    } else {
      if (!form.email || !form.password) {
        setError('Preencha email e senha.');
        setLoading(false);
        return;
      }
      const result = await signIn(form.email, form.password);
      if (result.error) setError(result.error);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conecta Finanças</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Controle financeiro do casal</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Input
                  label="Seu nome"
                  placeholder="Ex: Gabriel"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
                <Input
                  label="Nome do parceiro(a) (opcional)"
                  placeholder="Ex: Rayane"
                  value={form.partnerName}
                  onChange={e => set('partnerName', e.target.value)}
                />
              </>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />

            {mode === 'register' && (
              <Input
                label="Confirmar senha"
                type="password"
                placeholder="Repita a senha"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                required
              />
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Seus dados ficam salvos neste dispositivo.
        </p>
      </div>
    </div>
  );
}
