import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/logo.png";
import schoolBg from "../assets/school_background.jpg";
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
  Check,
  Globe,
  Heart,
  Briefcase,
  Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useContext(AuthContext);

  const onLaunchApp = () => navigate('/dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
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
  const [authRole, setAuthRole] = useState("Principal"); // Admin, Principal, Teacher, Student, Accountant
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

  const scrollToSection = (id, behavior = "smooth") => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior });
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

  const pricingPlans = [
    {
      id: "standard",
      name: "Standard",
      price: 10,
      tagline: "Essential tools for institution management.",
      description: "Everything a growing institution needs to manage academics, attendance, and basic fees.",
      badge: null,
      features: [
        { text: "Unlimited Teacher & Admin logins", exclusive: false },
        { text: "Parent Portal App", exclusive: false },
        { text: "Academic & Attendance Management", exclusive: false },
        { text: "Basic Fee Collection", exclusive: false },
        { text: "GPS Bus Route Tracking", exclusive: false },
        { text: "Standard Support", exclusive: false }
      ]
    },
    {
      id: "premium",
      name: "Premium",
      price: 15,
      tagline: "Advanced automation and reporting.",
      description: "The complete suite with advanced accounting, reporting, and instant notifications.",
      badge: "⭐ Most Popular",
      features: [
        { text: "Advanced Accounting & Fee Management", exclusive: true },
        { text: "Automated Report Card Generation", exclusive: true },
        { text: "Instant WhatsApp Due Alerts", exclusive: true },
        { text: "Projected Revenue Dashboard", exclusive: true },
        { text: "Unlimited Teacher & Admin logins", exclusive: false },
        { text: "Parent Portal App", exclusive: false },
        { text: "GPS Bus Route Tracking", exclusive: false },
        { text: "24/7 Priority Support", exclusive: false }
      ]
    }
  ];

  const PricingCards = () => {
    const [expandedPlans, setExpandedPlans] = useState({});
    
    return (
      <div className="flex flex-wrap justify-center gap-6 mt-12 w-full max-w-5xl mx-auto">
        {pricingPlans.map((plan) => {
          const isPopular = plan.badge !== null;
          const isExpanded = expandedPlans[plan.id];
          const visibleFeatures = isExpanded ? plan.features : plan.features.slice(0, 5);
          
          return (
            <div 
              key={plan.id}
              className={`w-[360px] max-w-full flex flex-col bg-white rounded-3xl p-8 text-left relative transition-all duration-300 hover:-translate-y-1 ${
                isPopular 
                  ? "border-2 border-teal-500 shadow-2xl shadow-teal-500/20 z-10 scale-[1.02]" 
                  : "border border-slate-200 shadow-xl shadow-slate-200/50"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-400 text-white text-[11px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-teal-500/30 whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                <p className="text-teal-600 text-sm font-semibold italic mt-1">{plan.tagline}</p>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8 pb-8 border-b border-slate-100">
                <span className="text-4xl font-bold text-slate-400">₹</span>
                <span className="text-6xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                <div className="flex flex-col ml-2">
                  <span className="text-sm font-bold text-slate-500">/ learner</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">What's included</p>
                <ul className="space-y-3.5 mb-6">
                  {visibleFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feat.exclusive ? (
                        <div className="mt-0.5 relative shrink-0">
                          <Check className="w-4 h-4 text-amber-500 stroke-[3]" />
                          <div className="absolute -inset-1 bg-amber-100 rounded-full blur-sm -z-10"></div>
                        </div>
                      ) : (
                        <Check className="w-4 h-4 text-teal-500 shrink-0 stroke-[3] mt-0.5" />
                      )}
                      <span className={`text-sm ${feat.exclusive ? "text-amber-700 font-semibold" : "text-slate-600"}`}>
                        {feat.exclusive ? `★ ${feat.text}` : feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {plan.features.length > 5 && (
                  <button 
                    onClick={() => setExpandedPlans({...expandedPlans, [plan.id]: !isExpanded})}
                    className="text-xs font-bold text-teal-600 hover:text-teal-500 mb-6 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? "Show fewer features ↑" : "Show more features ↓"}
                  </button>
                )}
              </div>

              <button
                onClick={() => navigate(`/register?plan=${plan.id}`)}
                className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-[0.98] ${
                  isPopular 
                    ? "bg-teal-500 hover:bg-teal-400 text-white shadow-teal-500/25" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-slate-200/50"
                }`}
              >
                Start with {plan.name}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (showPricingOnly) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-500 selection:text-white p-6 md:p-12 flex items-center justify-center">
        <div className="w-full">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto">
              Choose the plan that fits your institution's needs. Upgrade anytime as you grow.
            </p>
          </div>
          <PricingCards />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden relative">
      {showBanner && (
        <div className="w-full bg-slate-900/95 text-slate-100 py-2.5 px-6 flex justify-between items-center text-xs font-semibold relative z-50 border-b border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 mx-auto">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <span>🔒</span>
              <span>Your data is safe and secure with us — Encrypted by AES 256-bit Encryption</span>
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-slate-450 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-all absolute right-6"
            aria-label="Close encryption banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── HERO SECTION with full campus background ─── */}
      <div className="relative w-full min-h-screen flex flex-col">
        {/* Campus background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${schoolBg})` }}
        />
        {/* Multi-layer overlay for text legibility + premium feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-teal-950/60 to-slate-900/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
        {/* Subtle tinted glow orbs over image */}
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] bg-teal-500/15 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Navigation Bar — white background */}
        <nav className="relative z-50 w-full px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Eazzio Logo" className="h-14 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection("features")} className="hover:text-teal-600 transition-colors">Key Modules</button>
            <button onClick={() => scrollToSection("dashboard-preview")} className="hover:text-teal-600 transition-colors">Dashboard Demo</button>
            <button onClick={() => scrollToSection("pricing", "auto")} className="hover:text-teal-600 transition-colors">Pricing</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-teal-600/30"
            >
              Register Institution
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 border border-slate-200"
            >
              Sign In
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-slate-600 hover:text-teal-600 transition-colors p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-50 md:hidden bg-slate-950/95 backdrop-blur-lg px-6 pt-4 pb-6 flex flex-col gap-4 text-white/80 text-base border-b border-white/10"
            >
              <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-teal-300 transition-colors">Key Modules</button>
              <button onClick={() => scrollToSection("dashboard-preview")} className="text-left py-2 hover:text-teal-300 transition-colors">Dashboard Demo</button>
              <button onClick={() => scrollToSection("pricing", "auto")} className="text-left py-2 hover:text-teal-300 transition-colors">Pricing</button>
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-center"
              >
                Register Institution
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-center border border-white/20"
              >
                Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="w-full px-6 md:px-12 lg:px-16 pt-3 pb-4 md:pt-4 md:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left — Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:col-span-7 space-y-4 text-center lg:text-left"
            >


              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-white drop-shadow-lg">
                The Complete
                <br />
                <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-green-300 bg-clip-text text-transparent">
                  Operating System
                </span>
                <br />
                <span className="text-white/90">for Modern Institutions</span>
              </h1>

              <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Empower teachers, delight parents, and simplify institution administration. Manage admissions, automatic fee collections, timetables, attendance, and smart WhatsApp communications — all from one intuitive portal.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all duration-200 shadow-2xl shadow-teal-600/40 hover:shadow-teal-500/50 active:scale-98 flex items-center justify-center gap-2 group"
                >
                  Register Institution
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToSection("dashboard-preview")}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all duration-200 border border-white/25 backdrop-blur-sm active:scale-98 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-teal-300 fill-teal-300/40" />
                  Explore Dashboard UI
                </button>
              </div>

              {/* Quick Metrics Bar */}
              <div className="pt-4 border-t border-white/15 max-w-lg mx-auto lg:mx-0 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-black text-teal-300">40%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Admin Time Saved</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-300">98%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">Fee Collection Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-300">Live</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">WhatsApp Alerts</div>
                </div>
              </div>
            </motion.div>

            {/* Right — Glassmorphic Login Widget */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="w-full max-w-[420px] rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col p-5 relative backdrop-blur-xl bg-white/10">
                {/* Glassmorphic glow inside card */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />


                <AnimatePresence mode="wait">
                  {authSuccess ? (
                    <motion.div
                      key="auth-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center text-center py-6 space-y-3 min-h-[260px]"
                    >
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-400/40">
                        <Check className="w-8 h-8 text-emerald-300 stroke-[3]" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">
                        Authentication Successful
                      </h3>
                      <p className="text-sm text-white/60 max-w-[280px]">
                        Welcome back! Redirecting you to the Eazzio Portal...
                      </p>
                      <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={authMode}
                      initial={{ opacity: 0, x: authMode === "login" ? -15 : 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: authMode === "login" ? 15 : -15 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col min-h-[260px] justify-between"
                    >
                      {isAuthenticated ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-8">
                          <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center border border-teal-400/40 text-teal-300 font-bold text-xl">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="text-center">
                            <h3 className="text-2xl font-bold text-white">Welcome back!</h3>
                            <p className="text-sm text-white/60 mt-1">You are logged in as {user?.name}</p>
                          </div>
                          <button
                            onClick={onLaunchApp}
                            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-teal-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            Enter Dashboard <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleAuthSubmit} className="space-y-3">
                          <div>
                            <h3 className="text-xl font-bold text-white">Welcome Back</h3>
                            <p className="text-xs text-white/50 mt-0.5">Select your role and sign in.</p>
                          </div>

                          {/* Role Selector */}
                          <div>
                            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Login As</label>
                            <div className="grid grid-cols-5 gap-1.5">
                              {[
                                { id: 'Admin',       icon: <Shield className="w-4 h-4 mx-auto mb-1" /> },
                                { id: 'Principal',   icon: <Briefcase className="w-4 h-4 mx-auto mb-1" /> },
                                { id: 'Teacher',     icon: <BookOpen className="w-4 h-4 mx-auto mb-1" /> },
                                { id: 'Student',     icon: <GraduationCap className="w-4 h-4 mx-auto mb-1" /> },
                                { id: 'Accountant',  icon: <Calculator className="w-4 h-4 mx-auto mb-1" /> },
                              ].map(({ id, icon }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setAuthRole(id)}
                                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide transition-all ${
                                    authRole === id
                                      ? 'bg-teal-500/30 border-teal-400 text-teal-200'
                                      : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10 hover:text-white/70'
                                  }`}
                                >
                                  <div className="text-center">{icon}</div>
                                  <span className="block mt-0.5">{id}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {authError && (
                            <div className="p-2 bg-red-500/15 border border-red-400/30 rounded-lg text-red-300 text-xs font-semibold flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {authError}
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">
                              {authRole === 'Student' ? 'Student ID' : 'Email / Employee ID'}
                            </label>
                            <input
                              type="text"
                              required
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              placeholder={
                                authRole === 'Student'    ? 'e.g. STU2025001' :
                                authRole === 'Teacher'    ? 'email or EMP001' :
                                authRole === 'Accountant' ? 'email or EMP001' :
                                'admin@institution.edu'
                              }
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-white/30 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 transition-all"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Password</label>
                              <button type="button" className="text-[10px] text-teal-300 hover:text-teal-200 hover:underline font-semibold">Forgot?</button>
                            </div>
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-white/30 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 transition-all"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-600/50 text-white font-bold rounded-lg text-sm shadow-lg shadow-teal-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                          >
                            {authLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Signing in...</span>
                              </>
                            ) : (
                              <span>Sign In as {authRole}</span>
                            )}
                          </button>

                          <p className="text-center text-[10px] text-white/35 pt-0.5">
                            New institution?{' '}
                            <button type="button" onClick={() => navigate('/register')} className="text-teal-300 hover:text-teal-200 font-semibold">
                              Register here
                            </button>
                          </p>
                        </form>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* End hero section */}

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
                Effortlessly build learner/teacher schedules, draft lesson planners, track course progress diaries, and maintain institution curriculum structures.
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
                Supports biometric scans, RFID integrations, or manual teacher app tracking. Instantly notifies parents in case of an unexcused learner absence.
              </p>
            </div>

            {/* Feature 4: Student Portal & LMS */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">LMS & Assignment Portal</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Create subject folders, upload homework tasks, attach learning resources, and grade learner submissions in real time with interactive report cards.
              </p>
            </div>

            {/* Feature 5: GPS Transport Tracking */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bus className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">GPS Fleet & Transport ERP</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Map bus routes, assign drivers, monitor GPS coordinates, and notify parents when the institution bus is within 10 minutes of their designated stop.
              </p>
            </div>

            {/* Feature 6: Exam & Grading Suite */}
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-red-650" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Report Cards & Grading</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Design custom report templates, enter grading scores, calculate course ranks automatically, and release digital PDF cards securely to the parent portal.
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
            <div className="inline-flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 mt-6 border border-slate-300/40 flex-wrap justify-center">
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "admin" ? "bg-white text-emerald-700 shadow-md" : "text-slate-600 hover:text-emerald-650"}`}
              >
                Admin Portal
              </button>
              <button
                onClick={() => setActiveTab("principal")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "principal" ? "bg-white text-emerald-700 shadow-md" : "text-slate-600 hover:text-emerald-650"}`}
              >
                Principal Portal
              </button>
              <button
                onClick={() => setActiveTab("teacher")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "teacher" ? "bg-white text-emerald-700 shadow-md" : "text-slate-600 hover:text-emerald-650"}`}
              >
                Teacher Portal
              </button>
              <button
                onClick={() => setActiveTab("parent")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "parent" ? "bg-white text-emerald-700 shadow-md" : "text-slate-600 hover:text-emerald-650"}`}
              >
                Student Portal
              </button>
              <button
                onClick={() => setActiveTab("accountant")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "accountant" ? "bg-white text-emerald-700 shadow-md" : "text-slate-600 hover:text-emerald-650"}`}
              >
                Accountant Portal
              </button>
            </div>
          </div>

          {/* Interactive Portal Display Area */}
          <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-[440px] flex flex-col md:flex-row">

            {/* Sidebar Mockup */}
            <div className="w-full md:w-60 bg-slate-900 text-slate-300 p-5 flex flex-col justify-between border-r border-slate-800">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">EZ</div>
                  <div>
                    <span className="font-bold text-white text-sm block leading-none">Eazzio ERP</span>
                    <span className="text-[9px] text-slate-400">Springdale Institution</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Main Navigation</div>
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-600/10 text-emerald-400 font-semibold rounded-lg text-xs cursor-pointer">
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
                  {activeTab === "admin" ? "AD" : activeTab === "principal" ? "PK" : activeTab === "teacher" ? "MS" : activeTab === "parent" ? "AS" : "AC"}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block leading-none">
                    {activeTab === "admin" ? "System Admin" : activeTab === "principal" ? "Principal Khanna" : activeTab === "teacher" ? "Mrs. Sharma" : activeTab === "parent" ? "Amit (Aarav's Dad)" : "Accountant Roy"}
                  </span>
                  <span className="text-[9px] text-slate-500 capitalize">{activeTab} Account</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="flex-1 p-6 md:p-8 bg-slate-50/50 flex flex-col justify-between space-y-6">

              <AnimatePresence mode="wait">
                {activeTab === "admin" && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">System Administration</h3>
                        <p className="text-xs text-slate-500">Manage institution-wide settings, user roles, and backups.</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg self-start sm:self-center">
                        Global Access
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Active Users</span>
                          <span className="text-lg font-bold text-slate-800">1,305 Total</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">System Status</span>
                          <span className="text-lg font-bold text-slate-800">All Systems Online</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-emerald-650" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Last Backup</span>
                          <span className="text-lg font-bold text-slate-800">12 Mins Ago</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual table / chart mockup */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Recent System Activity</h4>
                        <span className="text-[10px] text-emerald-650 hover:underline cursor-pointer font-bold">View logs</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">New Teacher Account Created</span>
                            <span className="text-[10px] text-slate-400">IP: 192.168.1.45 • 2 hours ago</span>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium text-[10px] hover:bg-emerald-500">View Details</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

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
                        <p className="text-xs text-slate-500">Live operational snapshot of Springdale Institution.</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg self-start sm:self-center">
                        Academic Year: 2026-27
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-emerald-600" />
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
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Award className="w-5 h-5 text-emerald-650" />
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
                        <span className="text-[10px] text-emerald-650 hover:underline cursor-pointer font-bold">View all request queue</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">Course 12-B Lab Equipment Invoice</span>
                            <span className="text-[10px] text-slate-400">Submitted by: HOD Physics • ₹24,500</span>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium text-[10px] hover:bg-emerald-500">Approve</button>
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
                        <p className="text-xs text-slate-500">Grade uploads, course diaries, and parent correspondence.</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-lg self-start sm:self-center">
                        Subject: Grade 10 Math
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Today's Courses</span>
                          <span className="text-lg font-bold text-slate-800">4 Sessions</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
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

                    {/* Course Roster & Attendance Check */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Course 10-A Attendance Roster</h4>
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
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-lg self-start sm:self-center">
                        Student: Aarav Sharma (Grade X-A)
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Award className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Exam Performance</span>
                          <span className="text-lg font-bold text-slate-800">89.2% (Grade A+)</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Pending Dues</span>
                          <span className="text-lg font-bold text-emerald-650">₹4,200 (Term-1)</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Bus className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Bus Route GPS Status</span>
                          <span className="text-lg font-bold text-emerald-850">1.8 km away</span>
                        </div>
                      </div>
                    </div>

                    {/* Report card mockup & quick pay action */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Active Invoice Notice</h4>
                        <p className="text-xs text-slate-500 mt-1">First term examinations fee invoice due before 25-July.</p>
                      </div>
                      <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Pay Now via UPI
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "accountant" && (
                  <motion.div
                    key="accountant"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">Finance & Accounting Portal</h3>
                        <p className="text-xs text-slate-500">Track fee collections, generate invoices, and manage expenses.</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg self-start sm:self-center">
                        Department: Finance
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Today's Collections</span>
                          <span className="text-lg font-bold text-slate-800">₹85,400</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Pending Dues</span>
                          <span className="text-lg font-bold text-slate-800">₹3.2 Lakhs</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-650" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Invoices Generated</span>
                          <span className="text-lg font-bold text-slate-800">45 Today</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual table / chart mockup */}
                    <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Recent Transactions</h4>
                        <span className="text-[10px] text-emerald-650 hover:underline cursor-pointer font-bold">View ledger</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">Term 2 Fee - Aarav Sharma</span>
                            <span className="text-[10px] text-slate-400">Paid via UPI • Ref: TRNX89234</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2.5 py-1 text-emerald-600 font-bold text-[10px]">+ ₹12,500</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips footer */}
              <div className="p-3 bg-emerald-50/50 border-t border-emerald-100/50 text-center rounded-2xl flex items-center justify-center gap-2 text-xs text-emerald-850">
                <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Portals are fully responsive and feature single-touch payment gateway integrations with automated receipt generation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 relative z-10 border-b border-slate-200">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto">
              Choose the plan that fits your institution's needs. Upgrade anytime as you grow.
            </p>
          </div>
          
          <PricingCards />
          
        </div>
      </section>



      {/* Footer */}
      <footer className="relative bg-slate-950 text-slate-400 pt-20 pb-10 border-t border-slate-900 overflow-hidden z-10">
        {/* Glow effect */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full px-6 md:px-12 lg:px-16 mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-16 border-b border-slate-800/60">
            {/* Brand Column */}
            <div className="space-y-6 lg:col-span-2">
              <div className="inline-flex items-center justify-center bg-white px-4 py-2 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.02] transition-transform duration-200" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img src={logo} alt="Eazzio Logo" className="h-12 w-auto object-contain" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                The comprehensive operating system designed to elevate academic management, automate fee collections, and simplify administration for modern institutions.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" aria-label="Twitter / X" className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-sm">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-sm">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="#" aria-label="Website" className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-sm">
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Modules Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Modules</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Academic ERP</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Fee Collections</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Smart Attendance</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>GPS Transit Tracking</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Exam & Report Cards</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => scrollToSection("pricing", "auto")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Pricing Plans</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("demo-request")} className="hover:text-white transition-colors duration-250 flex items-center gap-1 group text-left">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Book Consultation</span>
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-250 flex items-center gap-1 group">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>Documentation</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-250 flex items-center gap-1 group">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span>API Reference</span>
                  </a>
                </li>
                <li>
                  <div className="hover:text-white transition-colors duration-250 flex items-center gap-2 group">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-semibold text-slate-300">All Systems Operational</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Get In Touch</h4>
              <ul className="space-y-3.5 text-sm">
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">onboarding@eazzio.local</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">+91 98765 43210</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4.5 h-4.5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-slate-400 leading-snug">Bengaluru Tech Park,<br />Karnataka, India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} Eazzio Technologies. All rights reserved.</span>
              {/*<span className="hidden md:inline text-slate-700">|</span>*/}
              <span className="flex items-center gap-1">
              </span>
            </div>

            <div className="flex gap-6 text-xs text-slate-500">
              <button className="hover:text-white transition-colors duration-200">Privacy Policy</button>
              <button className="hover:text-white transition-colors duration-200">Terms of Service</button>
              <button className="hover:text-white transition-colors duration-200">Cookie Preferences</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}