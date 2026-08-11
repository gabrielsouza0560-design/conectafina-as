import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { CouplePage } from './pages/CouplePage';
import { MorePage } from './pages/MorePage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BillsPage } from './pages/BillsPage';
import { NewIncomePage } from './pages/NewIncomePage';
import { NewExpensePage } from './pages/NewExpensePage';
import { NewCardPurchasePage } from './pages/NewCardPurchasePage';
import { NewTransferPage } from './pages/NewTransferPage';
import { NewDailyPage } from './pages/NewDailyPage';
import { CardsPage } from './pages/CardsPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransfersPage } from './pages/TransfersPage';
import { DailyIncomePage } from './pages/DailyIncomePage';
import { GoalsPage } from './pages/GoalsPage';
import { StatsPage } from './pages/StatsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SearchPage } from './pages/SearchPage';
import { ReportsPage } from './pages/ReportsPage';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/couple" element={<CouplePage />} />
        <Route path="/more" element={<MorePage />} />

        <Route path="/income" element={<IncomePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/daily" element={<DailyIncomePage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/new/income" element={<NewIncomePage />} />
        <Route path="/new/expense" element={<NewExpensePage />} />
        <Route path="/new/card-purchase" element={<NewCardPurchasePage />} />
        <Route path="/new/bill" element={<BillsPage />} />
        <Route path="/new/daily" element={<NewDailyPage />} />
        <Route path="/new/transfer" element={<NewTransferPage />} />

        <Route path="/edit/income/:id" element={<NewIncomePage />} />
        <Route path="/edit/expense/:id" element={<NewExpensePage />} />
        <Route path="/edit/daily/:id" element={<NewDailyPage />} />
        <Route path="/edit/transfer/:id" element={<NewTransferPage />} />
        <Route path="/edit/card-purchase/:id" element={<NewCardPurchasePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
