import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { cardService, cardTransactionService, installmentService } from '../services/api';
import { Button, Card, CardSkeleton, Modal, Input, Select } from '../components/ui';
import { formatCurrency, formatDate, parseBRCurrency } from '../utils/format';
import type { CreditCard as CardType, CardTransaction, Installment } from '../types';

const cardColors = [
  { value: '#8B5CF6', label: 'Roxo (Nubank)' },
  { value: '#F97316', label: 'Laranja (Inter)' },
  { value: '#10B981', label: 'Verde (Mercado Pago)' },
  { value: '#3B82F6', label: 'Azul (Caixa)' },
  { value: '#EF4444', label: 'Vermelho (Santander)' },
  { value: '#FBBF24', label: 'Amarelo (BB)' },
  { value: '#1E293B', label: 'Escuro' },
];

export function CardsPage() {
  const navigate = useNavigate();
  const { profile, coupleId } = useAuth();
  const { data: cards, loading, refresh } = useData<CardType>(
    (coupleId) => cardService.list(coupleId)
  );
  const { data: transactions, refresh: refreshTx } = useData<CardTransaction>(
    (coupleId) => cardTransactionService.list(coupleId)
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [cardInstallments, setCardInstallments] = useState<Installment[]>([]);
  const [form, setForm] = useState({
    name: '', bank: '', credit_limit: '', closing_day: '5', due_day: '15',
    color: '#8B5CF6', shared: false,
  });
  const [saving, setSaving] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleEditCard(card: CardType) {
    setEditingId(card.id);
    setForm({
      name: card.name || '',
      bank: card.bank || '',
      credit_limit: String(card.credit_limit || ''),
      closing_day: String(card.closing_day || 5),
      due_day: String(card.due_day || 15),
      color: card.color || '#8B5CF6',
      shared: card.shared || false,
    });
    setSelectedCard(null);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', bank: '', credit_limit: '', closing_day: '5', due_day: '15', color: '#8B5CF6', shared: false });
  }

  async function handleSave() {
    if (!profile || !coupleId || !form.name || !form.bank) return;
    setSaving(true);
    try {
      const payload = {
        couple_id: coupleId,
        profile_id: profile.id,
        name: form.name,
        bank: form.bank,
        credit_limit: parseBRCurrency(form.credit_limit) || 0,
        closing_day: parseInt(form.closing_day) || 5,
        due_day: parseInt(form.due_day) || 15,
        color: form.color,
        shared: form.shared,
      };
      if (editingId) {
        await cardService.update(editingId, payload);
      } else {
        await cardService.create(payload);
      }
      handleCloseForm();
      refresh();
    } catch (err) { alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err))); }
    setSaving(false);
  }

  function toggleTx(id: string) {
    setSelectedTx(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllTx(cardTxIds: string[]) {
    setSelectedTx(prev => {
      const allSelected = cardTxIds.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(cardTxIds);
    });
  }

  async function handleDeleteSelected() {
    if (selectedTx.size === 0) return;
    if (!confirm(`Excluir ${selectedTx.size} compra(s) selecionada(s)?`)) return;
    setDeleting(true);
    try {
      for (const id of selectedTx) {
        await cardTransactionService.delete(id);
      }
      setSelectedTx(new Set());
      refresh();
      refreshTx();
    } catch (err) {
      alert('Erro ao excluir: ' + (err instanceof Error ? err.message : String(err)));
    }
    setDeleting(false);
  }

  async function viewCard(card: CardType) {
    setSelectedCard(card);
    setSelectedTx(new Set());
    try {
      const inst = await installmentService.listByCard(card.id);
      setCardInstallments(inst);
    } catch { setCardInstallments([]); }
  }

  function getCardUsage(cardId: string) {
    return transactions
      .filter(t => t.card_id === cardId)
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cartão e todas as compras associadas?')) return;
    await cardService.delete(id);
    refresh();
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm('Excluir esta compra?')) return;
    await cardTransactionService.delete(id);
    refresh();
    refreshTx();
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cartões</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/new/card-purchase')}>
            <ShoppingCart size={16} /> Compra
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Cartão
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CreditCard size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum cartão cadastrado.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Cadastrar cartão
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card, i) => {
            const usage = getCardUsage(card.id);
            const limit = Number(card.credit_limit);
            const available = limit - usage;
            const pct = limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button onClick={() => viewCard(card)} className="w-full text-left">
                  <div
                    className="rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}CC)` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-lg font-bold">{card.name}</p>
                        <p className="text-sm opacity-80">{card.bank}</p>
                      </div>
                      <CreditCard size={24} className="opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="opacity-80">Utilizado</span>
                        <span className="font-semibold">{formatCurrency(usage)}</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-white/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs opacity-70">
                        <span>Disponível: {formatCurrency(available)}</span>
                        <span>Limite: {formatCurrency(limit)}</span>
                      </div>
                      <div className="flex justify-between text-xs opacity-70 pt-1">
                        <span>Fecha dia {card.closing_day}</span>
                        <span>Vence dia {card.due_day}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal novo cartão */}
      <Modal open={showForm} onClose={handleCloseForm} title={editingId ? 'Editar Cartão' : 'Novo Cartão'}>
        <div className="space-y-4">
          <Input label="Nome do cartão" placeholder="Ex: Nubank" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Input label="Banco" placeholder="Ex: Nu Pagamentos" value={form.bank} onChange={e => set('bank', e.target.value)} required />
          <Input label="Limite (R$)" placeholder="0,00" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} inputMode="decimal" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dia de fechamento" type="number" min="1" max="31" value={form.closing_day} onChange={e => set('closing_day', e.target.value)} />
            <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.due_day} onChange={e => set('due_day', e.target.value)} />
          </div>
          <Select label="Cor" options={cardColors} value={form.color} onChange={e => set('color', e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.shared} onChange={e => set('shared', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cartão compartilhado com parceiro(a)</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseForm} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name || !form.bank} className="flex-1">{editingId ? 'Salvar Alterações' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal detalhes do cartão */}
      <Modal open={!!selectedCard} onClose={() => setSelectedCard(null)} title={selectedCard?.name || 'Cartão'} size="lg">
        {selectedCard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400">Limite</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(Number(selectedCard.credit_limit))}</p>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 dark:text-purple-400">Utilizado</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(getCardUsage(selectedCard.id))}</p>
              </Card>
            </div>

            <div>
              {(() => {
                const cardTx = transactions.filter(t => t.card_id === selectedCard.id);
                const cardTxIds = cardTx.map(t => t.id);
                const allSelected = cardTx.length > 0 && cardTxIds.every(id => selectedTx.has(id));
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compras ({cardTx.length})</h4>
                      {cardTx.length > 0 && (
                        <div className="flex items-center gap-2">
                          {selectedTx.size > 0 && (
                            <Button size="sm" variant="danger" onClick={handleDeleteSelected} loading={deleting}>
                              <Trash2 size={14} /> Apagar {selectedTx.size}
                            </Button>
                          )}
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleAllTx(cardTxIds)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Todos
                          </label>
                        </div>
                      )}
                    </div>
                    {cardTx.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">Nenhuma compra neste cartão</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {cardTx.map(t => (
                          <div key={t.id} className={`flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 ${selectedTx.has(t.id) ? 'bg-red-50 dark:bg-red-900/10 rounded-lg px-2 -mx-2' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedTx.has(t.id)}
                              onChange={() => toggleTx(t.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.description}</p>
                              <p className="text-xs text-gray-400">{formatDate(t.date)} • {t.total_installments}x</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mr-1">{formatCurrency(Number(t.amount))}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/edit/card-purchase/' + t.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {cardInstallments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Parcelas</h4>
                <div className="space-y-1">
                  {cardInstallments.slice(0, 12).map(inst => (
                    <div key={inst.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{formatDate(inst.due_date)}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(inst.amount))}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inst.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        inst.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {inst.status === 'paid' ? 'Pago' : inst.status === 'overdue' ? 'Vencido' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => handleEditCard(selectedCard)}>
                <Pencil size={14} /> Editar
              </Button>
              <Button variant="danger" size="sm" onClick={() => { handleDelete(selectedCard.id); setSelectedCard(null); }}>
                Excluir cartão
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
