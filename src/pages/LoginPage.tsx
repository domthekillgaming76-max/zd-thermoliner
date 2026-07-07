import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Truck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { getPostLoginPath } from '../lib/accessControl';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError('Email ou mot de passe incorrect');
        } else {
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user!.id).maybeSingle();
          navigate(getPostLoginPath(prof?.role as string | undefined));
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message?.includes('already registered')) {
            setError('Cet email est déjà utilisé');
          } else {
            setError("Erreur lors de l'inscription");
          }
        } else {
          navigate('/dashboard');
        }
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#080808' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Accueil
        </Link>
        <div className="text-center mb-8">
          <div className="inline-flex mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h1>
          <p className="text-white/30">
            {isLogin ? 'Accédez à votre espace Z&D' : 'Rejoignez Z&D Thermoliner'}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input type="text" placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} required={!isLogin}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 text-sm"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full pl-11 pr-11 py-3 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 text-sm"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 btn-primary rounded-xl text-white font-semibold text-sm disabled:opacity-50">
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <button onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-white/30 hover:text-white/60 text-sm transition-colors block w-full">
              {isLogin ? <>Pas de compte ? <span className="text-red-400 font-semibold">S'inscrire</span></> : <>Déjà un compte ? <span className="text-red-400 font-semibold">Se connecter</span></>}
            </button>
            {isLogin && (
              <Link to="/register" className="text-teal-400/80 hover:text-teal-400 text-sm font-medium">
                Créer un compte — Chauffeur ou Visiteur
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
            <Truck className="w-3.5 h-3.5" />
            <span>Z&D Thermoliner — Gestion de flotte professionnelle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
