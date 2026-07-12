import { useMemo, useState } from 'react';

import { Plus, Route, X } from 'lucide-react';

import { Layout } from '../components/Layout';

import { EmptyState } from '../components/erp/EmptyState';

import { FormAlert, FormSuccess } from '../components/erp/FormAlert';

import { KpiCard } from '../components/erp/KpiCard';

import { KpiGrid } from '../components/erp/KpiGrid';

import { PageHeader } from '../components/erp/PageHeader';

import { SkeletonList } from '../components/erp/Skeleton';

import { RoadSheetForm } from '../components/road-sheets/RoadSheetForm';

import { RoadSheetList } from '../components/road-sheets/RoadSheetList';

import { useAuth } from '../contexts/AuthContext';

import { canApproveRoadSheets, canUserEditRoadSheet } from '../lib/roadSheetAccess';

import {

  useCreateRoadSheet,

  useDeleteRoadSheet,

  useFleetOptions,

  useRejectRoadSheet,

  useRoadSheetsQuery,

  useUpdateRoadSheet,

  useValidateRoadSheet,

} from '../hooks/useRoadSheets';

import type { RoadSheetFormData } from '../services/roadSheetService';

import {

  resolveDriverForInsertAsync,

  roadSheetToFormData,

} from '../services/roadSheetService';

import type { RoadSheet } from '../lib/supabase';



