import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Repeat, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { fixedExpenseService } from '../services/api';
import { Button, Card, CardSkeleton, Modal, Input, Select as UISelect } from '../components/ui';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import type { FixedExpense } from '../types';

const recurrenceLabels: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const recurrenceOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

const visibilityOptions = [
  { value: 'shared', label: 'Casa (todos)' },
  { value: 'individual', label: 'Gabriel' },
  { value: 'household', label: 'Rayane' },
  { value: 'children', label: 'Filhos' },
];

export function BillsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, coupleId } = useAuth();
  const { data: bills, loading, refresh } = useData<FixedExpense>(
    (coupleId) => fixedExpenseService.list(coupleId)
  );

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (location.pathname === '/new/bill') setShowForm(true);
  }, [location.pathname]);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    due_day: '10',
    recurrence: 'monthly',
    visibility: 'shared',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const totalMonthly = bills
    .filter(b => b.active)
    .reduce((s, b) => s + Number(b.amount), 0);

  async function handleSave() {
    if (!profile || !coupleId) return;
    setSaving(true);
    try {
      await fixedExpenseService.create({
        couple_id: coupleId,
        profile_id: profile.id,
        description: form.description,
        amount: parseFloat(form.amount.replace(',', '.')),
        due_day: parseInt(form.due_day),
        recurrence: form.recurrence as FixedExpense['recurrence'],
        visibility: form.visibility as FixedExpense['visibility'],
        notes: form.notes || null,
      });
      setShowForm(false);
      setForm({ description: '', amount: '', due_day: '10', recurrence: 'monthly', visibility: 'shared', notes: '' });
      refresh();
    } catch (err) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta conta?')) return;
    await fixedExpenseService.delete(id);
    refresh();
  }

  async function handleToggleActive(bill: FixedExpense) {
    await fixedExpenseService.update(bill.id, { active: !bill.active });
    refresh();
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contas a Pagar</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova
        </Button>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Repeat size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Total mensal em contas fixas</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalMonthly)}</p>
          </div>
        </div>
      </Card>

      {bills.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">Nenhuma conta cadastrada ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Adicione energia, água, internet, aluguel...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {bills.map((bill, i) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`${!bill.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{bill.description}</p>
                    <p className="text-xs text-gray-400">
                      Vence dia {bill.due_day} • {recurrenceLabels[bill.recurrence]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(bill.amount))}</p>
                    <span className={`text-[10px] font-medium ${bill.active ? 'text-green-500' : 'text-gray-400'}`}>
                      {bill.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleToggleActive(bill)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {bill.active ? 'Pausar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta Fixa">
        <div className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Energia, Internet..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            required
          />
          <Input
            label="Valor (R$)"
            placeholder="0,00"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            inputMode="decimal"
            required
          />
          <Input
            label="Dia do vencimento"
            type="number"
            min="1"
            max="31"
            value={form.due_day}
            onChange={e => setForm({ ...form, due_day: e.target.value })}
            required
          />
          <UISelect
            label="Recorrência"
            options={recurrenceOptions}
            value={form.recurrence}
            onChange={e => setForm({ ...form, recurrence: e.target.value })}
          />
          <UISelect
            label="Visibilidade"
            options={visibilityOptions}
            value={form.visibility}
            onChange={e => setForm({ ...form, visibility: e.target.value })}
          />
          <Input
            label="Observação"
            placeholder="Opcional"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.description || !form.amount} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
