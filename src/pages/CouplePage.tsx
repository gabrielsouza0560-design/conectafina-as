import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, UserPlus, Link2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Input, Card } from '../components/ui';

export function CouplePage() {
  const navigate = useNavigate();
  const { profile, coupleId, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [coupleName, setCoupleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!supabase || !profile) return;
    setError('');
    setLoading(true);

    const { data: couple, error: err } = await supabase
      .from('couples')
      .insert({ name: coupleName || 'Nosso Casal' })
      .select()
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    await supabase.from('couple_members').insert({
      couple_id: couple.id,
      profile_id: profile.id,
      role: 'owner',
      label: label || profile.name,
    });

    await refreshProfile();
    setLoading(false);
  }

  async function handleJoin() {
    if (!supabase || !profile) return;
    setError('');
    setLoading(true);

    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .eq('id', inviteCode.trim())
      .single();

    if (!couple) { setError('Código inválido'); setLoading(false); return; }

    const { error: err } = await supabase.from('couple_members').insert({
      couple_id: couple.id,
      profile_id: profile.id,
      role: 'partner',
      label: label || profile.name,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    await refreshProfile();
    setLoading(false);
  }

  if (coupleId) {
    const isDemoCouple = coupleId === 'demo-couple';
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Casal</h1>
        </div>
        {isDemoCouple && (
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Modo demonstração — configure o Supabase para criar um casal real.
              </p>
            </div>
          </Card>
        )}
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Users size={28} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Casal configurado!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isDemoCouple
                ? 'Gabriel e Rayane — casal de demonstração'
                : 'Compartilhe o código abaixo com seu parceiro(a):'}
            </p>
            {!isDemoCouple && (
              <div className="mt-4 bg-gray-100 dark:bg-gray-700 rounded-xl px-6 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Código do casal</p>
                <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 select-all">{coupleId}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sistema de Casal</h1>
      </div>

      {mode === 'menu' && (
        <div className="space-y-3">
          <Card>
            <button onClick={() => setMode('create')} className="w-full flex items-center gap-4 py-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <Plus size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Criar novo casal</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure um ambiente financeiro compartilhado</p>
              </div>
            </button>
          </Card>
          <Card>
            <button onClick={() => setMode('join')} className="w-full flex items-center gap-4 py-2">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <UserPlus size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Entrar em um casal</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Use o código do seu parceiro(a)</p>
              </div>
            </button>
          </Card>
        </div>
      )}

      {mode === 'create' && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Criar casal</h3>
          <div className="space-y-4">
            <Input
              label="Nome do casal (opcional)"
              value={coupleName}
              onChange={e => setCoupleName(e.target.value)}
              placeholder="Ex: Gabriel e Maria"
            />
            <Input
              label="Seu apelido"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Gabriel"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('menu')} className="flex-1">Voltar</Button>
              <Button onClick={handleCreate} loading={loading} className="flex-1">Criar</Button>
            </div>
          </div>
        </Card>
      )}

      {mode === 'join' && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Entrar no casal</h3>
          <div className="space-y-4">
            <Input
              label="Código do casal"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="Cole o código aqui"
              icon={<Link2 size={18} />}
            />
            <Input
              label="Seu apelido"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Maria"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('menu')} className="flex-1">Voltar</Button>
              <Button onClick={handleJoin} loading={loading} className="flex-1">Entrar</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
