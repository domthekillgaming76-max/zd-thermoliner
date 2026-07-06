import { LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SuspendedPage() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #080808 0%, #0d0d0d 100%)' }}>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Accès suspendu</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          Votre accès à Z&D Thermoliner a été suspendu.<br />
          Contactez la direction pour plus d'informations.
        </p>
        <button onClick={signOut}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold mx-auto transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function DepartedPage() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #080808 0%, #0d0d0d 100%)' }}>
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-4xl">👋</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Vous avez quitté l'entreprise</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          Vous ne faites plus partie de Z&D Thermoliner.<br />
          Vous pouvez refaire une demande plus tard via la page de recrutement.
        </p>
        <div className="flex flex-col gap-3">
          <a href="/join"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold btn-primary text-white">
            <RefreshCw className="w-4 h-4" />
            Refaire une candidature
          </a>
          <button onClick={signOut}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
