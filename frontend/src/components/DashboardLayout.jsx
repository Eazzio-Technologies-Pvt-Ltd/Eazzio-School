import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import logo from '../assets/logo.png';

export default function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Responsive States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuConfig = {
    PRINCIPAL: [
      { path: '/principal/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/principal/classes', label: 'Classes', icon: '🏫' },
      { path: '/principal/students', label: 'Students', icon: '🎒' },
      { path: '/principal/teachers', label: 'Teachers', icon: '👩‍🏫' },
      { path: '/principal/attendance', label: 'Attendance', icon: '📅' },
      { path: '/principal/fees', label: 'Fees Overview', icon: '💳' },
      { path: '/principal/notices', label: 'Notices Board', icon: '📢' },
      { path: '/principal/timetable', label: 'Timetables', icon: '📆' },
      { path: '/principal/reports', label: 'Reports', icon: '📄' },
      { path: '/principal/settings', label: 'Settings', icon: '⚙️' },
    ],
    TEACHER: [
      { path: '/teacher/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/teacher/classes', label: 'My Classes', icon: '🏫' },
      { path: '/teacher/take-attendance', label: 'Take Attendance', icon: '📝' },
      { path: '/teacher/history', label: 'Roster History', icon: '🕒' },
      { path: '/teacher/fees', label: 'Class Fees', icon: '💳' },
      { path: '/teacher/notices', label: 'Notices Board', icon: '📢' },
      { path: '/teacher/routine', label: 'My Routine', icon: '📆' },
      { path: '/teacher/profile', label: 'My Profile', icon: '👤' },
    ],
    STUDENT: [
      { path: '/student/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/student/attendance', label: 'My Attendance', icon: '📅' },
      { path: '/student/fees', label: 'My Fees', icon: '💳' },
      { path: '/student/notices', label: 'Notices Board', icon: '📢' },
      { path: '/student/profile', label: 'My Profile', icon: '👤' },
    ],
  };

  const menuItems = menuConfig[user.role] || [];

  // Sidebar styles merged based on layout width
  const sidebarStyles = {
    ...styles.sidebar,
    ...(isMobile
      ? {
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: mobileOpen ? 0 : '-260px',
          width: '260px',
          height: '100vh',
          zIndex: 1000,
        }
      : {
          width: sidebarOpen ? '260px' : '72px',
        }),
  };

  return (
    <div style={styles.container}>
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobile && mobileOpen && (
        <div style={styles.backdrop} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <aside style={sidebarStyles}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="Eazzio Logo" style={{ width: '140px', height: 'auto', objectFit: 'contain' }} />
          </div>
          {!isMobile && (
            <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          )}
        </div>

        <nav style={styles.navMenu}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) setMobileOpen(false);
                }}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                  justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
                }}
                title={item.label}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {(isMobile || sidebarOpen) && <span style={styles.navLabel}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button
            id="btn-logout"
            onClick={handleLogout}
            style={{
              ...styles.logoutBtn,
              justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
            }}
          >
            <span style={styles.navIcon}>🚪</span>
            {(isMobile || sidebarOpen) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div style={styles.mainWrapper}>
        <header style={styles.navbar}>
          <div style={styles.navbarLeft}>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={styles.hamburgerBtn}
              >
                ☰
              </button>
            )}
            <h2 style={styles.workspaceTitle}>{user.role} Workspace</h2>
          </div>
          <div style={styles.navbarRight}>
            <div style={styles.profileBadge}>
              <div style={styles.avatar}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              {!isMobile && (
                <div style={styles.profileText}>
                  <span style={styles.userName}>{user.name}</span>
                  <span style={styles.userEmail}>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View outlet embedding pages */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-main)',
    overflowX: 'hidden',
  },
  sidebar: {
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 90,
  },
  sidebarHeader: {
    padding: '24px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.02em',
  },
  toggleBtn: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '4px',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '20px 12px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
  },
  navLinkActive: {
    background: 'rgba(139, 92, 246, 0.12)',
    color: 'var(--text-primary)',
    borderLeft: '3px solid var(--primary)',
    boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
  },
  navIcon: {
    fontSize: '1.2rem',
  },
  navLabel: {
    whiteSpace: 'nowrap',
  },
  sidebarFooter: {
    padding: '20px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#f87171',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  mainWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
  },
  navbar: {
    background: 'var(--navbar-bg)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--glass-border)',
    padding: '16px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  hamburgerBtn: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '4px',
  },
  workspaceTitle: {
    textTransform: 'capitalize',
    fontSize: '1.2rem',
    fontWeight: '700',
  },
  navbarRight: {
    display: 'flex',
    alignItems: 'center',
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    padding: '6px 14px',
    borderRadius: '24px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '700',
    color: '#fff',
    fontSize: '0.9rem',
    boxShadow: '0 0 10px var(--primary-glow)',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  themeToggleBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    padding: '8px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    marginRight: '14px',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
  },
  userEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 30px',
    width: '100%',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(5, 6, 12, 0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 990,
  },
};
