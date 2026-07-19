import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import logo from '../assets/logo.png';
import {
  LayoutDashboard, GraduationCap, Users, UsersRound, Calendar,
  CreditCard, Megaphone, Clock, FileText, Settings,
  LogOut, Menu, ChevronLeft, ChevronRight, Briefcase
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Responsive States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({
    feeStructure: true
  });

  const toggleSubmenu = (key) => {
    setOpenSubmenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      { path: '/principal/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/principal/courses', label: 'Courses', icon: <GraduationCap size={20} /> },
      { path: '/principal/students', label: 'Students', icon: <Users size={20} /> },
      { path: '/principal/teachers', label: 'Teachers', icon: <UsersRound size={20} /> },
      { path: '/principal/attendance', label: 'Attendance', icon: <Calendar size={20} /> },
      { path: '/principal/fees', label: 'Fees Overview', icon: <CreditCard size={20} /> },
      { path: '/principal/notices', label: 'Notice Board', icon: <Megaphone size={20} /> },
      { path: '/principal/timetable', label: 'Timetables', icon: <Clock size={20} /> },
      { path: '/principal/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
    ADMIN: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/admin/courses', label: 'Courses', icon: <GraduationCap size={20} /> },
      { path: '/admin/students', label: 'Students', icon: <Users size={20} /> },
      { path: '/admin/teachers', label: 'Teachers', icon: <UsersRound size={20} /> },
      { path: '/admin/staff', label: 'Management Staff', icon: <Briefcase size={20} /> },
      { path: '/admin/attendance', label: 'Attendance', icon: <Calendar size={20} /> },
      { path: '/admin/fees', label: 'Fees Overview', icon: <CreditCard size={20} /> },
      { path: '/admin/notices', label: 'Notice Board', icon: <Megaphone size={20} /> },
      { path: '/admin/timetable', label: 'Timetables', icon: <Clock size={20} /> },
      { path: '/admin/reports', label: 'Reports', icon: <FileText size={20} /> },
      { path: '/admin/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
    TEACHER: [
      { path: '/teacher/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/teacher/courses', label: 'My Courses', icon: <GraduationCap size={20} /> },
      { path: '/teacher/take-attendance', label: 'Take Attendance', icon: <Calendar size={20} /> },
      { path: '/teacher/history', label: 'Roster History', icon: <Clock size={20} /> },
      { path: '/teacher/fees', label: 'Course Fees', icon: <CreditCard size={20} /> },
      { path: '/teacher/notices', label: 'Notice Board', icon: <Megaphone size={20} /> },
      { path: '/teacher/routine', label: 'My Routine', icon: <Clock size={20} /> },
      { path: '/teacher/profile', label: 'My Profile', icon: <Users size={20} /> },
    ],
    STUDENT: [
      { path: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/student/class-details', label: 'Class Details', icon: <Users size={20} /> },
      { path: '/student/fees', label: 'Fees', icon: <CreditCard size={20} /> },
      { path: '/student/attendance', label: 'Attendance', icon: <Calendar size={20} /> },
      { path: '/student/notices', label: 'Notice Board', icon: <Megaphone size={20} /> },
      { path: '/student/academic-report', label: 'Academic Report', icon: <FileText size={20} /> },
      { path: '/student/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
    ACCOUNTANT: [
      { path: '/accountant/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/accountant/classes', label: 'Courses', icon: '🏫' },
      { path: '/accountant/students', label: 'Students', icon: '🎒' },
      { path: '/accountant/fees', label: 'Fees Overview', icon: '💳' },
      {
        key: 'feeStructure',
        label: 'Fee Structure',
        icon: '📋',
        children: [
          { path: '/accountant/fee-structure?plan=add', label: 'Add Fee Plan' },
          { path: '/accountant/fee-structure?plan=monthly', label: 'Monthly' },
          { path: '/accountant/fee-structure?plan=quarterly', label: 'Quarterly' },
          { path: '/accountant/fee-structure?plan=half-yearly', label: 'Half-Yearly' },
          { path: '/accountant/fee-structure?plan=yearly', label: 'Yearly' },
        ]
      }
    ],
  };

  const menuItems = menuConfig[user.role] || [];
  
  const sidebarWidthClass = sidebarOpen ? 'w-64' : 'w-20';
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-emerald-800 text-emerald-50 transition-all duration-300 ease-in-out shadow-xl
          ${isMobile ? (mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : `translate-x-0 ${sidebarWidthClass}`}
        `}
      >
        <div className="h-20 flex items-center justify-between px-4 border-b border-emerald-700/50 shrink-0">
          <div className={`flex items-center w-full ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}>
            {(sidebarOpen || isMobile) ? (
              <div className="flex items-center w-full px-1">
                <img src={logo} alt="Eazzio Logo" className="h-16 w-full max-w-[200px] object-contain object-left scale-110 origin-left" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <img 
                  src="/favicon.png" 
                  alt="E" 
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <span style={{ display: 'none' }} className="font-bold text-2xl tracking-tighter">E</span>
              </div>
            )}
          </div>
          
          {!isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-700/50 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar-emerald">
          {menuItems.map((item) => {
            const hasChildren = !!item.children;
            const isSubmenuOpen = openSubmenus[item.key] !== false;
            const isActive = item.path ? location.pathname.startsWith(item.path) : false;

            if (hasChildren) {
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      toggleSubmenu(item.key);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-emerald-100 hover:bg-emerald-700 hover:text-white`}
                    title={!sidebarOpen && !isMobile ? item.label : ''}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-emerald-200 shrink-0">{item.icon}</div>
                      {(sidebarOpen || isMobile) && <span className="truncate">{item.label}</span>}
                    </div>
                    {(sidebarOpen || isMobile) && (
                      <span className="text-xs transition-transform duration-200" style={{ transform: isSubmenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                    )}
                  </button>
                  {isSubmenuOpen && (sidebarOpen || isMobile) && (
                    <div className="flex flex-col pl-4 border-l border-emerald-700/60 ml-5 gap-1 mt-1 transition-all">
                      {item.children.map((child, index) => {
                        const isChildActive = (location.pathname + location.search) === child.path;
                        const isLast = index === item.children.length - 1;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => isMobile && setMobileOpen(false)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                              ${isChildActive
                                ? 'bg-emerald-50 text-emerald-800 shadow-sm font-semibold'
                                : 'text-emerald-200 hover:bg-emerald-700 hover:text-white'
                              }
                            `}
                          >
                            <span className="text-emerald-300/70 font-mono text-[10px] mr-1 shrink-0 select-none">
                              {isLast ? '└──' : '├──'}
                            </span>
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-800 shadow-sm' 
                    : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                  }
                  ${!sidebarOpen && !isMobile ? 'justify-center' : 'justify-start'}
                `}
                title={!sidebarOpen && !isMobile ? item.label : ''}
              >
                <div className={`${isActive ? 'text-emerald-600' : 'text-emerald-200'} shrink-0`}>
                  {item.icon}
                </div>
                {(sidebarOpen || isMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-700/50 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-emerald-200 hover:bg-emerald-700 hover:text-white transition-all duration-200
              ${!sidebarOpen && !isMobile ? 'justify-center' : 'justify-start'}
            `}
            title={!sidebarOpen && !isMobile ? 'Sign Out' : ''}
          >
            <LogOut size={20} className="shrink-0" />
            {(sidebarOpen || isMobile) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20')}
        `}
      >
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-800 capitalize tracking-tight hidden sm:block">
              {user.role.toLowerCase()} Workspace
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-full py-1.5 pr-4 pl-1.5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 font-medium leading-tight">{user.email}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
