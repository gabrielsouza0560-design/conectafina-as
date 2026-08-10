import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, CreditCard, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { incomeService, expenseService, cardTransactionService, fixedExpenseService } from '../services/api';
import { Button, Card, CardSkeleton, Select } from '../components/ui';
import { formatCurrency, getMonthName } from '../utils/format';
import type { Income, Expense, CardTransaction, FixedExpense } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: incomes, loading: l1 } = useData<Income>((c) => incomeService.list(c));
  const { data: expenses, loading: l2 } = useData<Expense>((c) => expenseService.list(c));
  const { data: cardTx, loading: l3 } = useData<CardTransaction>((c) => cardTransactionService.list(c));
  const { data: bills, loading: l4 } = useData<FixedExpense>((c) => fixedExpenseService.list(c));

  const loading = l1 || l2 || l3 || l4;
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const report = useMemo(() => {
    const monthIncomes = incomes.filter(i => i.date.startsWith(monthStr));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
    const monthCards = cardTx.filter(c => c.date.startsWith(monthStr));
    const activeBills = bills.filter(b => b.active);

    const totalIncome = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const paidIncome = monthIncomes.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const paidExpense = monthExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0);
    const totalCards = monthCards.reduce((s, c) => s + Number(c.amount), 0);
    const totalBills = activeBills.reduce((s, b) => s + Number(b.amount), 0);

    const incomeByType: Record<string, number> = {};
    monthIncomes.forEach(i => {
      incomeByType[i.type] = (incomeByType[i.type] || 0) + Number(i.amount);
    });

    return {
      totalIncome, paidIncome, pendingIncome: totalIncome - paidIncome,
      totalExpense, paidExpense, pendingExpense: totalExpense - paidExpense,
      totalCards, totalBills,
      balance: totalIncome - totalExpense - totalCards,
      incomeCount: monthIncomes.length,
      expenseCount: monthExpenses.length,
      cardCount: monthCards.length,
      incomeByType,
    };
  }, [incomes, expenses, cardTx, bills, monthStr]);

  const typeLabels: Record<string, string> = {
    salary: 'Salário', allowance: 'Vale', bonus: 'Bonificação',
    extra: 'Renda Extra', daily: 'Diária', other: 'Outros',
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
    const monthIncomes = incomes.filter(i => i.date.startsWith(monthStr));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
    const monthCards = cardTx.filter(c => c.date.startsWith(monthStr));
    const activeBills = bills.filter(b => b.active);

    const statusLabel: Record<string, string> = {
      paid: 'Pago', pending: 'Pendente', overdue: 'Vencido', scheduled: 'Agendado',
    };

    const rows: string[][] = [];
    monthIncomes.forEach(i => rows.push(['Entrada', i.description, Number(i.amount).toFixed(2), i.date, statusLabel[i.status] || i.status]));
    monthExpenses.forEach(e => rows.push(['Despesa', e.description, Number(e.amount).toFixed(2), e.date, statusLabel[e.status] || e.status]));
    monthCards.forEach(c => rows.push(['Cartão', c.description, Number(c.amount).toFixed(2), c.date, 'Pago']));
    activeBills.forEach(b => rows.push(['Conta Fixa', b.description, Number(b.amount).toFixed(2), `Dia ${b.due_day}`, 'Mensal']));
    return rows;
  }

  function exportCSV() {
    const rows = getExportRows();
    let csv = 'Tipo,Descrição,Valor,Data,Status\n';
    rows.forEach(r => { csv += `${r[0]},"${r[1]}",${r[2]},${r[3]},${r[4]}\n`; });

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${monthStr}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportExcel() {
    const rows = getExportRows();
    const header = ['Tipo', 'Descrição', 'Valor (R$)', 'Data', 'Status'];
    const data = rows.map(r => [r[0], r[1], parseFloat(r[2]), r[3], r[4]]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

    const summaryStart = data.length + 3;
    XLSX.utils.sheet_add_aoa(ws, [
      ['Resumo do Mês'],
      ['Total Entradas', report.totalIncome],
      ['Total Despesas', report.totalExpense],
      ['Total Cartões', report.totalCards],
      ['Contas Fixas', report.totalBills],
      ['Saldo', report.balance],
    ], { origin: `A${summaryStart}` });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${getMonthName(selectedMonth)} ${selectedYear}`);
    XLSX.writeFile(wb, `relatorio-${monthStr}.xlsx`);
  }

  function exportPDF() {
    const rows = getExportRows();
    const doc = new jsPDF();
    const title = `Relatório Financeiro — ${getMonthName(selectedMonth)} ${selectedYear}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Saldo: R$ ${report.balance.toFixed(2)}`, 14, 28);
    doc.text(`Entradas: R$ ${report.totalIncome.toFixed(2)}  |  Despesas: R$ ${report.totalExpense.toFixed(2)}  |  Cartões: R$ ${report.totalCards.toFixed(2)}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Tipo', 'Descrição', 'Valor (R$)', 'Data', 'Status']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [10, 110, 250] },
      columnStyles: { 2: { halign: 'right' } },
    });

    doc.save(`relatorio-${monthStr}.pdf`);
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

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Mês"
          options={monthOptions}
          value={String(selectedMonth)}
          onChange={e => setSelectedMonth(parseInt(e.target.value))}
        />
        <Select
          label="Ano"
          options={yearOptions}
          value={String(selectedYear)}
          onChange={e => setSelectedYear(parseInt(e.target.value))}
        />
      </div>

      <Card className={`${report.balance >= 0 ? 'bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-rose-700'} border-0`}>
        <div className="text-white">
          <p className="text-sm opacity-80">{getMonthName(selectedMonth)} {selectedYear} — Saldo</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(report.balance)}</p>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-white/20">
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
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Entradas</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(report.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Recebido</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(report.paidIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pendente</span>
                <span className="text-amber-600 dark:text-amber-400">{formatCurrency(report.pendingIncome)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-400 text-xs">Lançamentos</span>
                <span className="text-xs text-gray-400">{report.incomeCount}</span>
              </div>
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
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(report.totalExpense)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pago</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(report.paidExpense)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pendente</span>
                <span className="text-amber-600 dark:text-amber-400">{formatCurrency(report.pendingExpense)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-400 text-xs">Lançamentos</span>
                <span className="text-xs text-gray-400">{report.expenseCount}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cartões</h3>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total em compras</span>
            <span className="font-medium text-purple-700 dark:text-purple-300">{formatCurrency(report.totalCards)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500 dark:text-gray-400">Compras</span>
            <span className="text-gray-400">{report.cardCount}</span>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-orange-600 dark:text-orange-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contas Fixas</h3>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total mensal fixo</span>
            <span className="font-medium text-orange-700 dark:text-orange-300">{formatCurrency(report.totalBills)}</span>
          </div>
        </Card>
      </motion.div>

      {Object.keys(report.incomeByType).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Entradas por tipo</h3>
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
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
