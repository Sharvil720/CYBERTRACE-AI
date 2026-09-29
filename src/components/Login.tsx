import { useState } from 'react';
import { Shield, Lock, User, ChevronRight, Fingerprint, Terminal, Clock } from 'lucide-react';
import { officers } from '@/data/mockData';
import { record } from '@/services/auditLog';
import { useNow } from '@/hooks/useNow';
import type { Officer } from '@/types';

const MAX_FAILURES = 5;
const LOCKOUT_MS = 30_000;

interface LoginProps {
  onLogin: (officer: Officer) => void;
  /** Why the officer landed here, e.g. an idle timeout. */
  notice?: string | null;
}

export default function Login({ onLogin, notice }: LoginProps) {
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Officer | null>(null);
  const [error, setError] = useState('');
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const now = useNow(1000);
  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const fail = (reason: string) => {
    const attempted = officerId.trim().slice(0, 40) || '(empty)';
    record(null, 'auth.failed', attempted, reason);
    const next = failures + 1;
    if (next >= MAX_FAILURES) {
      record(null, 'auth.lockout', attempted, `${MAX_FAILURES} failed attempts, locked ${LOCKOUT_MS / 1000}s`);
      setFailures(0);
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setError(`Too many failed attempts. Try again in ${LOCKOUT_MS / 1000} seconds.`);
    } else {
      setFailures(next);
      setError(reason === 'unknown officer id' ? 'Unknown officer ID.' : 'Invalid credentials. Minimum 4 characters.');
    }
  };

  const handleLogin = () => {
    if (lockedFor > 0) return;
    if (!officerId || !password) {
      setError('Officer ID and password are required.');
      return;
    }
    const officer = officers.find((o) => o.badge.toLowerCase() === officerId.trim().toLowerCase());
    if (!officer) {
      fail('unknown officer id');
      return;
    }
    if (password.length < 4) {
      fail('password rejected');
      return;
    }
    onLogin(officer);
  };

  const quickLogin = (officer: Officer) => {
    setSelectedRole(officer);
    setOfficerId(officer.badge);
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-navy-950 grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-800/50 mb-4 glow-cyan">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CYBERTRACE <span className="text-cyan-glow">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 tracking-wide">Predict the Cash-Out. Stop the Loss.</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-navy-800 text-slate-500 rounded border border-navy-700">
              SIH26184
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-navy-800 text-slate-500 rounded border border-navy-700">
              Authorized Access Only
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="card p-6 scan-line">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-navy-700">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Secure Login Terminal</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider">Officer ID / Badge</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="e.g. IPS-1042"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-colors"
                />
              </div>
            </div>

            {notice && !error && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-800/40 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                {notice}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={lockedFor > 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Fingerprint className="w-4 h-4" />
              {lockedFor > 0 ? `Locked, retry in ${lockedFor}s` : 'Authenticate & Enter'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Quick role login */}
          <div className="mt-6 pt-4 border-t border-navy-700">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Quick Demo Login (Role-Based)</p>
            <div className="grid grid-cols-2 gap-2">
              {officers.map((o) => (
                <button
                  key={o.id}
                  onClick={() => quickLogin(o)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    selectedRole?.id === o.id
                      ? 'bg-cyan-950/30 border-cyan-800/50'
                      : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-200 capitalize">{o.role}</p>
                  <p className="text-[10px] text-slate-500">{o.rank} · {o.badge}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          Synthetic demo data only. No real NCRP, bank, or government data is accessed.
        </p>
      </div>
    </div>
  );
}
