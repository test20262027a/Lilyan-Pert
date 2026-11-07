import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { EmptyState } from './components/ui';
import { useI18n } from './i18n';
import Layout from './components/Layout';
import PageBoundary from './components/PageBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import Orders from './pages/Orders';
import Tables from './pages/Tables';
import Reviews from './pages/Reviews';
import Discounts from './pages/Discounts';
import Advertisements from './pages/Advertisements';
import Statistics from './pages/Statistics';
import ActivityReports from './pages/ActivityReports';
import Backups from './pages/Backups';
import ResetSampleData from './pages/ResetSampleData';
import Users from './pages/Users';
import Settings from './pages/Settings';
import TextEditor from './pages/TextEditor';
import CustomerMenu from './pages/CustomerMenu';
import TableMenu from './pages/TableMenu';
import AdminOrderMenu from './pages/AdminOrderMenu';

function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  /* The shell's ONE loader is mounted at the app root and driven by the global
     loading signal, so a gate renders nothing at all rather than a second,
     differently-sized copy of it. */
  if (loading) return null;
  // The whole target travels with the redirect, so a notification that was
  // tapped after the session expired still lands on its own order once the
  // administrator signs in again.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

/**
 * Route-level permission gate. Hiding a sidebar entry is not enough — a typed
 * URL lands here, and the same permission the API enforces is checked again.
 */
function RequirePermission({ perm, children }) {
  const { can, loading } = useAuth();
  const { t } = useI18n();
  /* The shell's ONE loader is mounted at the app root and driven by the global
     loading signal, so a gate renders nothing at all rather than a second,
     differently-sized copy of it. */
  if (loading) return null;
  if (!can(perm)) {
    return <EmptyState icon="lock" title={t('access_denied')} hint={t('access_denied_hint')} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Public customer menu — deliberately outside the authenticated shell.
          `/menu/<slug>` is the address to share; `/m/<slug>` is the same page and
          stays the alias already-printed QR codes and old links carry. */}
      {/* Each public screen carries the same page-level boundary as the admin
          shell, so a failure inside the menu can never take the whole document
          down to a blank page that only a reload recovers from. */}
      <Route path="/m/:key" element={<PageBoundary><CustomerMenu /></PageBoundary>} />
      <Route path="/menu/:key" element={<PageBoundary><CustomerMenu /></PageBoundary>} />
      {/* The short table QR address: the token resolves the business, then the
          menu opens with that table already identified. */}
      <Route path="/t/:token" element={<PageBoundary><TableMenu /></PageBoundary>} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>} />
        <Route path="/menu" element={<RequirePermission perm="menu.products.view"><MenuManagement /></RequirePermission>} />
        <Route path="/orders" element={<RequirePermission perm="orders.view"><Orders /></RequirePermission>} />
        {/* The standalone order page is gone: an old link lands on the list,
            where the order opens in the details modal. */}
        <Route path="/orders/:id" element={<Navigate to="/orders" replace />} />
        <Route path="/order-menu" element={<RequirePermission perm="orders.view"><AdminOrderMenu /></RequirePermission>} />
        <Route path="/tables" element={<RequirePermission perm="tables.view"><Tables /></RequirePermission>} />
        <Route path="/reviews" element={<RequirePermission perm="reviews.view"><Reviews /></RequirePermission>} />
        <Route path="/discounts" element={<RequirePermission perm="promotions.view"><Discounts /></RequirePermission>} />
        <Route path="/advertisements" element={<RequirePermission perm="ads.view"><Advertisements /></RequirePermission>} />
        {/* Advertisements and promotions used to share one page; the old address
            still works and lands on the advertisements module. */}
        <Route path="/marketing" element={<Navigate to="/advertisements" replace />} />
        <Route path="/statistics" element={<RequirePermission perm="statistics.view"><Statistics /></RequirePermission>} />
        <Route path="/activity" element={<RequirePermission perm="activity.view"><ActivityReports /></RequirePermission>} />
        <Route path="/backups" element={<RequirePermission perm="backup.full"><Backups /></RequirePermission>} />
        {/* Sample-data reset: its own page, guarded by the same elevated
            permission the reset API enforces. */}
        <Route path="/reset-sample" element={<RequirePermission perm="reset_sample.full"><ResetSampleData /></RequirePermission>} />
        <Route path="/users" element={<RequirePermission perm="users.view"><Users /></RequirePermission>} />
        <Route path="/settings" element={<RequirePermission perm="settings.view"><Settings /></RequirePermission>} />
        {/* Menu settings live in the settings workspace; the text editor is
            its own page for the automatic receipt messages. */}
        <Route path="/menu-settings" element={<RequirePermission perm="menu_settings.view"><Settings initialTab="menu" /></RequirePermission>} />
        <Route path="/text-editor" element={<RequirePermission perm="text_editor.view"><TextEditor /></RequirePermission>} />
      </Route>
      {/* The admin panel's short hand-typed address. The dashboard itself stays
          on `/` — the address every existing link, bookmark and notification
          already points at — so this is an alias, not a second front door. */}
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
