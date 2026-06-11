import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ContractApproval from './pages/ContractApproval';
import Dashboard from './pages/Dashboard';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';
import Invitations from './pages/Invitations';
import JoinEvents from './pages/JoinEvent';
import AdminDashboard from './pages/AdminDashboard';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import Profile from './pages/Profile';

function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={isAdmin ? '/admin' : '/'} /> : <Login />}
        />
        <Route
          path="/admin/login"
          element={isAuthenticated ? <Navigate to={isAdmin ? '/admin' : '/'} /> : <Login />}
        />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/contract-approval"
          element={isAuthenticated ? <ContractApproval /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invitations"
          element={
            <ProtectedRoute>
              <Invitations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <ProtectedRoute>
              <EventForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <ProtectedRoute>
              <EventForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/events/join/:code" element={<JoinEvents />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ROLE_ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      <PwaInstallPrompt />
    </>
  );
}

export default App;
