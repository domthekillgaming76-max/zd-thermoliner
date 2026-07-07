import { useState, useEffect } from 'react';
import { Truck, Send, CheckCircle, Clock, AlertCircle, User, Mail, Calendar, Gamepad2, MessageSquare, Truck as TruckIcon, Clock as ClockIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, RecruitmentApplication } from '../lib/supabase';

export function JoinPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<RecruitmentApplication | null>(null);
  const [formData, setFormData] = useState({
    pseudo: '',
    age: '',
    ets2_experience: '',
    has_trucksbook: false,
    trucksbook_profile: '',
    discord: '',
    motivation: '',
    preferred_truck: '',
    availability: '',
  });

  useEffect(() => {
    if (user) {
      loadExistingApplication();
    }
  }, [user]);

  async function loadExistingApplication() {
    try {
      const { data } = await supabase
        .from('recruitment_applications')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data) {
        setExistingApplication(data);
        setFormData({
          pseudo: data.pseudo,
          age: data.age.toString(),
          ets2_experience: data.ets2_experience,
          has_trucksbook: data.has_trucksbook,
          trucksbook_profile: data.trucksbook_profile || '',
          discord: data.discord,
          motivation: data.motivation,
          preferred_truck: data.preferred_truck || '',
          availability: data.availability || '',
        });
      }
    } catch (error) {
      console.error('Error loading application:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const applicationData = {
        user_id: user.id,
        pseudo: formData.pseudo.trim(),
        email: user.email!,
        age: parseInt(formData.age),
        ets2_experience: formData.ets2_experience.trim(),
        has_trucksbook: formData.has_trucksbook,
        trucksbook_profile: formData.trucksbook_profile.trim() || null,
        discord: formData.discord.trim(),
        motivation: formData.motivation.trim(),
        preferred_truck: formData.preferred_truck.trim() || null,
        availability: formData.availability.trim() || null,
        status: 'pending',
      };

      const { error } = await supabase
        .from('recruitment_applications')
        .upsert(applicationData, { onConflict: 'user_id' });

      if (!error) {
        await supabase.from('profiles').update({ application_status: 'pending' }).eq('id', user.id);
        loadExistingApplication();
      }
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Show status if already applied
  if (existingApplication && existingApplication.status !== 'pending') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center">
          {existingApplication.status === 'approved' ? (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Candidature acceptee!</h1>
              <p className="text-dark-400">Bienvenue chez Z&D Thermoliner!</p>
              <p className="text-dark-400 mt-4">Vous pouvez maintenant acceder a l'application.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-primary-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Candidature refusee</h1>
              <p className="text-dark-400">Votre candidature n'a pas ete acceptee cette fois-ci.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Rejoignez Z&D Thermoliner</h1>
          <p className="text-dark-400">Veuillez remplir ce formulaire pour postuler chez nous</p>
        </div>

        {/* Application Status Banner */}
        {existingApplication?.status === 'pending' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <Clock className="w-8 h-8 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-500">Candidature en attente</p>
              <p className="text-sm text-dark-400">Votre candidature est en cours d'examen par le PDG.</p>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Pseudo *
                </label>
                <input
                  type="text"
                  value={formData.pseudo}
                  onChange={e => setFormData(prev => ({ ...prev, pseudo: e.target.value }))}
                  required
                  placeholder="Votre pseudo ETS2"
                  disabled={existingApplication?.status === 'pending'}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  required
                  min={16}
                  max={99}
                  placeholder="Votre age"
                  disabled={existingApplication?.status === 'pending'}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-4 py-3 bg-dark-700 border border-dark-700 rounded-xl text-dark-400 cursor-not-allowed"
              />
            </div>

            {/* ETS2 Experience */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Gamepad2 className="w-4 h-4 inline mr-2" />
                Experience ETS2 *
              </label>
              <textarea
                value={formData.ets2_experience}
                onChange={e => setFormData(prev => ({ ...prev, ets2_experience: e.target.value }))}
                required
                placeholder="Depuis combien de temps jouez-vous a ETS2? Quelles sont vos experiences?"
                rows={3}
                disabled={existingApplication?.status === 'pending'}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none disabled:opacity-50"
              />
            </div>

            {/* TrucksBook */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="has_trucksbook"
                  checked={formData.has_trucksbook}
                  onChange={e => setFormData(prev => ({ ...prev, has_trucksbook: e.target.checked }))}
                  disabled={existingApplication?.status === 'pending'}
                  className="w-5 h-5 bg-dark-800 border border-dark-600 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-900"
                />
                <label htmlFor="has_trucksbook" className="text-white">
                  J'ai un compte TrucksBook
                </label>
              </div>
              {formData.has_trucksbook && (
                <input
                  type="text"
                  value={formData.trucksbook_profile}
                  onChange={e => setFormData(prev => ({ ...prev, trucksbook_profile: e.target.value }))}
                  placeholder="Lien vers votre profil TrucksBook"
                  disabled={existingApplication?.status === 'pending'}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                />
              )}
            </div>

            {/* Discord */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Discord *
              </label>
              <input
                type="text"
                value={formData.discord}
                onChange={e => setFormData(prev => ({ ...prev, discord: e.target.value }))}
                required
                placeholder="Votre pseudo Discord (ex: Pseudo#1234)"
                disabled={existingApplication?.status === 'pending'}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
              />
            </div>

            {/* Preferred Truck */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <TruckIcon className="w-4 h-4 inline mr-2" />
                Camion prefere
              </label>
              <input
                type="text"
                value={formData.preferred_truck}
                onChange={e => setFormData(prev => ({ ...prev, preferred_truck: e.target.value }))}
                placeholder="Ex: Scania S730, Volvo FH16..."
                disabled={existingApplication?.status === 'pending'}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <ClockIcon className="w-4 h-4 inline mr-2" />
                Disponibilites
              </label>
              <input
                type="text"
                value={formData.availability}
                onChange={e => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                placeholder="Ex: Soirs en semaine, week-ends..."
                disabled={existingApplication?.status === 'pending'}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
              />
            </div>

            {/* Motivation */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Motivation *
              </label>
              <textarea
                value={formData.motivation}
                onChange={e => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                required
                placeholder="Pourquoi souhaitez-vous rejoindre Z&D Thermoliner?"
                rows={4}
                disabled={existingApplication?.status === 'pending'}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-6 border-t border-dark-800">
            {existingApplication?.status === 'pending' ? (
              <div className="text-center text-dark-400">
                <p>Votre candidature est en cours d'examen.</p>
                <p className="text-sm mt-2">Vous serez notifie des qu'une decision sera prise.</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
