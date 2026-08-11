import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Snowflake, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 mx-auto mb-4">
            <Snowflake size={28} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cold Room Monitor</h1>
          <p className="text-slate-400 text-sm mt-1">Vaccine Storage Management</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@coldroom.io"
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-4 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300 mb-2">Demo accounts:</p>
          <p>admin@coldroom.io / Admin@1234 <span className="text-cyan-400">(Admin)</span></p>
          <p>manager@kigali.io / Manager@1234 <span className="text-yellow-400">(Manager)</span></p>
          <p>tech@kibagabaga.io / Tech@1234 <span className="text-green-400">(Technician)</span></p>
        </div>
      </div>
    </div>
  );
}
