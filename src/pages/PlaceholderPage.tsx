import { ArrowLeft, Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';

export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      </div>
      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <Construction size={28} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Em construção</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Esta funcionalidade será implementada nas próximas fases.
          </p>
        </div>
      </Card>
    </div>
  );
}
