import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/logo.png";
import schoolBg from "../assets/school_background.png";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  Award,
  MessageSquare,
  Bus,
  Shield,
  ArrowRight,
  Play,
  CheckCheck,
  Menu,
  X,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Mail,
  Phone,
  FileSpreadsheet,
  AlertCircle,
  MapPin,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useContext(AuthContext);

  const onLaunchApp = () => navigate('/dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("principal"); // principal, teacher, parent
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoData, setDemoData] = useState({
    schoolName: "",
    adminName: "",
    phone: "",
    email: "",
    studentCount: "100-500"
  });

  // Auth state for Hero Login/Register Widget
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState("Teacher"); // Administrator, Teacher, Parent
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
        setAuthSuccess(true);
        setTimeout(() => {
          setAuthSuccess(false);
          onLaunchApp();
        }, 1500);
      } else {
        // Since register logic is separate in RegisterSchool, we'll redirect them or show error
        // For simplicity, redirect to dedicated register page
        navigate("/register");
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoData({ schoolName: "", adminName: "", phone: "", email: "", studentCount: "100-500" });
    }, 5000);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  const [showPricingOnly, setShowPricingOnly] = useState(false);

  useEffect(() => {
    const checkPricingOnly = () => {
      const isPricingOnly = window.location.hash === "#pricing-only" || window.location.search.includes("view=pricing");
      setShowPricingOnly(isPricingOnly);
    };

    checkPricingOnly();
    window.addEventListener("hashchange", checkPricingOnly);
    return () => window.removeEventListener("hashchange", checkPricingOnly);
  }, []);

  if (showPricingOnly) {
    return (
      <div className="min-h-screen text-slate-800 bg-slate-50 font-sans selection:bg-indigo-600 selection:text-white p-6 md:p-12 flex items-center justify-center">
        <div className="w-full">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              One Flat Price for All Features
            </h2>
            <p className="text-slate-655 text-base md:text-lg">
              No hidden tiers, setup fees, or long-term contracts. Get complete access to the entire School OS suite.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col justify-between items-center text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-6 w-full">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">All-Inclusive Plan</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-4">Complete School ERP & LMS</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                  Includes Academic Management, Parent & Teacher Portals, GPS Tracking, Auto WhatsApp Alerts, Fees, and Exams.
                </p>
              </div>

              <div className="flex justify-center items-center gap-2 py-6 border-y border-slate-200/60 my-6">
                <span className="text-3xl text-slate-450 font-bold -mt-8">₹</span>
                <span className="text-8xl md:text-9xl font-black tracking-tight text-indigo-600">10</span>
                <div className="text-left ml-2">
                  <span className="text-slate-500 text-base font-bold block">per student</span>
                  <span className="text-slate-400 text-xs block">/ month</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Unlimited Teacher logins</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Parent Portal App</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Auto WhatsApp Alerts</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>GPS Bus Route Tracking</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Automated UPI Fees</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>24/7 Priority Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden relative">
      {/* Background School Image with gradient mask */}
      <div className="absolute top-0 left-0 w-full h-[950px] overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.52] filter saturate-[0.9] contrast-[1.15]"
          style={{ backgroundImage: `url(${schoolBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/5 via-slate-50/45 to-slate-50"></div>
      </div>

      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-[800px] left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[600px] right-10 w-[450px] h-[450px] bg-violet-600/3 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 px-6 py-2">
        <div className="w-full px-4 md:px-12 lg:px-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Eazzio Logo" className="h-14 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-650">
            <button onClick={() => scrollToSection("features")} className="hover:text-indigo-600 transition-colors">Key Modules</button>
            <button onClick={() => scrollToSection("dashboard-preview")} className="hover:text-indigo-600 transition-colors">Dashboard Demo</button>
            <a href="#pricing-only" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <button onClick={() => scrollToSection("demo-request")} className="hover:text-indigo-600 transition-colors">Book a Demo</button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            >
              Register School
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            >
              Sign In
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-slate-650 hover:text-indigo-600 transition-colors p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-slate-200 flex flex-col gap-4 text-slate-600 text-base pb-2"
            >
              <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-indigo-600 transition-colors">Key Modules</button>
              <button onClick={() => scrollToSection("dashboard-preview")} className="text-left py-2 hover:text-indigo-600 transition-colors">Dashboard Demo</button>
              <a href="#pricing-only" target="_blank" rel="noopener noreferrer" className="text-left py-2 hover:text-indigo-600 transition-colors">Pricing</a>
              <button onClick={() => scrollToSection("demo-request")} className="text-left py-2 hover:text-indigo-600 transition-colors font-semibold text-indigo-650">Book a Demo</button>
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-3 rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2"
              >
                Register School
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2"
              >
                Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="relative w-full px-6 md:px-12 lg:px-16 pt-8 pb-16 md:pt-12 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-900">
            The Complete Operating System for <span className="bg-gradient-to-r from-indigo-600 via-purple-650 to-blue-650 bg-clip-text text-transparent">Modern Schools</span>
          </h1>

          <p className="text-slate-650 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Empower teachers, delight parents, and simplify school administration. Manage admissions, automatic fee collections, academic timetables, attendance, and smart WhatsApp communications from a single intuitive portal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              onClick={() => scrollToSection("demo-request")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 flex items-center justify-center gap-2 group"
            >
              Book a Free Demo
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollToSection("dashboard-preview")}
              className="bg-white hover:bg-slate-100 text-slate-800 font-semibold text-base px-8 py-4 rounded-xl transition-all duration-200 border border-slate-200 shadow-sm active:scale-98 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-indigo-600 fill-indigo-600/25" />
              Explore Dashboard UI
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-8 border-t border-slate-200 max-w-lg mx-auto lg:mx-0 grid grid-cols-3 gap-6 text-center lg:text-left">
            <div>
              <div className="text-2xl font-bold text-indigo-600">40%</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Admin Time Saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-650">98%</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Fee Collection Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">Real-time</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">WhatsApp Alerts</div>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup - Dashboard Graphic */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-full filter blur-[80px] -z-10 w-80 h-80 mx-auto my-auto"></div>

          {/* Main Login / Register Widget */}
          <div className="w-full max-w-[470px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col p-8 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">auth.eazzio.local</span>
            </div>

            <AnimatePresence mode="wait">
              {authSuccess ? (
                <motion.div
                  key="auth-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-10 space-y-4 min-h-[380px]"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                    <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Authentication Successful
                  </h3>
                  <p className="text-sm text-slate-500 max-w-[280px]">
                    Welcome back! Redirecting you to the Eazzio Portal...
                  </p>
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </motion.div>
              ) : (
                <motion.div
                  key={authMode}
                  initial={{ opacity: 0, x: authMode === "login" ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: authMode === "login" ? 15 : -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col min-h-[380px] justify-between"
                >
                  {isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-xl">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-slate-900">Welcome back!</h3>
                        <p className="text-sm text-slate-500 mt-1">You are logged in as {user?.name}</p>
                      </div>
                      <button 
                        onClick={onLaunchApp}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        Enter Dashboard <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAuthSubmit} className="space-y-5">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          Welcome
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Access your school dashboard and modules.
                        </p>
                      </div>
  
                      {authError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {authError}
                        </div>
                      )}
  
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address / ID</label>
                        <input 
                          type="text" 
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="admin@school.edu or ID"
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                        />
                      </div>
  
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                          <button type="button" className="text-xs text-indigo-600 hover:underline font-semibold">Forgot password?</button>
                        </div>
                        <input 
                          type="password" 
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                        />
                      </div>
  
                      <button 
                        type="submit" 
                        disabled={authLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                      >
                        {authLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Sign In</span>
                        )}
                      </button>
                    </form>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Core Features/Modules Section */}
      <section id="features" className="py-24 bg-white border-y border-slate-200 relative z-10">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
              <Layers className="w-3.5 h-3.5" />
              <span>Full Suite ERP Solution</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              All-In-One Administrative & Learning Portal
            </h2>
            <p className="text-slate-600 text-base md:text-lg">
              Say goodbye to legacy software and scattered spreadsheets. Experience a central operating system configured specifically for modern academic operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Academic ERP */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-indigo-650" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Academic Management</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Effortlessly build student/teacher schedules, draft lesson planners, track class progress diaries, and maintain school curriculum structures.
              </p>
            </div>

            {/* Feature 2: Smart Fees */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Automated Fee Collection</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Generate term invoices, structure optional fees, set up online UPI/card gateways, and send automated payment reminder campaigns on WhatsApp.
              </p>
            </div>

            {/* Feature 3: Attendance tracker */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Attendance & Leave</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Supports biometric scans, RFID integrations, or manual teacher app tracking. Instantly notifies parents in case of an unexcused student absence.
              </p>
            </div>

            {/* Feature 4: Student Portal & LMS */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">LMS & Assignment Portal</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Create subject folders, upload homework tasks, attach learning resources, and grade student submissions in real time with interactive report cards.
              </p>
            </div>

            {/* Feature 5: GPS Transport Tracking */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bus className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">GPS Fleet & Transport ERP</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Map bus routes, assign drivers, monitor GPS coordinates, and notify parents when the school bus is within 10 minutes of their designated stop.
              </p>
            </div>

            {/* Feature 6: Exam & Grading Suite */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-red-650" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Report Cards & Grading</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Design custom report templates, enter grading scores, calculate class ranks automatically, and release digital PDF cards securely to the parent portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Dashboard Preview Section */}
      <section id="dashboard-preview" className="py-24 bg-slate-100/60 relative z-10 border-b border-slate-200">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Interactive Dashboard Demonstration
            </h2>
            <p className="text-slate-650 text-base">
              Select a portal perspective below to experience how different users interact with the system's real-time features.
            </p>

            {/* Interactive Tab Controller */}
            <div className="inline-flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 mt-6 border border-slate-300/40">
              <button
                onClick={() => setActiveTab("principal")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "principal" ? "bg-white text-indigo-700 shadow-md" : "text-slate-600 hover:text-indigo-650"}`}
              >
                Principal Portal
              </button>
              <button
                onClick={() => setActiveTab("teacher")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "teacher" ? "bg-white text-indigo-700 shadow-md" : "text-slate-600 hover:text-indigo-650"}`}
              >
                Teacher Portal
              </button>
              <button
                onClick={() => setActiveTab("parent")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "parent" ? "bg-white text-indigo-700 shadow-md" : "text-slate-600 hover:text-indigo-650"}`}
              >
                Parent Portal
              </button>
            </div>
          </div>

          {/* Interactive Portal Display Area */}
          <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-[440px] flex flex-col md:flex-row">

            {/* Sidebar Mockup */}
            <div className="w-full md:w-60 bg-slate-900 text-slate-300 p-5 flex flex-col justify-between border-r border-slate-800">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">EP</div>
                  <div>
                    <span className="font-bold text-white text-sm block leading-none">EduPulse ERP</span>
                    <span className="text-[9px] text-slate-400">Springdale School</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Main Navigation</div>
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-600/10 text-indigo-400 font-semibold rounded-lg text-xs cursor-pointer">
                    <Layers className="w-4 h-4" />
                    <span>Dashboard Home</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs cursor-pointer transition-colors">
                    <Users className="w-4 h-4" />
                    <span>Profiles Directory</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs cursor-pointer transition-colors">
                    <Calendar className="w-4 h-4" />
                    <span>Timetables & Exams</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs cursor-pointer transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Broadcast</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  {activeTab === "principal" ? "PK" : activeTab === "teacher" ? "MS" : "AS"}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block leading-none">
                    {activeTab === "principal" ? "Principal Khanna" : activeTab === "teacher" ? "Mrs. Sharma" : "Amit (Aarav's Dad)"}
                  </span>
                  <span className="text-[9px] text-slate-500 capitalize">{activeTab} Account</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="flex-1 p-6 md:p-8 bg-slate-50/50 flex flex-col justify-between space-y-6">

              <AnimatePresence mode="wait">
                {activeTab === "principal" && (
                  <motion.div
                    key="principal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">Administrator Console</h3>
                        <p className="text-xs text-slate-500">Live operational snapshot of Springdale School.</p>
                      </div>
                      <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg self-start sm:self-center">
                        Academic Year: 2026-27
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Total Enrolled</span>
                          <span className="text-lg font-bold text-slate-800">1,245 Students</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Fees collected (Q1)</span>
                          <span className="text-lg font-bold text-slate-800">₹14.28 Lakhs</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Award className="w-5 h-5 text-purple-650" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Teacher Presence</span>
                          <span className="text-lg font-bold text-slate-800">46 / 48 Online</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual table / chart mockup */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Pending Administrative Approvals</h4>
                        <span className="text-[10px] text-indigo-650 hover:underline cursor-pointer font-bold">View all request queue</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">Class 12-B Lab Equipment Invoice</span>
                            <span className="text-[10px] text-slate-400">Submitted by: HOD Physics • ₹24,500</span>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-2.5 py-1 bg-indigo-600 text-white rounded font-medium text-[10px] hover:bg-indigo-500">Approve</button>
                            <button className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded font-medium text-[10px] hover:bg-slate-200">Decline</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "teacher" && (
                  <motion.div
                    key="teacher"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">Academic Instructor Dashboard</h3>
                        <p className="text-xs text-slate-500">Grade uploads, class diaries, and parent correspondence.</p>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold rounded-lg self-start sm:self-center">
                        Subject: Grade 10 Math
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Today's Classes</span>
                          <span className="text-lg font-bold text-slate-800">4 Sessions</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Pending Grading</span>
                          <span className="text-lg font-bold text-slate-800">18 Assignments</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-emerald-650" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Parent Chat Threads</span>
                          <span className="text-lg font-bold text-slate-800">3 Unread Alerts</span>
                        </div>
                      </div>
                    </div>

                    {/* Class Roster & Attendance Check */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Class 10-A Attendance Roster</h4>
                        <span className="text-[10px] text-emerald-650 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 animate-pulse" /> Auto WhatsApp Absentees Enabled
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg border border-slate-100 flex justify-between items-center text-xs bg-slate-50/50">
                          <div>
                            <span className="font-semibold text-slate-800">Aarav Sharma</span>
                            <span className="text-[10px] text-slate-450 block">Roll No: 12</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-850 font-semibold text-[10px] rounded cursor-pointer">Present</span>
                            <span className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 font-semibold text-[10px] rounded cursor-pointer">Absent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "parent" && (
                  <motion.div
                    key="parent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">Parent Portal Interface</h3>
                        <p className="text-xs text-slate-500">Track child academic grades, fee payments, and daily notifications.</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-50 border border-purple-100 text-purple-800 text-xs font-bold rounded-lg self-start sm:self-center">
                        Student: Aarav Sharma (Grade X-A)
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Award className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Exam Performance</span>
                          <span className="text-lg font-bold text-slate-800">89.2% (Grade A+)</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Pending Dues</span>
                          <span className="text-lg font-bold text-red-650">₹4,200 (Term-1)</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                          <Bus className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Bus Route GPS Status</span>
                          <span className="text-lg font-bold text-sky-850">1.8 km away</span>
                        </div>
                      </div>
                    </div>

                    {/* Report card mockup & quick pay action */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Active Invoice Notice</h4>
                        <p className="text-xs text-slate-500 mt-1">First term examinations fee invoice due before 25-July.</p>
                      </div>
                      <button className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Pay Now via UPI
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips footer */}
              <div className="p-3 bg-indigo-50/50 border-t border-indigo-100/50 text-center rounded-2xl flex items-center justify-center gap-2 text-xs text-indigo-850">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>Parent portals are fully responsive and feature single-touch payment gateway integrations with automated receipt generation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing Section */}
      <section id="pricing" className="py-24 bg-white relative z-10 border-b border-slate-200">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              One Flat Price for All Features
            </h2>
            <p className="text-slate-655 text-base md:text-lg">
              No hidden tiers, setup fees, or long-term contracts. Get complete access to the entire School OS suite.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col justify-between items-center text-center">
            {/* Ambient background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-6 w-full">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">All-Inclusive Plan</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-4">Complete School ERP & LMS</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                  Includes Academic Management, Parent & Teacher Portals, GPS Tracking, Auto WhatsApp Alerts, Fees, and Exams.
                </p>
              </div>

              <div className="flex justify-center items-center gap-2 py-6 border-y border-slate-200/60 my-6">
                <span className="text-3xl text-slate-450 font-bold -mt-8">₹</span>
                <span className="text-8xl md:text-9xl font-black tracking-tight text-indigo-600">10</span>
                <div className="text-left ml-2">
                  <span className="text-slate-500 text-base font-bold block">per student</span>
                  <span className="text-slate-400 text-xs block">/ month</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Unlimited Teacher logins</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Parent Portal App</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Auto WhatsApp Alerts</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>GPS Bus Route Tracking</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>Automated UPI Fees</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span>24/7 Priority Support</span>
                </div>
              </div>
            </div>

            <div className="w-full mt-8 pt-6 border-t border-slate-200/60">
              <button 
                onClick={() => scrollToSection("demo-request")}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
              >
                Get Started with EduPulse
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Book a Demo Form Section */}
      <section id="demo-request" className="py-24 bg-slate-100/50 relative z-10">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">

            {/* Left Info Column */}
            <div className="bg-indigo-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-850/50 rounded-full blur-3xl pointer-events-none z-0"></div>

              <div className="space-y-6 z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-800 text-[10px] font-semibold tracking-wider uppercase border border-indigo-750">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>On-Demand Setup</span>
                </div>

                <h3 className="text-2xl md:text-3xl font-extrabold leading-tight">
                  Start Elevating School Operations Today
                </h3>

                <p className="text-indigo-200 text-xs md:text-sm leading-relaxed">
                  Book a private demo session with our onboarding specialists. We will run you through a mock setup, configure your class timetables, and demonstrate our automated WhatsApp communications module.
                </p>
              </div>

              <div className="space-y-4 pt-8 md:pt-0 z-10">
                <div className="flex items-center gap-3 text-xs text-indigo-200">
                  <Mail className="w-4.5 h-4.5 text-indigo-400" />
                  <span>onboarding@edupulse.local</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-indigo-200">
                  <Phone className="w-4.5 h-4.5 text-indigo-400" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-indigo-200">
                  <MapPin className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Bengaluru Tech Park, India</span>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="p-8 md:p-12 flex flex-col justify-center bg-white relative">
              <AnimatePresence mode="wait">
                {!demoSubmitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleDemoSubmit}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Request Consultation</h4>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">School Name</label>
                      <input
                        type="text"
                        required
                        value={demoData.schoolName}
                        onChange={(e) => setDemoData({ ...demoData, schoolName: e.target.value })}
                        placeholder="e.g. Springdale International"
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Administrator Name</label>
                      <input
                        type="text"
                        required
                        value={demoData.adminName}
                        onChange={(e) => setDemoData({ ...demoData, adminName: e.target.value })}
                        placeholder="e.g. Mrs. Principal Khanna"
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={demoData.phone}
                          onChange={(e) => setDemoData({ ...demoData, phone: e.target.value })}
                          placeholder="e.g. +91 9876543210"
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Work Email</label>
                        <input
                          type="email"
                          required
                          value={demoData.email}
                          onChange={(e) => setDemoData({ ...demoData, email: e.target.value })}
                          placeholder="e.g. admin@school.edu"
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">School Size (Students)</label>
                      <select
                        value={demoData.studentCount}
                        onChange={(e) => setDemoData({ ...demoData, studentCount: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800"
                      >
                        <option value="Under 100">Under 100 Students</option>
                        <option value="100-500">100 - 500 Students</option>
                        <option value="500-1500">500 - 1500 Students</option>
                        <option value="Above 1500">Above 1500 Students</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      Book Demo Consultation <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center space-y-4 py-8"
                  >
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border border-emerald-250">
                      <Check className="w-7 h-7 text-emerald-600 stroke-[3]" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">Demo Scheduled!</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Thank you, <span className="font-semibold text-slate-800">{demoData.adminName}</span>. We've received your request for <span className="font-semibold text-slate-800">{demoData.schoolName}</span>. A configuration specialist will reach out to you within 2 business hours.
                    </p>
                    <div className="pt-2">
                      <span className="text-[9px] text-indigo-600 font-mono animate-pulse font-semibold">Redirecting to composer in a few seconds...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-white relative z-10">
        <div className="w-full px-4 md:px-12 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Eazzio Logo" className="h-12 w-auto object-contain" />
          </div>

          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} EduPulse Technologies. All rights reserved.
          </p>

          <div className="flex gap-4 text-xs text-slate-500">
            <button className="hover:text-indigo-600 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button className="hover:text-indigo-600 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
