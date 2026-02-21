import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { useLanguage } from '../LanguageContext';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body = isRegistering ? { email, name, role, password } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
        
        if (user.email.toLowerCase() === 'fillipeferreiramunch@gmail.com') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const [password, setPassword] = useState('');

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md bg-slate-900/50 rounded-3xl p-8 border border-neon-cyan/30 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black font-heading mb-2 neon-text-cyan">
            {isRegistering ? t.auth.createAccount : t.auth.welcomeBack}
          </h2>
          <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">
            {isRegistering ? t.auth.registerSubtitle : t.auth.signInSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.auth.fullName}</label>
              <input
                type="text"
                required
                className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.auth.email}</label>
            <input
              type="email"
              required
              className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.auth.password}</label>
            <input
              type="password"
              required
              className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{t.auth.iamA}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-3 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${
                    role === 'client' ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan' : 'border-slate-800 text-slate-600'
                  }`}
                >
                  {t.auth.client}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`py-3 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${
                    role === 'trainer' ? 'border-neon-pink bg-neon-pink/10 text-neon-pink shadow-neon-pink' : 'border-slate-800 text-slate-600'
                  }`}
                >
                  {t.auth.trainer}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-cyan hover:bg-white text-black font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-neon-cyan uppercase tracking-widest"
          >
            {loading ? t.auth.processing : isRegistering ? t.auth.registerBtn : t.auth.signInBtn}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-neon-cyan hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
          >
            {isRegistering ? t.auth.haveAccount : t.auth.needAccount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
