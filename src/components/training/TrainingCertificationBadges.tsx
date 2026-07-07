import { Award } from 'lucide-react';
import type { DriverCertification } from '../../lib/trainingTypes';
import { CERTIFICATION_DEFS } from '../../lib/trainingTypes';

interface TrainingCertificationBadgesProps {
  certifications: DriverCertification[];
}

export function TrainingCertificationBadges({ certifications }: TrainingCertificationBadgesProps) {
  const allSlugs = Object.keys(CERTIFICATION_DEFS);
  const earned = new Set(certifications.map(c => c.cert_slug));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {allSlugs.map(slug => {
        const def = CERTIFICATION_DEFS[slug];
        const has = earned.has(slug);
        return (
          <div
            key={slug}
            className={`training-cert-badge rounded-2xl p-4 text-center transition-all ${
              has ? 'training-cert-earned' : 'opacity-40'
            }`}
            style={{ borderColor: has ? `${def.color}40` : undefined }}
          >
            <Award className="w-8 h-8 mx-auto mb-2" style={{ color: has ? def.color : '#ffffff30' }} />
            <p className="text-xs font-bold text-white">{def.name}</p>
            <p className="text-[10px] text-white/35 mt-1">{has ? 'Obtenue' : 'À débloquer'}</p>
          </div>
        );
      })}
    </div>
  );
}
