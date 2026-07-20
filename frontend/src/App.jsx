import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext';
import ThemeProvider from './context/ThemeContext';
import ToastProvider from './context/ToastContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import RegisterSchool from './pages/RegisterSchool';
import DashboardLayout from './components/DashboardLayout';

// Principal Pages
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import Students from './pages/principal/Students';
import StudentDetails from './pages/principal/StudentDetails';
import Teachers from './pages/principal/Teachers';
import TeacherDetails from './pages/principal/TeacherDetails';
import AttendanceOverview from './pages/principal/AttendanceOverview';
import FeesOverview from './pages/principal/FeesOverview';
import Settings from './pages/principal/Settings';
import Courses from './pages/principal/Courses';
import CourseDetails from './pages/principal/CourseDetails';
import Timetable from './pages/principal/Timetable';
import PrincipalNotices from './pages/principal/Notices';
// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/Students';
import AdminTeachers from './pages/admin/Teachers';
import AdminStaff from './pages/admin/Staff';
import AdminAttendanceOverview from './pages/admin/AttendanceOverview';
import AdminFeesOverview from './pages/admin/FeesOverview';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminCourses from './pages/admin/Courses';
import AdminTimetable from './pages/admin/Timetable';
import AdminNotices from './pages/admin/Notices';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MyCourses from './pages/teacher/MyCourses';
import TakeAttendance from './pages/teacher/TakeAttendance';
import AttendanceHistory from './pages/teacher/AttendanceHistory';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherRoutine from './pages/teacher/TeacherRoutine';
import CourseFees from './pages/teacher/CourseFees';
import TeacherNotices from './pages/teacher/Notices';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ClassDetails from './pages/student/ClassDetails';
import MyAttendance from './pages/student/MyAttendance';
import MyFees from './pages/student/MyFees';
import Notices from './pages/student/Notices';
import AcademicReport from './pages/student/AcademicReport';
import StudentSettings from './pages/student/StudentSettings';

// Accountant Pages
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import AccountantNotices from './pages/accountant/Notices';
import AccountantClasses from './pages/accountant/AccountantClasses';
import AccountantStudents from './pages/accountant/AccountantStudents';
import AccountantFees from './pages/accountant/AccountantFees';
import AccountantFeeStructure from './pages/accountant/AccountantFeeStructure';

import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/ProtectedRoute';
// Redirects `/dashboard` general route to correct role-based landing subpage
function DashboardRedirect() {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'PRINCIPAL') {
    return <Navigate to="/principal/dashboard" replace />;
  } else if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else if (user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  } else if (user.role === 'ACCOUNTANT') {
    return <Navigate to="/accountant/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

// Redirects `/login` if already authenticated
function LoginRoute() {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<RegisterSchool />} />
          <Route path="/login" element={<LoginRoute />} />

          {/* Principal Workspace Routes */}
          <Route
            path="/principal"
            element={
              <ProtectedRoute allowedRoles={['PRINCIPAL']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<PrincipalDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="teachers/:id" element={<TeacherDetails />} />
            <Route path="attendance" element={<AttendanceOverview />} />
            <Route path="fees" element={<FeesOverview />} />
            <Route path="settings" element={<Settings />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id" element={<CourseDetails />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="notices" element={<PrincipalNotices />} />
          </Route>

          {/* Admin Workspace Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="attendance" element={<AdminAttendanceOverview />} />
            <Route path="fees" element={<AdminFeesOverview />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="notices" element={<AdminNotices />} />
          </Route>

          {/* Teacher Workspace Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="courses" element={<MyCourses />} />
            <Route path="take-attendance" element={<TakeAttendance />} />
            <Route path="history" element={<AttendanceHistory />} />
            <Route path="fees" element={<CourseFees />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="routine" element={<TeacherRoutine />} />
            <Route path="notices" element={<TeacherNotices />} />
          </Route>

          {/* Student Workspace Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="class-details" element={<ClassDetails />} />
            <Route path="attendance" element={<MyAttendance />} />
            <Route path="fees" element={<MyFees />} />
            <Route path="notices" element={<Notices />} />
            <Route path="academic-report" element={<AcademicReport />} />
            <Route path="settings" element={<StudentSettings />} />
          </Route>

          {/* Accountant Workspace Routes */}
          <Route
            path="/accountant"
            element={
              <ProtectedRoute allowedRoles={['ACCOUNTANT']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AccountantDashboard />} />
            <Route path="classes" element={<AccountantClasses />} />
            <Route path="students" element={<AccountantStudents />} />
            <Route path="fees" element={<AccountantFees />} />
            <Route path="fee-structure" element={<AccountantFeeStructure />} />
            <Route path="notices" element={<AccountantNotices />} />
          </Route>

          {/* Fallback routes */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
