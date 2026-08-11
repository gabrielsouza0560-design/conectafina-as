import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, CreditCard, Calendar, Clock, ArrowLeftRight, Filter, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, cardTransactionService, fixedExpenseService, cardService, dailyIncomeService, transferService, accountService, categoryService } from '../services/api';
import { Button, Card, CardSkeleton, Select, Modal } from '../components/ui';
import { formatCurrency, formatDate, getMonthName } from '../utils/format';
import type { Income, Expense, CardTransaction, FixedExpense, CreditCard as CardType, DailyIncome, Transfer, BankAccount, Category } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const visibilityLabels: Record<string, string> = {
  all: 'Geral (Todos)',
  shared: 'Casa (todos)',
  individual: 'Gabriel',
  household: 'Rayane',
  children: 'Filhos',
};

const visibilityOptions = [
  { value: 'all', label: 'Geral (Todos)' },
  { value: 'shared', label: 'Casa (todos)' },
  { value: 'individual', label: 'Gabriel' },
  { value: 'household', label: 'Rayane' },
  { value: 'children', label: 'Filhos' },
];

export function ReportsPage() {
  const navigate = useNavigate();
  const { coupleId } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedVisibility, setSelectedVisibility] = useState('all');
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [targetMonth, setTargetMonth] = useState(() => {
    const next = now.getMonth() + 1;
    return next > 11 ? 0 : next;
  });
  const [targetYear, setTargetYear] = useState(() => {
    const next = now.getMonth() + 1;
    return next > 11 ? now.getFullYear() + 1 : now.getFullYear();
  });
  const [duplicating, setDuplicating] = useState(false);

  const { data: incomes, loading: l1, refresh: r1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2, refresh: r2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: cardTx, loading: l3, refresh: r3 } = useData<CardTransaction>((c) => cardTransactionService.list(c));
  const { data: bills, loading: l4 } = useData<FixedExpense>((c) => fixedExpenseService.list(c));
  const { data: cards, loading: l5 } = useData<CardType>((c) => cardService.list(c));
  const { data: dailies, loading: l6, refresh: r6 } = useData<DailyIncome>((c) => dailyIncomeService.list(c));
  const { data: transfers, loading: l7 } = useData<Transfer>((c) => transferService.list(c));
  const { data: accounts, loading: l8 } = useData<BankAccount>((c) => accountService.list(c));
  const { data: categories, loading: l9 } = useData<Category>((c) => categoryService.list(c));

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  function getCardName(cardId: string) {
    return cards.find(c => c.id === cardId)?.name || 'Cartão';
  }

  function getAccountName(id: string) {
    return accounts.find(a => a.id === id)?.name || 'Conta';
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return 'Sem categoria';
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  }

  function filterByVisibility<T extends { visibility?: string }>(items: T[]): T[] {
    if (selectedVisibility === 'all') return items;
    return items.filter(i => i.visibility === selectedVisibility);
  }

  const report = useMemo(() => {
    const monthIncomes = filterByVisibility(incomes.filter(i => i.date.startsWith(monthStr)));
    const monthExpenses = filterByVisibility(expenses.filter(e => e.date.startsWith(monthStr)));
    const monthCards = filterByVisibility(cardTx.filter(c => c.date.startsWith(monthStr)));
    const monthDailies = dailies.filter(d => d.date.startsWith(monthStr));
    const monthTransfers = transfers.filter(t => t.date.startsWith(monthStr));
    const activeBills = filterByVisibility(bills.filter(b => b.active));

    const totalIncome = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const paidIncome = monthIncomes.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const paidExpense = monthExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0);
    const totalCards = monthCards.reduce((s, c) => s + Number(c.amount), 0);
    const totalBills = activeBills.reduce((s, b) => s + Number(b.amount), 0);
    const totalDailies = monthDailies.reduce((s, d) => s + Number(d.total), 0);
    const totalTransfers = monthTransfers.reduce((s, t) => s + Number(t.amount), 0);

    const incomeByType: Record<string, number> = {};
    monthIncomes.forEach(i => {
      incomeByType[i.type] = (incomeByType[i.type] || 0) + Number(i.amount);
    });

    const incomeByCategory: Record<string, number> = {};
    monthIncomes.forEach(i => {
      const cat = getCategoryName(i.category_id);
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(i.amount);
    });

    const expenseByCategory: Record<string, number> = {};
    monthExpenses.forEach(e => {
      const cat = getCategoryName(e.category_id);
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount);
    });

    const cardByCategory: Record<string, number> = {};
    monthCards.forEach(c => {
      const cat = getCategoryName(c.category_id);
      cardByCategory[cat] = (cardByCategory[cat] || 0) + Number(c.amount);
    });

    const cardBreakdown: Record<string, { name: string; total: number; purchases: CardTransaction[] }> = {};
    monthCards.forEach(ct => {
      if (!cardBreakdown[ct.card_id]) {
        cardBreakdown[ct.card_id] = { name: getCardName(ct.card_id), total: 0, purchases: [] };
      }
      cardBreakdown[ct.card_id].total += Number(ct.amount);
      cardBreakdown[ct.card_id].purchases.push(ct);
    });

    const byVisibility: Record<string, { income: number; expense: number; cards: number }> = {};
    incomes.filter(i => i.date.startsWith(monthStr)).forEach(i => {
      const v = i.visibility || 'shared';
      if (!byVisibility[v]) byVisibility[v] = { income: 0, expense: 0, cards: 0 };
      byVisibility[v].income += Number(i.amount);
    });
    expenses.filter(e => e.date.startsWith(monthStr)).forEach(e => {
      const v = e.visibility || 'shared';
      if (!byVisibility[v]) byVisibility[v] = { income: 0, expense: 0, cards: 0 };
      byVisibility[v].expense += Number(e.amount);
    });
    cardTx.filter(c => c.date.startsWith(monthStr)).forEach(c => {
      const v = c.visibility || 'shared';
      if (!byVisibility[v]) byVisibility[v] = { income: 0, expense: 0, cards: 0 };
      byVisibility[v].cards += Number(c.amount);
    });

    return {
      totalIncome, paidIncome, pendingIncome: totalIncome - paidIncome,
      totalExpense, paidExpense, pendingExpense: totalExpense - paidExpense,
      totalCards, totalBills, totalDailies, totalTransfers,
      balance: totalIncome + totalDailies - totalExpense - totalCards,
      incomeCount: monthIncomes.length,
      expenseCount: monthExpenses.length,
      cardCount: monthCards.length,
      dailyCount: monthDailies.length,
      transferCount: monthTransfers.length,
      incomeByType, incomeByCategory, expenseByCategory, cardByCategory,
      cardBreakdown, byVisibility,
      monthIncomes, monthExpenses, monthCards, monthDailies, monthTransfers, activeBills,
    };
  }, [incomes, expenses, cardTx, bills, dailies, transfers, monthStr, cards, categories, selectedVisibility]);

  const typeLabels: Record<string, string> = {
    salary: 'Salário', allowance: 'Vale', bonus: 'Bonificação',
    extra: 'Renda Extra', daily: 'Diária', other: 'Outros',
  };

  const statusLabels: Record<string, string> = {
    paid: 'Pago', pending: 'Pendente', overdue: 'Vencido', scheduled: 'Agendado',
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i), label: getMonthName(i),
  }));

  const yearOptions = [
    { value: String(now.getFullYear() - 1), label: String(now.getFullYear() - 1) },
    { value: String(now.getFullYear()), label: String(now.getFullYear()) },
    { value: String(now.getFullYear() + 1), label: String(now.getFullYear() + 1) },
  ];

  function getExportRows() {
    const rows: string[][] = [];
    report.monthIncomes.forEach(i => rows.push(['Entrada', i.description, Number(i.amount).toFixed(2), i.date, statusLabels[i.status] || i.status, '', getCategoryName(i.category_id), visibilityLabels[i.visibility] || i.visibility]));
    report.monthExpenses.forEach(e => rows.push(['Despesa', e.description, Number(e.amount).toFixed(2), e.date, statusLabels[e.status] || e.status, '', getCategoryName(e.category_id), visibilityLabels[e.visibility] || e.visibility]));
    report.monthCards.forEach(c => rows.push(['Cartão', c.description, Number(c.amount).toFixed(2), c.date, `${c.total_installments}x`, getCardName(c.card_id), getCategoryName(c.category_id), visibilityLabels[c.visibility] || c.visibility]));
    report.monthDailies.forEach(d => rows.push(['Diária', d.description || `${d.quantity}x ${Number(d.rate).toFixed(2)}`, Number(d.total).toFixed(2), d.date, statusLabels[d.status] || d.status, '', '', '']));
    report.monthTransfers.forEach(t => rows.push(['Transferência', `${getAccountName(t.from_account_id)} → ${getAccountName(t.to_account_id)}`, Number(t.amount).toFixed(2), t.date, '', '', '', '']));
    report.activeBills.forEach(b => rows.push(['Conta Fixa', b.description, Number(b.amount).toFixed(2), `Dia ${b.due_day}`, 'Mensal', '', '', visibilityLabels[b.visibility] || b.visibility]));
    return rows;
  }

  function exportCSV() {
    const rows = getExportRows();
    let csv = 'Tipo,Descrição,Valor,Data,Status,Cartão,Categoria,Visibilidade\n';
    rows.forEach(r => { csv += `${r[0]},"${r[1]}",${r[2]},${r[3]},${r[4]},"${r[5]}","${r[6]}","${r[7]}"\n`; });

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${monthStr}${selectedVisibility !== 'all' ? `-${selectedVisibility}` : ''}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportExcel() {
    const rows = getExportRows();
    const header = ['Tipo', 'Descrição', 'Valor (R$)', 'Data', 'Status', 'Cartão', 'Categoria', 'Visibilidade'];
    const data = rows.map(r => [r[0], r[1], parseFloat(r[2]), r[3], r[4], r[5], r[6], r[7]]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];

    const summaryStart = data.length + 3;
    XLSX.utils.sheet_add_aoa(ws, [
      [`Resumo — ${visibilityLabels[selectedVisibility]}`],
      ['Total Entradas', report.totalIncome],
      ['Total Despesas', report.totalExpense],
      ['Total Cartões', report.totalCards],
      ['Total Diárias', report.totalDailies],
      ['Total Transferências', report.totalTransfers],
      ['Contas Fixas', report.totalBills],
      ['Saldo', report.balance],
    ], { origin: `A${summaryStart}` });

    let nextRow = summaryStart + 10;

    if (Object.keys(report.expenseByCategory).length > 0) {
      XLSX.utils.sheet_add_aoa(ws, [['Despesas por Categoria']], { origin: `A${nextRow}` });
      nextRow++;
      Object.entries(report.expenseByCategory).sort(([, a], [, b]) => b - a).forEach(([cat, amount]) => {
        XLSX.utils.sheet_add_aoa(ws, [[cat, amount]], { origin: `A${nextRow}` });
        nextRow++;
      });
      nextRow += 2;
    }

    if (Object.keys(report.cardBreakdown).length > 0) {
      XLSX.utils.sheet_add_aoa(ws, [['Detalhamento por Cartão']], { origin: `A${nextRow}` });
      nextRow++;
      Object.values(report.cardBreakdown).forEach(card => {
        XLSX.utils.sheet_add_aoa(ws, [[card.name, card.total]], { origin: `A${nextRow}` });
        nextRow++;
        card.purchases.forEach(p => {
          XLSX.utils.sheet_add_aoa(ws, [['', p.description, Number(p.amount), p.date, `${p.total_installments}x`]], { origin: `A${nextRow}` });
          nextRow++;
        });
        nextRow++;
      });
    }

    if (selectedVisibility === 'all' && Object.keys(report.byVisibility).length > 0) {
      nextRow += 2;
      XLSX.utils.sheet_add_aoa(ws, [['Resumo por Pessoa']], { origin: `A${nextRow}` });
      nextRow++;
      XLSX.utils.sheet_add_aoa(ws, [['Pessoa', 'Entradas', 'Despesas', 'Cartões', 'Saldo']], { origin: `A${nextRow}` });
      nextRow++;
      Object.entries(report.byVisibility).forEach(([v, data]) => {
        XLSX.utils.sheet_add_aoa(ws, [[visibilityLabels[v] || v, data.income, data.expense, data.cards, data.income - data.expense - data.cards]], { origin: `A${nextRow}` });
        nextRow++;
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${getMonthName(selectedMonth)} ${selectedYear}`);
    XLSX.writeFile(wb, `relatorio-${monthStr}${selectedVisibility !== 'all' ? `-${selectedVisibility}` : ''}.xlsx`);
  }

  function exportPDF() {
    const rows = getExportRows();
    const doc = new jsPDF();
    const visLabel = visibilityLabels[selectedVisibility];
    const title = `Relatório — ${getMonthName(selectedMonth)} ${selectedYear} — ${visLabel}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Saldo: R$ ${report.balance.toFixed(2)}`, 14, 28);
    doc.text(`Entradas: R$ ${report.totalIncome.toFixed(2)}  |  Despesas: R$ ${report.totalExpense.toFixed(2)}  |  Cartões: R$ ${report.totalCards.toFixed(2)}  |  Diárias: R$ ${report.totalDailies.toFixed(2)}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Tipo', 'Descrição', 'Valor', 'Data', 'Status', 'Cartão', 'Categoria']],
      body: rows.map(r => [r[0], r[1], `R$ ${r[2]}`, r[3], r[4], r[5], r[6]]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [10, 110, 250] },
      columnStyles: { 2: { halign: 'right' } },
    });

    // Despesas por categoria
    const expCatEntries = Object.entries(report.expenseByCategory).sort(([, a], [, b]) => b - a);
    if (expCatEntries.length > 0) {
      let y = (doc as any).lastAutoTable?.finalY || 60;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text('Despesas por Categoria', 14, y + 10);
      autoTable(doc, {
        startY: y + 14,
        head: [['Categoria', 'Valor (R$)', '% do Total']],
        body: expCatEntries.map(([cat, amount]) => [cat, `R$ ${amount.toFixed(2)}`, report.totalExpense > 0 ? `${((amount / report.totalExpense) * 100).toFixed(1)}%` : '0%']),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    // Compras por cartão
    const cardEntries = Object.values(report.cardBreakdown);
    if (cardEntries.length > 0) {
      let y = (doc as any).lastAutoTable?.finalY || 60;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text('Compras por Cartão', 14, y + 10);

      cardEntries.forEach((card) => {
        let startY = (doc as any).lastAutoTable?.finalY || y + 14;
        if (startY > 260) { doc.addPage(); startY = 20; }
        doc.setFontSize(10);
        doc.text(`${card.name} — Total: R$ ${card.total.toFixed(2)}`, 14, startY + 8);
        autoTable(doc, {
          startY: startY + 12,
          head: [['Compra', 'Valor', 'Data', 'Parcelas']],
          body: card.purchases.map(p => [p.description, `R$ ${Number(p.amount).toFixed(2)}`, p.date, `${p.total_installments}x`]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [139, 92, 246] },
        });
      });
    }

    // Resumo por pessoa (só no modo geral)
    if (selectedVisibility === 'all' && Object.keys(report.byVisibility).length > 0) {
      let y = (doc as any).lastAutoTable?.finalY || 60;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text('Resumo por Pessoa', 14, y + 10);
      autoTable(doc, {
        startY: y + 14,
        head: [['Pessoa', 'Entradas', 'Despesas', 'Cartões', 'Saldo']],
        body: Object.entries(report.byVisibility).map(([v, d]) => [
          visibilityLabels[v] || v,
          `R$ ${d.income.toFixed(2)}`,
          `R$ ${d.expense.toFixed(2)}`,
          `R$ ${d.cards.toFixed(2)}`,
          `R$ ${(d.income - d.expense - d.cards).toFixed(2)}`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    doc.save(`relatorio-${monthStr}${selectedVisibility !== 'all' ? `-${selectedVisibility}` : ''}.pdf`);
  }

  function renderCategoryBar(entries: [string, number][], total: number, color: string) {
    return entries.sort(([, a], [, b]) => b - a).map(([cat, amount]) => {
      const pct = total > 0 ? (amount / total) * 100 : 0;
      return (
        <div key={cat}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">{cat}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(amount)} <span className="text-xs text-gray-400">({pct.toFixed(0)}%)</span></span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    });
  }

  function replaceMonth(dateStr: string, newMonth: number, newYear: number): string {
    const d = new Date(dateStr);
    d.setFullYear(newYear, newMonth, Math.min(d.getDate(), new Date(newYear, newMonth + 1, 0).getDate()));
    return d.toISOString().slice(0, 10);
  }

  async function handleDuplicate() {
    if (!coupleId) return;
    setDuplicating(true);
    try {
      for (const inc of report.monthIncomes) {
        await incomeService.create({
          couple_id: coupleId,
          profile_id: inc.profile_id,
          description: inc.description,
          amount: inc.amount,
          date: replaceMonth(inc.date, targetMonth, targetYear),
          type: inc.type,
          category_id: inc.category_id,
          visibility: inc.visibility,
          status: 'pending',
          account_id: inc.account_id,
        });
      }
      for (const exp of report.monthExpenses) {
        await expenseService.create({
          couple_id: coupleId,
          profile_id: exp.profile_id,
          description: exp.description,
          amount: exp.amount,
          date: replaceMonth(exp.date, targetMonth, targetYear),
          category_id: exp.category_id,
          visibility: exp.visibility,
          status: 'pending',
          payment_method: exp.payment_method,
        });
      }
      for (const ct of report.monthCards) {
        await cardTransactionService.create({
          couple_id: coupleId,
          profile_id: ct.profile_id,
          card_id: ct.card_id,
          description: ct.description,
          amount: ct.amount,
          date: replaceMonth(ct.date, targetMonth, targetYear),
          category_id: ct.category_id,
          visibility: ct.visibility,
          total_installments: ct.total_installments,
        });
      }
      for (const d of report.monthDailies) {
        await dailyIncomeService.create({
          couple_id: coupleId,
          profile_id: d.profile_id,
          description: d.description,
          quantity: d.quantity,
          rate: d.rate,
          total: d.total,
          date: replaceMonth(d.date, targetMonth, targetYear),
          status: 'pending',
        });
      }
      await Promise.all([r1(), r2(), r3(), r6()]);
      setShowDuplicate(false);
      alert(`Dados de ${getMonthName(selectedMonth)} duplicados para ${getMonthName(targetMonth)}/${targetYear}!`);
    } catch (err) {
      alert('Erro ao duplicar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setShowDuplicate(true)}>
            <Copy size={14} /> Duplicar
          </Button>
          <Button size="sm" variant="secondary" onClick={exportExcel}>
            <FileSpreadsheet size={14} /> Excel
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPDF}>
            <FileText size={14} /> PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCSV}>
            <Download size={14} /> CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-3 gap-3">
        <Select label="Mês" options={monthOptions} value={String(selectedMonth)} onChange={e => setSelectedMonth(parseInt(e.target.value))} />
        <Select label="Ano" options={yearOptions} value={String(selectedYear)} onChange={e => setSelectedYear(parseInt(e.target.value))} />
        <Select label="Pessoa" options={visibilityOptions} value={selectedVisibility} onChange={e => setSelectedVisibility(e.target.value)} />
      </div>

      {selectedVisibility !== 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
          <Filter size={14} />
          Filtrando por: <strong>{visibilityLabels[selectedVisibility]}</strong>
        </div>
      )}

      {/* Saldo geral */}
      <Card className={`${report.balance >= 0 ? 'bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-rose-700'} border-0`}>
        <div className="text-white">
          <p className="text-sm opacity-80">{getMonthName(selectedMonth)} {selectedYear} — {visibilityLabels[selectedVisibility]}</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(report.balance)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/20">
            <div>
              <p className="text-xs opacity-60">Entradas</p>
              <p className="text-sm font-semibold">{formatCurrency(report.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">Despesas</p>
              <p className="text-sm font-semibold">{formatCurrency(report.totalExpense)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">Cartões</p>
              <p className="text-sm font-semibold">{formatCurrency(report.totalCards)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">Diárias</p>
              <p className="text-sm font-semibold">{formatCurrency(report.totalDailies)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumo por pessoa (só no modo geral) */}
      {selectedVisibility === 'all' && Object.keys(report.byVisibility).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Resumo por Pessoa</h3>
            <div className="space-y-3">
              {Object.entries(report.byVisibility).map(([v, d]) => {
                const saldo = d.income - d.expense - d.cards;
                return (
                  <div key={v} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{visibilityLabels[v] || v}</p>
                      <p className="text-xs text-gray-400">E: {formatCurrency(d.income)} | D: {formatCurrency(d.expense)} | C: {formatCurrency(d.cards)}</p>
                    </div>
                    <span className={`text-sm font-bold ${saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(saldo)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Entradas e Despesas resumo */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Entradas</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(report.totalIncome)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Recebido</span><span className="text-green-600 dark:text-green-400">{formatCurrency(report.paidIncome)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Pendente</span><span className="text-amber-600 dark:text-amber-400">{formatCurrency(report.pendingIncome)}</span></div>
              <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-700"><span className="text-gray-400 text-xs">Lançamentos</span><span className="text-xs text-gray-400">{report.incomeCount}</span></div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Despesas</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(report.totalExpense)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Pago</span><span className="text-green-600 dark:text-green-400">{formatCurrency(report.paidExpense)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Pendente</span><span className="text-amber-600 dark:text-amber-400">{formatCurrency(report.pendingExpense)}</span></div>
              <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-700"><span className="text-gray-400 text-xs">Lançamentos</span><span className="text-xs text-gray-400">{report.expenseCount}</span></div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Despesas por Categoria */}
      {Object.keys(report.expenseByCategory).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Despesas por Categoria</h3>
            <div className="space-y-2">
              {renderCategoryBar(Object.entries(report.expenseByCategory), report.totalExpense, 'bg-red-500')}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Entradas por Categoria */}
      {Object.keys(report.incomeByCategory).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Entradas por Categoria</h3>
            <div className="space-y-2">
              {renderCategoryBar(Object.entries(report.incomeByCategory), report.totalIncome, 'bg-green-500')}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Entradas por tipo */}
      {Object.keys(report.incomeByType).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Entradas por Tipo</h3>
            <div className="space-y-2">
              {Object.entries(report.incomeByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => {
                  const pct = report.totalIncome > 0 ? (amount / report.totalIncome) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{typeLabels[type] || type}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Diárias e Transferências */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Diárias</h3>
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-medium text-cyan-700 dark:text-cyan-300">{formatCurrency(report.totalDailies)}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-400 text-xs">Registros</span><span className="text-xs text-gray-400">{report.dailyCount}</span></div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transferências</h3>
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-medium text-blue-700 dark:text-blue-300">{formatCurrency(report.totalTransfers)}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-400 text-xs">Movimentações</span><span className="text-xs text-gray-400">{report.transferCount}</span></div>
          </Card>
        </motion.div>
      </div>

      {/* Contas Fixas detalhadas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-orange-600 dark:text-orange-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas Fixas</h3>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total mensal fixo</span>
            <span className="font-medium text-orange-700 dark:text-orange-300">{formatCurrency(report.totalBills)}</span>
          </div>
          {report.activeBills.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
              {report.activeBills.map(b => (
                <div key={b.id} className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{b.description} (dia {b.due_day})</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{formatCurrency(Number(b.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Compras por Cartão detalhadas */}
      {Object.keys(report.cardBreakdown).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compras por Cartão</h3>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500 dark:text-gray-400">Total geral</span>
              <span className="font-medium text-purple-700 dark:text-purple-300">{formatCurrency(report.totalCards)}</span>
            </div>

            {/* Cartões por categoria */}
            {Object.keys(report.cardByCategory).length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Por categoria</p>
                <div className="space-y-2">
                  {renderCategoryBar(Object.entries(report.cardByCategory), report.totalCards, 'bg-purple-500')}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {Object.values(report.cardBreakdown)
                .sort((a, b) => b.total - a.total)
                .map(card => (
                <div key={card.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{card.name}</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(card.total)}</span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-purple-200 dark:border-purple-800">
                    {card.purchases.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-600 dark:text-gray-400">{p.description}</span>
                          <span className="text-gray-400 ml-1">({formatDate(p.date)}{p.total_installments > 1 ? ` • ${p.total_installments}x` : ''} • {getCategoryName(p.category_id)})</span>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium ml-2 whitespace-nowrap">{formatCurrency(Number(p.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Despesas detalhadas */}
      {report.monthExpenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Despesas detalhadas</h3>
            <div className="space-y-1.5">
              {report.monthExpenses.sort((a, b) => Number(b.amount) - Number(a.amount)).map(e => (
                <div key={e.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200 truncate">{e.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(e.date)} • {statusLabels[e.status] || e.status} • {getCategoryName(e.category_id)} • {visibilityLabels[e.visibility] || e.visibility}</p>
                  </div>
                  <span className="text-red-600 dark:text-red-400 font-semibold ml-2 whitespace-nowrap">{formatCurrency(Number(e.amount))}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Diárias detalhadas */}
      {report.monthDailies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Diárias detalhadas</h3>
            <div className="space-y-1.5">
              {report.monthDailies.map(d => (
                <div key={d.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200">{d.quantity}x {formatCurrency(Number(d.rate))}{d.description ? ` — ${d.description}` : ''}</p>
                    <p className="text-xs text-gray-400">{formatDate(d.date)} • {statusLabels[d.status] || d.status}</p>
                  </div>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold ml-2 whitespace-nowrap">{formatCurrency(Number(d.total))}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Transferências detalhadas */}
      {report.monthTransfers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Transferências do mês</h3>
            <div className="space-y-1.5">
              {report.monthTransfers.map(t => (
                <div key={t.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200">{getAccountName(t.from_account_id)} → {getAccountName(t.to_account_id)}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}{t.notes ? ` • ${t.notes}` : ''}</p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2 whitespace-nowrap">{formatCurrency(Number(t.amount))}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Modal Duplicar Mês */}
      <Modal open={showDuplicate} onClose={() => setShowDuplicate(false)} title="Duplicar Mês">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Copiar todos os lançamentos de <strong>{getMonthName(selectedMonth)}/{selectedYear}</strong> para outro mês.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Mês destino"
              options={monthOptions}
              value={String(targetMonth)}
              onChange={e => setTargetMonth(parseInt(e.target.value))}
            />
            <Select
              label="Ano destino"
              options={yearOptions}
              value={String(targetYear)}
              onChange={e => setTargetYear(parseInt(e.target.value))}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
            <p>Serão duplicados:</p>
            <p>• {report.incomeCount} entrada(s)</p>
            <p>• {report.expenseCount} despesa(s)</p>
            <p>• {report.cardCount} compra(s) de cartão</p>
            <p>• {report.dailyCount} diária(s)</p>
            <p className="mt-2 text-amber-600 dark:text-amber-400">Status será definido como "Pendente"</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowDuplicate(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDuplicate} loading={duplicating} className="flex-1">
              <Copy size={14} /> Duplicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
