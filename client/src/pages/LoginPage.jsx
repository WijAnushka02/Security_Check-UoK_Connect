import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCode, FiUsers, FiBriefcase, FiTrendingUp, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function StatCard({ icon: Icon, value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-base leading-none">{value}</p>
        <p className="text-white/60 text-xs mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    projects: 0,
    students: 0,
    companies: 0,
    connections: 0,
  });

  useEffect(() => {
    api.get('/public/stats').then((res) => {
      if (res.data.success) {
        const { totalProjects, totalStudents, totalCompanies, totalConnections } = res.data.stats;
        setStats({
          projects: totalProjects || 0,
          students: totalStudents || 0,
          companies: totalCompanies || 0,
          connections: totalConnections || 0,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      toast.error(decodeURIComponent(err));
    }
  }, [searchParams]);

  const hasError = searchParams.get('error');

  return (
    <div className="h-screen flex">
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-col justify-between p-10 pt-24
        bg-gradient-to-br from-green-700 via-green-600 to-emerald-500"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">UOK Connect</span>
        </motion.div>

        <div className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Where student<br />projects meet<br />opportunity.
            </h1>
            <p className="text-white/70 text-base mt-4 max-w-xs leading-relaxed">
              Showcase your work, connect with companies, and build your career from
              the University of Kelaniya.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <StatCard icon={FiCode} value={`${stats.projects}+`} label="Projects" delay={0.4} />
            <StatCard icon={FiUsers} value={`${stats.students}+`} label="Students" delay={0.5} />
            <StatCard icon={FiBriefcase} value={`${stats.companies}+`} label="Companies" delay={0.6} />
            <StatCard icon={FiTrendingUp} value={`${stats.connections}+`} label="Connections" delay={0.7} />
          </div>
        </div>

        <div className="relative">
          <p className="text-white/40 text-xs">Faculty of Computing · University of Kelaniya</p>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 pb-16 pt-24 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[380px] flex flex-col items-center text-center"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11 L7 3 L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8.5 H10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">UOK <span className="text-green-600">Connect</span></span>
          </Link>

          {!hasError ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>
              
              <button
                type="button"
                onClick={() => (window.location.href = `${API_BASE}/auth/oidc/login?state=login`)}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-[#ff5000] hover:bg-[#e04600] text-white text-sm font-semibold transition-all duration-200 shadow-sm"
              >
                Log in with Asgardeo
                <FiArrowRight size={16} />
              </button>
              
              <p className="text-sm text-gray-500 mt-8">
                Don't have an account?{' '}
                <Link to="/auth/register" className="text-green-600 hover:text-green-700 font-semibold transition-colors">
                  Register here
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 text-2xl">
                !
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
              <p className="text-gray-500 text-sm mb-6">There was a problem signing you in securely.</p>
              <button
                type="button"
                onClick={() => (window.location.href = `${API_BASE}/auth/oidc/login?state=login`)}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-[#ff5000] hover:bg-[#e04600] text-white text-sm font-semibold transition-all duration-200 shadow-sm mb-4"
              >
                Try Again with Asgardeo
                <FiArrowRight size={16} />
              </button>
              <Link to="/" className="text-green-600 hover:text-green-700 font-medium text-sm">
                Return to Home
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}