import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, CheckCircle, AlertTriangle, CreditCard, Target, Banknote, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../hooks/useData';
import { notificationService } from '../services/api';
import { Button, Card, CardSkeleton, EmptyState } from '../components/ui';
import type { Notification } from '../types';

const typeIcons: Record<string, typeof Bell> = {
  overdue: AlertTriangle,
  due_soon: Bell,
  invoice: CreditCard,
  installment: CreditCard,
  salary: Banknote,
  goal: Target,
  info: Info,
};

const typeColors: Record<string, string> = {
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  due_soon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  invoice: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  installment: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  salary: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  goal: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications, loading, refresh } = useData<Notification>(
    (coupleId) => notificationService.list(coupleId)
  );

  const unread = notifications.filter(n => !n.read);

  async function markAllRead() {
    for (const n of unread) {
      await notificationService.markRead(n.id);
    }
    refresh();
  }

  async function markRead(id: string) {
    await notificationService.markRead(id);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notificações</h1>
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>
            <CheckCircle size={14} /> Marcar todas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff size={40} />}
          title="Sem notificações"
          description="Você será notificado sobre vencimentos, faturas e metas."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = typeIcons[notif.type] || Info;
            const colorClass = typeColors[notif.type] || typeColors.info;

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => !notif.read && markRead(notif.id)}
                  className="w-full text-left"
                >
                  <Card className={!notif.read ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {notif.title}
                          </p>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(notif.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.body}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                      )}
                    </div>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
