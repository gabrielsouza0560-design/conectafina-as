import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { incomeService, accountService } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import type { BankAccount } from '../types';

const incomeTypes = [
  { value: 'salary', label: 'Salário' },
  { value: 'allowance', label: 'Vale' },
  { value: 'bonus', label: 'Bonificação' },
  { value: 'extra', label: 'Renda Extra' },
  { value: 'daily', label: 'Diária' },
  { value: 'other', label: 'Outros' },
];

const visibilityOptions = [
  { value: 'shared', label: 'Casa (todos)' },
  { value: 'individual', label: 'Gabriel' },
  { value: 'household', label: 'Rayane' },
  { value: 'children', label: 'Filhos' },
];

export function NewIncomePage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  const [form, setForm] = useState({
    type: 'salary',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    account_id: '',
    visibility: 'shared',
    notes: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!profile || !coupleId || !form.description || !form.amount) return;
    setSaving(true);
    try {
      await incomeService.create({
        couple_id: coupleId,
        profile_id: profile.id,
        type: form.type as any,
        description: form.description,
        amount: parseFloat(form.amount.replace(',', '.')),
        date: form.date,
        account_id: form.account_id || null,
        visibility: form.visibility as any,
        notes: form.notes || null,
        status: form.status as any,
      });
      setSaved(true);
      setTimeout(() => navigate('/income'), 800);
    } catch {
      alert('Erro ao salvar');
    }
    setSaving(false);
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-white" />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Entrada salva!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nova Entrada</h1>
      </div>

      <Card>
        <div className="space-y-4">
          <Select label="Tipo" options={incomeTypes} value={form.type} onChange={e => set('type', e.target.value)} />
          <Input label="Descrição" placeholder="Ex: Salário outubro" value={form.description} onChange={e => set('description', e.target.value)} required />
          <Input label="Valor (R$)" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} inputMode="decimal" required />
          <Input label="Data" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          {accounts.length > 0 && (
            <Select
              label="Conta"
              placeholder="Selecione (opcional)"
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
              value={form.account_id}
              onChange={e => set('account_id', e.target.value)}
            />
          )}
          <Select label="Visibilidade" options={visibilityOptions} value={form.visibility} onChange={e => set('visibility', e.target.value)} />
          <Select
            label="Status"
            options={[
              { value: 'pending', label: 'Pendente' },
              { value: 'paid', label: 'Já recebido' },
              { value: 'scheduled', label: 'Agendado' },
            ]}
            value={form.status}
            onChange={e => set('status', e.target.value)}
          />
          <Input label="Observação" placeholder="Opcional" value={form.notes} onChange={e => set('notes', e.target.value)} />

          <Button onClick={handleSave} loading={saving} disabled={!form.description || !form.amount} className="w-full" size="lg">
            Salvar Entrada
          </Button>
        </div>
      </Card>
    </div>
  );
}
