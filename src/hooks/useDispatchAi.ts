import { useQuery } from '@tanstack/react-query';
import { suggestDriverForMission } from '../services/dispatchAiService';
import type { TransportMission } from '../lib/dispatchTypes';

export function useDispatchAiSuggestion(mission: TransportMission | null) {
  return useQuery({
    queryKey: ['dispatchAi', mission?.id],
    queryFn: () => suggestDriverForMission(mission!),
    enabled: !!mission && !['delivered', 'cancelled'].includes(mission.status),
    staleTime: 30_000,
  });
}