export function RoadSheetsPage() {

  const { user, profile, isAdministrator } = useAuth();

  const canValidateSheets = canApproveRoadSheets(profile);

  const [showModal, setShowModal] = useState(false);

  const [editingSheet, setEditingSheet] = useState<RoadSheet | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);



  const { data: sheets = [], isLoading } = useRoadSheetsQuery(!!user);

  const { drivers, trucks } = useFleetOptions();



  const linkedDriverIds = useMemo(

    () => drivers.filter(d => d.user_id === user?.id).map(d => d.id),

    [drivers, user?.id],

  );



  const createMutation = useCreateRoadSheet(user?.id);

  const updateMutation = useUpdateRoadSheet(user?.id);

  const validateMutation = useValidateRoadSheet(user?.id);

  const rejectMutation = useRejectRoadSheet(user?.id);

  const deleteMutation = useDeleteRoadSheet();



  const now = new Date();

  const monthlyKm = sheets

    .filter(s => {

      const d = new Date(s.date);

      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

    })

    .reduce((sum, s) => sum + (s.km || s.total_distance || 0), 0);



  const validatedCount = sheets.filter(s => s.validated).length;

  const pendingCount = sheets.filter(s => !s.validated && s.status !== 'rejected').length;



  function canEditSheet(sheet: RoadSheet) {

    if (!user?.id) return false;

    return canUserEditRoadSheet(sheet, user.id, isAdministrator, linkedDriverIds);

  }



  async function handleCreate(form: RoadSheetFormData, photoFile: File | null): Promise<void> {

    if (!user?.id) {

      throw new Error('Vous devez être connecté pour enregistrer une feuille de route.');

    }



    setPageError(null);



    const resolved = await resolveDriverForInsertAsync(form, drivers, user.id);

    if (!resolved) {

      throw new Error(

        'Sélectionnez un chauffeur dans la liste. Si aucun n\'apparaît, créez-en un dans le module Chauffeurs.',

      );

    }



    const payload: RoadSheetFormData = {

      ...form,

      driver_id: resolved.driverId,

      truck_id: form.truck_id || drivers.find(d => d.id === resolved.driverId)?.truck_id || '',

    };



    const created = await createMutation.mutateAsync({

      form: payload,

      driverName: resolved.driverName,

      driverUserId: resolved.driverUserId,

      photoFile,

    });



    if (!created?.id) {

      throw new Error('La feuille de route n\'a pas pu être confirmée après l\'enregistrement.');

    }



    const routeLabel = `${created.departure || created.departure_city || '?'} → ${created.arrival || created.arrival_city || '?'}`;

    setSuccessMessage(`Feuille de route enregistrée : ${routeLabel}`);

    setTimeout(() => setSuccessMessage(null), 5000);

    setShowModal(false);

  }



  async function handleUpdate(form: RoadSheetFormData, photoFile: File | null): Promise<void> {

    if (!user?.id || !editingSheet) {

      throw new Error('Modification impossible.');

    }



    setPageError(null);



    const resolved = await resolveDriverForInsertAsync(form, drivers, user.id);

    if (!resolved) {

      throw new Error('Sélectionnez un chauffeur valide.');

    }



    const payload: RoadSheetFormData = {

      ...form,

      driver_id: resolved.driverId,

      truck_id: form.truck_id || drivers.find(d => d.id === resolved.driverId)?.truck_id || '',

    };



    await updateMutation.mutateAsync({

      sheetId: editingSheet.id,

      form: payload,

      driverName: resolved.driverName,

      driverUserId: resolved.driverUserId,

      photoFile,

    });



    setSuccessMessage('Feuille de route mise à jour.');

    setTimeout(() => setSuccessMessage(null), 5000);

    setEditingSheet(null);

  }



  function handleValidate(sheet: RoadSheet) {

    if (!canValidateSheets || sheet.validated) return;

    setPageError(null);

    validateMutation.mutate(sheet, {

      onSuccess: (result) => {

        if (result.bankSyncFailed) {

          setSuccessMessage('Feuille validée, mais synchronisation bancaire échouée.');

        } else {

          setSuccessMessage('Feuille de route validée — comptabilité mise à jour.');

        }

        setTimeout(() => setSuccessMessage(null), 5000);

      },

      onError: (err: Error) => setPageError(err.message),

    });

  }



  function handleReject(sheetId: string, reason: string) {

    if (!canValidateSheets) return;

    setPageError(null);

    rejectMutation.mutate(

      { sheetId, reason },

      {

        onError: (err: Error) => setPageError(err.message),

      },

    );

  }



  function handleDelete(id: string) {

    if (!isAdministrator) return;

    setPageError(null);

    deleteMutation.mutate(id, {

      onError: (err: Error) => setPageError(err.message),

    });

  }



  return (

    <Layout>

      <div className="space-y-6">

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.02] transition-transform duration-500"
            style={{ backgroundImage: "url('/images/road-sheet-salon.jpg')" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(217,25,32,0.24),_transparent_38%),linear-gradient(90deg,rgba(6,6,6,0.95)_0%,rgba(6,6,6,0.75)_55%,rgba(6,6,6,0.4)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.03)_100%)]" />
          <div className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-red-500/20 blur-3xl" />
          <div className="relative flex min-h-[280px] flex-col justify-center px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-300 shadow-[0_0_20px_rgba(217,25,32,0.08)]">
                <Route className="h-3.5 w-3.5" />
                Transport & suivi
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black tracking-[0.16em] text-white sm:text-4xl lg:text-[2.5rem]">
                  FEUILLES DE ROUTE
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Gérez et suivez toutes les missions de transport de Z&D Thermoliner.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-[24px] border border-white/10 bg-[#0f0f0f]/80 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.2)]">
          <PageHeader

            icon={Route}

            title="Feuilles de route"

            subtitle={

              isAdministrator

                ? `${sheets.length} feuille${sheets.length !== 1 ? 's' : ''} — Validation administrateur`

                : `${sheets.length} feuille${sheets.length !== 1 ? 's' : ''} — Vos feuilles en attente de validation`

            }

            actions={

              <button

                type="button"

                onClick={() => setShowModal(true)}

                className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"

              >

                <Plus className="w-4 h-4" />

                Nouvelle feuille

              </button>

            }

          />
        </div>



        {successMessage && (

          <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />

        )}

        {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}



        <KpiGrid columns="4">

          <KpiCard

            label="Total feuilles"

            value={String(sheets.length)}

            icon={Route}

            color="#ef4444"

            glow="#ef4444"

            loading={isLoading}

          />

          <KpiCard

            label="Km ce mois"

            value={`${monthlyKm.toLocaleString()} km`}

            icon={Route}

            color="#3b82f6"

            glow="#3b82f6"

            loading={isLoading}

          />

          <KpiCard

            label="Validées"

            value={String(validatedCount)}

            icon={Route}

            color="#34d399"

            glow="#34d399"

            loading={isLoading}

          />

          <KpiCard

            label="En attente"

            value={String(pendingCount)}

            icon={Route}

            color="#fbbf24"

            glow="#fbbf24"

            loading={isLoading}

          />

        </KpiGrid>



        {isLoading ? (

          <div className="card-premium p-6">

            <SkeletonList count={4} height="h-16" />

          </div>

        ) : sheets.length === 0 ? (

          <div className="card-premium p-8">
            <div className="max-w-lg mx-auto">
              <img src="/images/road-sheet-salon.jpg" alt="Feuille de route" className="mx-auto mb-4 w-full max-w-md rounded-lg object-cover" />
              <EmptyState
                icon={Route}
                title="Aucune feuille de route"
                description="Créez votre première feuille pour commencer le suivi financier."
              />
            </div>
          </div>

        ) : (

          <RoadSheetList

            sheets={sheets}

            drivers={drivers}

            trucks={trucks}

            isAdministrator={isAdministrator}
            canValidate={canValidateSheets}

            currentUserId={user?.id}

            canEditSheet={canEditSheet}

            onValidate={handleValidate}

            onReject={handleReject}

            onEdit={setEditingSheet}

            onDelete={handleDelete}

            validating={validateMutation.isPending}

            rejecting={rejectMutation.isPending}

          />

        )}

      </div>



      {showModal && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div

            className="bg-dark-900 border rounded-2xl w-full max-w-2xl my-4 max-h-[92vh] flex flex-col"

            style={{ borderColor: 'rgba(255,255,255,0.07)' }}

          >

            <div

              className="p-4 border-b flex items-center justify-between shrink-0 bg-dark-900 z-10 rounded-t-2xl"

              style={{ borderColor: 'rgba(255,255,255,0.06)' }}

            >

              <div>

                <h2 className="font-bold text-white">Nouvelle feuille de route</h2>

                <p className="text-xs text-white/30 mt-0.5">Calculs automatiques en temps réel</p>

              </div>

              <button

                type="button"

                onClick={() => setShowModal(false)}

                className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center"

              >

                <X className="w-4 h-4 text-white/40" />

              </button>

            </div>

            <div className="overflow-y-auto flex-1 min-h-0">

            <RoadSheetForm

              drivers={drivers}

              trucks={trucks}

              currentUserId={user?.id}

              defaultDriverName={profile?.pseudo || profile?.full_name}

              saving={createMutation.isPending}

              onSubmit={handleCreate}

              onCancel={() => setShowModal(false)}

              onError={message => setPageError(message)}

            />

            </div>

          </div>

        </div>

      )}



      {editingSheet && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div

            className="bg-dark-900 border rounded-2xl w-full max-w-2xl my-4 max-h-[92vh] flex flex-col"

            style={{ borderColor: 'rgba(255,255,255,0.07)' }}

          >

            <div

              className="p-4 border-b flex items-center justify-between shrink-0 bg-dark-900 z-10 rounded-t-2xl"

              style={{ borderColor: 'rgba(255,255,255,0.06)' }}

            >

              <div>

                <h2 className="font-bold text-white">Modifier la feuille de route</h2>

                <p className="text-xs text-white/30 mt-0.5">Modification possible tant qu&apos;elle est en attente</p>

              </div>

              <button

                type="button"

                onClick={() => setEditingSheet(null)}

                className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center"

              >

                <X className="w-4 h-4 text-white/40" />

              </button>

            </div>

            <div className="overflow-y-auto flex-1 min-h-0">

            <RoadSheetForm

              key={editingSheet.id}

              drivers={drivers}

              trucks={trucks}

              currentUserId={user?.id}

              initialForm={roadSheetToFormData(editingSheet)}

              submitLabel="Enregistrer les modifications"

              saving={updateMutation.isPending}

              onSubmit={handleUpdate}

              onCancel={() => setEditingSheet(null)}

              onError={message => setPageError(message)}

            />

            </div>

          </div>

        </div>

      )}

    </Layout>

  );

}

