import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { transferService, accountService } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import type { BankAccount } from '../types';

export function NewTransferPage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: accounts } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  const [form, setForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!profile || !coupleId || !form.from_account_id || !form.to_account_id || !form.amount) return;
    if (form.from_account_id === form.to_account_id) {
      alert('As contas de origem e destino devem ser diferentes.');
      return;
    }
    setSaving(true);
    try {
      await transferService.create({
        couple_id: coupleId,
        profile_id: profile.id,
        from_account_id: form.from_account_id,
        to_account_id: form.to_account_id,
        amount: parseFloat(form.amount.replace(',', '.')),
        date: form.date,
        notes: form.notes || null,
      });
      setSaved(true);
      setTimeout(() => navigate('/transfers'), 800);
    } catch (err) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)));
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
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transferência realizada!</p>
        </motion.div>
      </div>
    );
  }

  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transferência</h1>
      </div>

      <Card>
        <div className="space-y-4">
          <Select label="Conta de origem" placeholder="Selecione" options={accountOptions} value={form.from_account_id} onChange={e => set('from_account_id', e.target.value)} />

          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ArrowRight size={16} className="text-blue-600" />
            </div>
          </div>

          <Select label="Conta de destino" placeholder="Selecione" options={accountOptions} value={form.to_account_id} onChange={e => set('to_account_id', e.target.value)} />

          <Input label="Valor (R$)" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} inputMode="decimal" required />
          <Input label="Data" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Observação" placeholder="Opcional" value={form.notes} onChange={e => set('notes', e.target.value)} />

          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!form.from_account_id || !form.to_account_id || !form.amount}
            className="w-full"
            size="lg"
          >
            Transferir
          </Button>
        </div>
      </Card>
    </div>
  );
}
