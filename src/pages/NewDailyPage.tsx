import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { dailyIncomeService, accountService } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import { formatCurrency } from '../utils/format';
import type { BankAccount } from '../types';

export function NewDailyPage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    quantity: '1',
    rate: '',
    description: '',
    account_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const quantity = parseInt(form.quantity) || 0;
  const rate = parseFloat(form.rate.replace(',', '.')) || 0;
  const total = quantity * rate;

  async function handleSave() {
    if (!profile || !coupleId || !form.rate) return;
    setSaving(true);
    try {
      await dailyIncomeService.create({
        couple_id: coupleId,
        profile_id: profile.id,
        date: form.date,
        quantity,
        rate,
        description: form.description || null,
        account_id: form.account_id || null,
      });
      setSaved(true);
      setTimeout(() => navigate('/daily'), 800);
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
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Diária salva!</p>
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nova Diária</h1>
      </div>

      <Card>
        <div className="space-y-4">
          <Input label="Data" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Quantidade" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <Input label="Valor da diária (R$)" placeholder="0,00" value={form.rate} onChange={e => set('rate', e.target.value)} inputMode="decimal" required />

          {total > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 dark:text-green-400">Total</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(total)}</p>
              <p className="text-xs text-green-500">{quantity} x {formatCurrency(rate)}</p>
            </div>
          )}

          <Input label="Descrição" placeholder="Opcional" value={form.description} onChange={e => set('description', e.target.value)} />

          {accounts.length > 0 && (
            <Select
              label="Conta"
              placeholder="Selecione (opcional)"
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
              value={form.account_id}
              onChange={e => set('account_id', e.target.value)}
            />
          )}

          <Button onClick={handleSave} loading={saving} disabled={!form.rate} className="w-full" size="lg">
            Salvar Diária
          </Button>
        </div>
      </Card>
    </div>
  );
}
