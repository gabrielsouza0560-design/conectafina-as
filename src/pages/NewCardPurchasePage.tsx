import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { cardTransactionService, cardService, categoryService } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import { formatCurrency } from '../utils/format';
import type { CreditCard, Category } from '../types';

const visibilityOptions = [
  { value: 'shared', label: 'Casa (todos)' },
  { value: 'individual', label: 'Gabriel' },
  { value: 'household', label: 'Rayane' },
  { value: 'children', label: 'Filhos' },
];

export function NewCardPurchasePage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: cards } = useData<CreditCard>(
    (coupleId) => cardService.list(coupleId)
  );
  const { data: categories } = useData<Category>(
    (coupleId) => categoryService.list(coupleId)
  );

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const [form, setForm] = useState({
    card_id: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    total_installments: '1',
    category_id: '',
    visibility: 'shared',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const amount = parseFloat(form.amount.replace(',', '.')) || 0;
  const installments = parseInt(form.total_installments) || 1;
  const installmentAmount = installments > 0 ? amount / installments : 0;

  async function handleSave() {
    if (!profile || !coupleId || !form.card_id || !form.description || !form.amount) return;
    setSaving(true);
    try {
      await cardTransactionService.create({
        couple_id: coupleId,
        card_id: form.card_id,
        profile_id: profile.id,
        description: form.description,
        amount,
        date: form.date,
        total_installments: installments,
        category_id: form.category_id || null,
        visibility: form.visibility as any,
        notes: form.notes || null,
      });
      setSaved(true);
      setTimeout(() => navigate('/cards'), 800);
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
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compra registrada!</p>
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compra no Cartão</h1>
      </div>

      <Card>
        <div className="space-y-4">
          <Select
            label="Cartão"
            placeholder="Selecione o cartão"
            options={cards.map(c => ({ value: c.id, label: `${c.name} (${c.bank})` }))}
            value={form.card_id}
            onChange={e => set('card_id', e.target.value)}
          />
          <Input label="O que foi comprado" placeholder="Ex: Supermercado" value={form.description} onChange={e => set('description', e.target.value)} required />
          <Input label="Valor total (R$)" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} inputMode="decimal" required />
          <Input label="Data" type="date" value={form.date} onChange={e => set('date', e.target.value)} />

          <div>
            <Input
              label="Parcelas"
              type="number"
              min="1"
              max="48"
              value={form.total_installments}
              onChange={e => set('total_installments', e.target.value)}
            />
            {installments > 1 && amount > 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                {installments}x de {formatCurrency(installmentAmount)}
              </p>
            )}
          </div>

          <Select
            label="Categoria"
            placeholder="Selecione"
            options={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
          />

          <Select label="Visibilidade" options={visibilityOptions} value={form.visibility} onChange={e => set('visibility', e.target.value)} />
          <Input label="Observação" placeholder="Opcional" value={form.notes} onChange={e => set('notes', e.target.value)} />

          <Button onClick={handleSave} loading={saving} disabled={!form.card_id || !form.description || !form.amount} className="w-full" size="lg">
            Registrar Compra
          </Button>
        </div>
      </Card>
    </div>
  );
}
