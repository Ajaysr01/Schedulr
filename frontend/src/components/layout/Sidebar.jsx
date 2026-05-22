import { NavLink, useNavigate } from 'react-router-dom';
import { Clock, Menu, X, Plus, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import './Sidebar.css';

/* Calendly-style icons as inline SVGs for exact match */
function SchedulingIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function MeetingsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M7 14h2v2H7z" fill="currentColor" stroke="none" />
      <path d="M11 14h2v2h-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const navItems = [
  { to: '/dashboard', icon: SchedulingIcon, label: 'Scheduling' },
  { to: '/meetings', icon: MeetingsIcon, label: 'Meetings' },
  { to: '/availability', icon: Clock, label: 'Availability' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed);
    // Update CSS custom property on root so page-content can react
    document.documentElement.style.setProperty(
      '--sidebar-width', collapsed ? '80px' : '260px'
    );
  }, [collapsed]);

  function handleCreate() {
    navigate('/dashboard?create=true');
    setMobileOpen(false);
  }

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo + collapse toggle */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src="/logo.png" alt="Schedulr Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {!collapsed && <span className="logo-text">Schedulr</span>}

          {/* Collapse / Expand toggle (desktop only) */}
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>

          {/* Mobile close */}
          <button className="sidebar-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Create button */}
        <div className="sidebar-create">
          <button className="create-btn" onClick={handleCreate} title="Create">
            <Plus size={18} strokeWidth={2.2} />
            {!collapsed && <span>Create</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={collapsed ? 24 : 20} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
