import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { BankAccount } from '../../types';

interface MarkPaidModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (accountId?: string, paymentMethod?: string) => void;
  accounts: BankAccount[];
  title?: string;
}

const paymentMethods = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];

export function MarkPaidModal({ open, onClose, onConfirm, accounts, title }: MarkPaidModalProps) {
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(accountId || undefined, paymentMethod);
    setLoading(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title || 'Dar Baixa'} size="sm">
      <div className="space-y-4">
        <Select
          label="Forma de pagamento"
          options={paymentMethods}
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        />
        {accounts.length > 0 && (
          <Select
            label="Conta utilizada"
            placeholder="Selecione (opcional)"
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
          />
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleConfirm} loading={loading} className="flex-1">
            Confirmar Baixa
          </Button>
        </div>
      </div>
    </Modal>
  );
}
