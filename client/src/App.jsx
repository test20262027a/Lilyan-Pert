import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loading } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Tables from './pages/Tables';
import Reviews from './pages/Reviews';
import Marketing from './pages/Marketing';
import Backups from './pages/Backups';
import Users from './pages/Users';
import Settings from './pages/Settings';
import CustomerMenu from './pages/CustomerMenu';
import AdminOrderMenu from './pages/AdminOrderMenu';

function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Public customer menu — deliberately outside the authenticated shell. */}
      <Route path="/m/:key" element={<CustomerMenu />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/menu" element={<MenuManagement />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/order-menu" element={<AdminOrderMenu />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
