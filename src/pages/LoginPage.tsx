import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, Truck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPostLoginPath } from '../lib/accessControl';
import { supabase } from '../lib/supabase';

const LOGIN_VISUAL = '/login/zd-thermoliner-bureaux.webp';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError('Email ou mot de passe incorrect');
          return;
        }

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        const { data: profile } = userId
          ? await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
          : { data: null };

        navigate(getPostLoginPath(profile?.role as string | undefined));
        return;
      }

      const { error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) {
        setError(
          signUpError.message?.includes('already registered')
            ? 'Cet email est déjà utilisé'
            : "Erreur lors de l'inscription",
        );
        return;
      }

      navigate('/dashboard');
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((currentMode) => !currentMode);
    setError(null);
  };

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#060606] text-white lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="relative h-[15rem] overflow-hidden sm:h-[19rem] lg:sticky lg:top-0 lg:h-[100dvh]" aria-label="Z&D Thermoliner Bureaux">
        <img
          src={LOGIN_VISUAL}
          alt="Logo Z&D Thermoliner Bureaux dans les locaux de l'entreprise"
          className="absolute inset-0 h-full w-full object-cover object-[center_40%] lg:object-center"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-black/5 to-black/20 lg:bg-gradient-to-r lg:from-black/5 lg:via-transparent lg:to-[#060606]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060606] to-transparent lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-36 lg:bg-gradient-to-l" />

        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 text-sm font-medium text-white/80 shadow-xl backdrop-blur-md transition hover:border-red-400/40 hover:bg-black/75 hover:text-white sm:left-6 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Accueil
        </Link>

        <div className="absolute bottom-7 left-6 hidden max-w-md lg:block xl:bottom-10 xl:left-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-black/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-red-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
            Centre opérationnel
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-white/60">
            Gestion, logistique et performance réunies dans votre espace professionnel sécurisé.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-0 items-center justify-center px-4 pb-8 pt-1 sm:px-8 sm:pb-10 lg:min-h-[100dvh] lg:px-10 lg:py-12 xl:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(220,38,38,0.10),transparent_36%)]" />

        <div className="relative z-10 w-full max-w-[29rem]">
          <div className="mb-6 text-center lg:mb-8 lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-white/55">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Espace membre sécurisé
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {isLogin ? 'Bienvenue dans vos bureaux' : 'Rejoindre Z&D Thermoliner'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/45 sm:text-base">
              {isLogin
                ? 'Connectez-vous pour reprendre vos opérations.'
                : 'Créez votre accès à la plateforme professionnelle.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">Nom complet</span>
                  <span className="relative block">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required={!isLogin}
                      autoComplete="name"
                      placeholder="Prénom et nom"
                      className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/15 focus:border-red-500/60 focus:ring-4 focus:ring-red-500/10"
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">Adresse email</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="nom@entreprise.fr"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/15 focus:border-red-500/60 focus:ring-4 focus:ring-red-500/10"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">Mot de passe</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder="6 caractères minimum"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/15 focus:border-red-500/60 focus:ring-4 focus:ring-red-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {error && (
                <div
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white disabled:cursor-wait disabled:opacity-55"
              >
                {loading ? 'Chargement…' : isLogin ? 'Se connecter' : "Créer mon compte"}
              </button>
            </form>

            <div className="mt-5 border-t border-white/[0.07] pt-5 text-center">
              <button
                type="button"
                onClick={switchMode}
                className="min-h-10 w-full rounded-lg px-3 text-sm text-white/45 transition hover:bg-white/[0.03] hover:text-white/75"
              >
                {isLogin ? (
                  <>Pas encore de compte ? <span className="font-semibold text-red-400">S'inscrire</span></>
                ) : (
                  <>Déjà membre ? <span className="font-semibold text-red-400">Se connecter</span></>
                )}
              </button>

              {isLogin && (
                <Link
                  to="/register"
                  className="mt-1 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-emerald-400/85 transition hover:bg-emerald-400/5 hover:text-emerald-300"
                >
                  Créer un profil Chauffeur ou Visiteur
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/25">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span>Z&D Thermoliner — Gestion de flotte professionnelle</span>
          </div>
        </div>
      </section>
    </main>
  );
}
