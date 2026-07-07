import { useEffect, useState, useCallback } from 'react';
import { Trophy, Medal, TrendingUp, Crown, Award, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase, Medal as MedalType } from '../lib/supabase';

interface DriverRanking {
  id: string;
  name: string;
  photo_url: string | null;
  distance: number;
  deliveries: number;
  medals: MedalType[];
}

export function RankingPage() {
  const [rankings, setRankings] = useState<DriverRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [allMedals, setAllMedals] = useState<MedalType[]>([]);

  const loadRanking = useCallback(async () => {
    try {
      setLoading(true);
      const [driversRes, medalsRes] = await Promise.all([
        supabase
          .from('drivers')
          .select('id, name, pseudo, photo_url, avatar_url, status')
          .eq('is_active_driver', true),
        supabase
          .from('medals')
          .select('*, drivers!driver_id (id, name)')
          .eq('month', currentMonth)
          .eq('year', currentYear),
      ]);

      if (medalsRes.data) setAllMedals(medalsRes.data);

      if (driversRes.data) {
        // Load road sheets separately for the month
        const { data: sheetsData } = await supabase
          .from('road_sheets')
          .select('driver_id, total_distance, date')
          .gte('date', `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`)
          .lt('date', currentMonth === 12
            ? `${currentYear + 1}-01-01`
            : `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-01`
          );

        const sheetsByDriver: Record<string, { distance: number; count: number }> = {};
        (sheetsData || []).forEach((s: any) => {
          if (!sheetsByDriver[s.driver_id]) sheetsByDriver[s.driver_id] = { distance: 0, count: 0 };
          sheetsByDriver[s.driver_id].distance += Number(s.total_distance) || 0;
          sheetsByDriver[s.driver_id].count++;
        });

        const stats: DriverRanking[] = driversRes.data.map((d: any) => ({
          id: d.id,
          name: d.pseudo || d.name,
          photo_url: d.avatar_url || d.photo_url,
          distance: sheetsByDriver[d.id]?.distance || 0,
          deliveries: sheetsByDriver[d.id]?.count || 0,
          medals: medalsRes.data?.filter((m: any) => m.driver_id === d.id) || [],
        }));

        stats.sort((a, b) => b.distance - a.distance);
        setRankings(stats);
      }
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadRanking();
    const channel = supabase
      .channel('ranking_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'road_sheets' }, () => loadRanking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medals' }, () => loadRanking())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [loadRanking]);

  async function handleAwardMedals() {
    await supabase.rpc('award_monthly_medals', { target_month: currentMonth, target_year: currentYear });
    loadRanking();
  }

  function changeMonth(delta: number) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function getMonthName(month: number) {
    return new Date(2024, month - 1).toLocaleDateString('fr-FR', { month: 'long' });
  }

  const top3 = rankings.slice(0, 3).filter(r => r.distance > 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Classement</h1>
              <p className="text-dark-400">Performance des chauffeurs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadRanking()} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-dark-400" />
            </button>
            <button onClick={handleAwardMedals} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-lg font-medium">
              <Award className="w-5 h-5" />
              Attribuer medailles
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-dark-800 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-dark-400" />
          </button>
          <div className="text-center">
            <p className="text-2xl font-bold text-white capitalize">{getMonthName(currentMonth)}</p>
            <p className="text-dark-500">{currentYear}</p>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-dark-800 rounded-lg">
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Top 3 Podium */}
        {top3.length >= 1 && (
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {/* 2nd Place */}
            <div className="order-1 pt-8">
              {top3[1] && (
                <div className="bg-gradient-to-b from-gray-500/20 to-dark-900 border border-gray-500/30 rounded-2xl p-4 text-center">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mx-auto ring-4 ring-gray-500/50">
                      {top3[1].photo_url ? (
                        <img src={top3[1].photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Medal className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center border-2 border-dark-900">
                      <span className="text-sm font-bold text-white">2</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mt-3 truncate">{top3[1].name}</h3>
                  <p className="text-gray-400">{top3[1].distance.toLocaleString()} km</p>
                  <div className="flex justify-center mt-2">
                    <div className="w-8 h-8 bg-gray-500/20 rounded-lg flex items-center justify-center">
                      <Medal className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1st Place */}
            <div className="order-2">
              {top3[0] && (
                <div className="bg-gradient-to-b from-yellow-500/20 to-dark-900 border border-yellow-500/30 rounded-2xl p-4 text-center -mt-4 md:-mt-6">
                  <Crown className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <div className="relative inline-block">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-yellow-500/30 flex items-center justify-center overflow-hidden mx-auto ring-4 ring-yellow-500/50">
                      {top3[0].photo_url ? (
                        <img src={top3[0].photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-10 h-10 text-yellow-500" />
                      )}
                    </div>
                    <div className="absolute -top-1 -right-1 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-dark-900">
                      <Trophy className="w-5 h-5 text-dark-900" />
                    </div>
                  </div>
                  <h3 className="font-bold text-white mt-3 truncate text-lg">{top3[0].name}</h3>
                  <p className="text-yellow-500 font-semibold text-lg">{top3[0].distance.toLocaleString()} km</p>
                  <p className="text-sm text-dark-400">{top3[0].deliveries} trajets</p>
                  <div className="flex justify-center mt-2">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Medal className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3rd Place */}
            <div className="order-3 pt-12">
              {top3[2] && (
                <div className="bg-gradient-to-b from-orange-700/20 to-dark-900 border border-orange-700/30 rounded-2xl p-4 text-center">
                  <div className="relative inline-block">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-orange-800/50 flex items-center justify-center overflow-hidden mx-auto ring-4 ring-orange-700/50">
                      {top3[2].photo_url ? (
                        <img src={top3[2].photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Medal className="w-7 h-7 text-orange-400" />
                      )}
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 bg-orange-700 rounded-full flex items-center justify-center border-2 border-dark-900">
                      <span className="text-xs font-bold text-white">3</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mt-3 truncate">{top3[2].name}</h3>
                  <p className="text-orange-400">{top3[2].distance.toLocaleString()} km</p>
                  <div className="flex justify-center mt-2">
                    <div className="w-8 h-8 bg-orange-700/20 rounded-lg flex items-center justify-center">
                      <Medal className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Rankings */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-dark-800">
            <h2 className="text-lg font-semibold text-white">Classement complet</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-dark-400">Chargement...</div>
          ) : rankings.length === 0 ? (
            <div className="p-8 text-center text-dark-500">Aucun chauffeur actif</div>
          ) : (
            <div className="divide-y divide-dark-800">
              {rankings.map((driver, index) => {
                const medal = allMedals.find(m => m.driver_id === driver.id);
                return (
                  <div key={driver.id} className="p-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      medal?.type === 'gold' ? 'bg-yellow-500/20 text-yellow-500' :
                      medal?.type === 'silver' ? 'bg-gray-500/20 text-gray-400' :
                      medal?.type === 'bronze' ? 'bg-orange-700/20 text-orange-400' :
                      index < 3 ? 'bg-dark-700 text-dark-400' :
                      'bg-dark-800 text-dark-500'
                    }`}>
                      {medal ? <Medal className="w-5 h-5" /> : index + 1}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden">
                      {driver.photo_url ? (
                        <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-dark-400">{driver.name[0]}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate">{driver.name}</p>
                        {medal && (
                          <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                            medal.type === 'gold' ? 'bg-yellow-500/20 text-yellow-500' :
                            medal.type === 'silver' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-orange-700/20 text-orange-400'
                          }`}>
                            {medal.type === 'gold' ? 'Or' : medal.type === 'silver' ? 'Argent' : 'Bronze'}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-dark-500">{driver.deliveries} trajets</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-emerald-500">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">{driver.distance.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
