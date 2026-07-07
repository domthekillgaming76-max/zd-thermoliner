import { ChevronRight, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CLIENT_STATUS_LABELS, type ErpClient } from '../../lib/clientTypes';
import { fmtEuro } from '../../lib/format';

interface ClientCardProps {
  client: ErpClient;
  onEdit?: (client: ErpClient) => void;
}

export function ClientCard({ client, onEdit }: ClientCardProps) {
  const st = CLIENT_STATUS_LABELS[client.status] ?? CLIENT_STATUS_LABELS.active;

  return (
    <div className="client-glass client-card-hover rounded-2xl p-4 border border-white/5 group">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-700 to-red-950 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-white/60" />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/clients/${client.id}`} className="text-white font-bold hover:text-red-300 transition-colors truncate block">
            {client.name}
          </Link>
          {client.contact_name && <p className="text-white/40 text-xs">{client.contact_name}</p>}
          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.color}`}>
            {st.label}
          </span>
        </div>
        {onEdit && (
          <button type="button" onClick={() => onEdit(client)} className="text-[10px] text-white/30 hover:text-white opacity-0 group-hover:opacity-100">
            Modifier
          </button>
        )}
      </div>
      <div className="mt-3 flex justify-between text-xs text-white/40">
        {(client.city || client.country) && (
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{[client.city, client.country].filter(Boolean).join(', ')}</span>
        )}
        <span className="text-emerald-400 font-bold">{fmtEuro(client.total_revenue)}</span>
      </div>
      <Link to={`/clients/${client.id}`} className="mt-3 flex items-center justify-center gap-1 text-xs text-red-400 font-semibold hover:text-red-300">
        Voir le profil <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
