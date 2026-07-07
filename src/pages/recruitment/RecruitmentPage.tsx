import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/erp/PageHeader';
import { FormAlert, FormSuccess } from '../../components/erp/FormAlert';
import { RecruitmentForm } from '../../components/recruitment/RecruitmentForm';
import { RecruitmentInfoPanel } from '../../components/recruitment/RecruitmentInfoPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useMyApplication, useSubmitApplication } from '../../hooks/useRecruitment';
import type { RecruitmentFormInput } from '../../lib/recruitmentTypes';
import { STATUS_LABELS } from '../../lib/recruitmentTypes';

export function RecruitmentPage() {
  const { user, profile } = useAuth();
  const { data: application, isLoading } = useMyApplication(user?.id);
  const submitMutation = useSubmitApplication(user?.id, user?.email ?? profile?.email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPending = application?.status === 'pending';
  const isApproved = application?.status === 'approved';
  const readOnly = isPending || isApproved;

  async function handleSubmit(input: RecruitmentFormInput) {
    setError(null);
    try {
      await submitMutation.mutateAsync(input);
      setSuccess('Candidature envoyée au Bureau du PDG. Vous serez notifié sous 48–72 h.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Bureau du PDG"
          subtitle="Vous souhaitez rejoindre Z&D Thermoliner ? Remplissez le questionnaire ci-dessous."
          icon={Briefcase}
        />

        {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
        {success && <FormSuccess message={success} onDismiss={() => setSuccess(null)} />}

        {application && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${STATUS_LABELS[application.status].color}`}>
            Candidature : {STATUS_LABELS[application.status].label}
          </div>
        )}

        <div className="grid xl:grid-cols-[1fr_320px] gap-6">
          <div className="recruitment-office rounded-2xl p-4 sm:p-6">
            {isLoading ? (
              <div className="h-96 shimmer rounded-2xl" />
            ) : (
              <RecruitmentForm
                initial={application ?? undefined}
                readOnly={readOnly}
                saving={submitMutation.isPending}
                onSubmit={handleSubmit}
              />
            )}
          </div>
          <RecruitmentInfoPanel />
        </div>
      </div>
    </Layout>
  );
}
