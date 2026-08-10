import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Wallet, ArrowLeftRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { accountService } from '../services/api';
import { Button, Card, CardSkeleton, Modal, Input, Select } from '../components/ui';
import { formatCurrency } from '../utils/format';
import type { BankAccount } from '../types';

const accountTypes = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'other', label: 'Outro' },
];

const accountColors = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#F97316', label: 'Laranja' },
  { value: '#10B981', label: 'Verde' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#FBBF24', label: 'Amarelo' },
  { value: '#1E293B', label: 'Escuro' },
];

const typeLabels: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', digital: 'Conta Digital',
  cash: 'Dinheiro', wallet: 'Carteira', other: 'Outro',
};

export function AccountsPage() {
  const navigate = useNavigate();
  const { coupleId } = useAuth();
  const { data: accounts, loading, refresh } = useData<BankAccount>(
    (coupleId) => accountService.list(coupleId)
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'checking', balance: '0', color: '#3B82F6',
  });
  const [saving, setSaving] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!coupleId || !form.name) return;
    setSaving(true);
    try {
      await accountService.create({
        couple_id: coupleId,
        name: form.name,
        type: form.type as BankAccount['type'],
        balance: parseFloat(form.balance.replace(',', '.')) || 0,
        color: form.color,
      });
      setShowForm(false);
      setForm({ name: '', type: 'checking', balance: '0', color: '#3B82F6' });
      refresh();
    } catch (err) { alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err))); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta conta bancária?')) return;
    await accountService.delete(id);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contas Bancárias</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/new/transfer')}>
            <ArrowLeftRight size={16} />
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
        <div className="text-white">
          <p className="text-sm text-blue-200">Saldo total</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-blue-200 mt-1">{accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}</p>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Wallet size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma conta cadastrada.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Cadastrar conta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color + '20' }}>
                    <Wallet size={20} style={{ color: acc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{acc.name}</p>
                    <p className="text-xs text-gray-400">{typeLabels[acc.type] || acc.type}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${Number(acc.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(Number(acc.balance))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta Bancária">
        <div className="space-y-4">
          <Input label="Nome da conta" placeholder="Ex: Nubank, Inter, Dinheiro" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Select label="Tipo" options={accountTypes} value={form.type} onChange={e => set('type', e.target.value)} />
          <Input label="Saldo inicial (R$)" placeholder="0,00" value={form.balance} onChange={e => set('balance', e.target.value)} inputMode="decimal" />
          <Select label="Cor" options={accountColors} value={form.color} onChange={e => set('color', e.target.value)} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name} className="flex-1">Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
