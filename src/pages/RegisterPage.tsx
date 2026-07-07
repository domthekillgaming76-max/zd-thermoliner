import { useState } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Truck, Eye, User, Mail, Lock, ArrowLeft } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

import { Logo } from '../components/Logo';



type AccountType = 'driver' | 'visitor';



export function RegisterPage() {

  const [searchParams] = useSearchParams();

  const initialType = searchParams.get('type') === 'visitor' ? 'visitor' : 'driver';

  const [accountType, setAccountType] = useState<AccountType>(initialType);

  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();

  const navigate = useNavigate();



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault();

    setError(null);

    setLoading(true);

    try {

      const { error: signUpError } = await signUp(email, password, fullName);

      if (signUpError) {

        setError(signUpError.message?.includes('already') ? 'Cet email est déjà utilisé' : signUpError.message);

        return;

      }



      // Profile row is created automatically by handle_new_user trigger (role = visitor)

      navigate(accountType === 'visitor' ? '/wall' : '/recruitment');

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');

    } finally {

      setLoading(false);

    }

  }



  return (

    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080808' }}>

      <div className="absolute inset-0 landing-hero-bg opacity-40" />

      <div className="relative z-10 w-full max-w-lg">

        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6">

          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil

        </Link>



        <div className="text-center mb-6">

          <Logo size="md" />

          <h1 className="text-2xl font-black text-white mt-4">Créer un compte</h1>

          <p className="text-white/40 text-sm mt-1">Tous les comptes démarrent en Visiteur</p>

        </div>



        <div className="grid grid-cols-2 gap-3 mb-6">

          {([

            { id: 'driver' as const, icon: Truck, title: 'Chauffeur RP', desc: 'Candidature flotte' },

            { id: 'visitor' as const, icon: Eye, title: 'Visiteur', desc: 'Accès communautaire' },

          ]).map(opt => (

            <button

              key={opt.id}

              type="button"

              onClick={() => setAccountType(opt.id)}

              className={`rounded-2xl p-4 border text-left transition-all ${

                accountType === opt.id

                  ? 'border-teal-500/40 bg-teal-500/10'

                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'

              }`}

            >

              <opt.icon className={`w-6 h-6 mb-2 ${accountType === opt.id ? 'text-teal-400' : 'text-white/30'}`} />

              <p className="font-bold text-white text-sm">{opt.title}</p>

              <p className="text-xs text-white/40">{opt.desc}</p>

            </button>

          ))}

        </div>



        <div className="erp-card rounded-2xl p-6">

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="relative">

              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />

              <input type="text" placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} required

                className="erp-input w-full pl-11" />

            </div>

            <div className="relative">

              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />

              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required

                className="erp-input w-full pl-11" />

            </div>

            <div className="relative">

              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />

              <input type="password" placeholder="Mot de passe (6+ caractères)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}

                className="erp-input w-full pl-11" />

            </div>

            {error && (

              <div className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">{error}</div>

            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50">

              {loading ? 'Création...' : 'Créer mon compte'}

            </button>

          </form>

          <p className="text-center text-sm text-white/30 mt-4">

            Déjà inscrit ? <Link to="/login" className="text-red-400 font-semibold">Se connecter</Link>

          </p>

        </div>

      </div>

    </div>

  );

}

