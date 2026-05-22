import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import Availability from './pages/Availability';
import BookingPage from './pages/BookingPage';
import PublicPage from './pages/PublicPage';
import './index.css';

function AdminLayout({ children }) {
  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: 'white' },
          },
        }}
      />
      <Routes>
        {/* Admin routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <AdminLayout><Dashboard /></AdminLayout>
        } />
        <Route path="/meetings" element={
          <AdminLayout><Meetings /></AdminLayout>
        } />
        <Route path="/availability" element={
          <AdminLayout><Availability /></AdminLayout>
        } />

        {/* Public routes */}
        <Route path="/john" element={<PublicPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
