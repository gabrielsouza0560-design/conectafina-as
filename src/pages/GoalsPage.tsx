import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { goalService } from '../services/api';
import { Button, Card, CardSkeleton, Modal, Input, EmptyState } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/format';
import type { FinancialGoal } from '../types';

export function GoalsPage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: goals, loading, refresh } = useData<FinancialGoal>(
    (coupleId) => goalService.list(coupleId)
  );

  const [showForm, setShowForm] = useState(false);
  const [showDeposit, setShowDeposit] = useState<FinancialGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [form, setForm] = useState({
    name: '', target_amount: '', deadline: '', monthly_contribution: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!profile || !coupleId || !form.name || !form.target_amount) return;
    setSaving(true);
    try {
      await goalService.create({
        couple_id: coupleId,
        profile_id: profile.id,
        name: form.name,
        target_amount: parseFloat(form.target_amount.replace(',', '.')) || 0,
        deadline: form.deadline || null,
        monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution.replace(',', '.')) : null,
        description: form.description || null,
      });
      setShowForm(false);
      setForm({ name: '', target_amount: '', deadline: '', monthly_contribution: '', description: '' });
      refresh();
    } catch (err) { alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err))); }
    setSaving(false);
  }

  async function handleDeposit() {
    if (!showDeposit || !depositAmount) return;
    const amount = parseFloat(depositAmount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await goalService.update(showDeposit.id, {
        current_amount: Number(showDeposit.current_amount) + amount,
      });
      setShowDeposit(null);
      setDepositAmount('');
      refresh();
    } catch { alert('Erro ao depositar'); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta meta?')) return;
    await goalService.delete(id);
    refresh();
  }

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const overallPct = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;

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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Metas Financeiras</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova
        </Button>
      </div>

      {goals.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-500 to-orange-600 border-0">
          <div className="text-white">
            <p className="text-sm text-amber-100">Progresso geral</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCurrent)} <span className="text-base font-normal text-amber-200">/ {formatCurrency(totalTarget)}</span></p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <p className="text-xs text-amber-200 mt-1">{overallPct.toFixed(0)}% concluído • {goals.length} {goals.length === 1 ? 'meta' : 'metas'}</p>
          </div>
        </Card>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={40} />}
          title="Nenhuma meta definida"
          description="Crie metas para acompanhar seus objetivos financeiros."
          action={<Button size="sm" onClick={() => setShowForm(true)}><Plus size={16} /> Criar meta</Button>}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => {
            const pct = Number(goal.target_amount) > 0
              ? Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100) : 0;
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Target size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{goal.name}</p>
                          {goal.deadline && (
                            <p className="text-xs text-gray-400">Prazo: {formatDate(goal.deadline)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{formatCurrency(Number(goal.current_amount))}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                        {remaining > 0 && (
                          <span className="text-xs text-gray-400">Falta: {formatCurrency(remaining)}</span>
                        )}
                      </div>
                    </div>

                    {goal.monthly_contribution && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp size={12} /> Contribuição mensal: {formatCurrency(Number(goal.monthly_contribution))}
                      </p>
                    )}

                    {pct < 100 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => { setShowDeposit(goal); setDepositAmount(''); }}
                      >
                        <Plus size={14} /> Depositar
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Meta">
        <div className="space-y-4">
          <Input label="Nome da meta" placeholder="Ex: Viagem, Carro, Emergência" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Input label="Valor alvo (R$)" placeholder="0,00" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} inputMode="decimal" required />
          <Input label="Prazo" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          <Input label="Contribuição mensal (R$)" placeholder="0,00" value={form.monthly_contribution} onChange={e => set('monthly_contribution', e.target.value)} inputMode="decimal" />
          <Input label="Descrição" placeholder="Opcional" value={form.description} onChange={e => set('description', e.target.value)} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name || !form.target_amount} className="flex-1">Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showDeposit} onClose={() => setShowDeposit(null)} title={`Depositar — ${showDeposit?.name || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Saldo atual: {formatCurrency(Number(showDeposit?.current_amount || 0))} / {formatCurrency(Number(showDeposit?.target_amount || 0))}
          </p>
          <Input label="Valor do depósito (R$)" placeholder="0,00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} inputMode="decimal" autoFocus />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeposit(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleDeposit} loading={saving} disabled={!depositAmount} className="flex-1">Depositar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
