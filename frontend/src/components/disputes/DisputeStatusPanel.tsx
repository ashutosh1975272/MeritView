'use client';

type Party = {
  id: string;
  role: 'INITIATOR' | 'RESPONDENT' | string;
  userId?: string | null;
  invitationEmail?: string | null;
  invitationStatus?: string | null;
  briefStatus?: string | null;
};

type Payment = {
  id: string;
  status: string;
  amountUsd?: string | number;
  userId?: string;
};

type Dispute = {
  id: string;
  state: string;
  title: string;
  category?: string;
  pricingTier?: string;
  priceUsd?: string | number;
  initiatorUserId?: string;
  parties?: Party[];
  payments?: Payment[];
};

function formatLabel(value?: string | null) {
  return value ? value.replace(/_/g, ' ').toLowerCase() : 'not available';
}

function StatusPill({ value, tone = 'gray' }: { value?: string | null; tone?: 'green' | 'blue' | 'yellow' | 'purple' | 'gray' | 'red' }) {
  const tones = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${tones[tone]}`}>
      {formatLabel(value)}
    </span>
  );
}

export function DisputeStatusPanel({ dispute, currentUserId }: { dispute: Dispute; currentUserId?: string }) {
  const parties = dispute.parties || [];
  const payments = dispute.payments || [];
  const paidPayment = payments.find((payment) => payment.status === 'SUCCEEDED');
  const currentParty = parties.find((party) => party.userId === currentUserId);
  const initiator = parties.find((party) => party.role === 'INITIATOR');
  const respondent = parties.find((party) => party.role === 'RESPONDENT');
  const respondentStatus = respondent?.invitationStatus || 'NOT_SENT';
  const respondentLabel =
    respondentStatus === 'ACCEPTED' ? 'Joined' :
    respondentStatus === 'PENDING' ? 'Invited' :
    respondentStatus === 'EXPIRED' ? 'Expired' :
    respondentStatus === 'DECLINED' ? 'Declined' : 'Not invited';

  const bothBriefsSubmitted = parties.length >= 2 && parties.every((party) => party.briefStatus === 'SUBMITTED');
  const waitingFor = parties.filter((party) => party.briefStatus !== 'SUBMITTED').map((party) => party.role).join(', ');

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">Shared Dispute Status</h2>
        <p className="text-xs text-muted-foreground mt-1">Visible to both parties. Private drafts and AI chats stay private.</p>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Overall state</span>
          <StatusPill value={dispute.state} tone={dispute.state === 'COMPLETED' ? 'green' : dispute.state === 'UNDER_ANALYSIS' ? 'blue' : 'purple'} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Your role</span>
          <StatusPill value={currentParty?.role || 'viewer'} tone={currentParty?.role === 'INITIATOR' ? 'blue' : 'purple'} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Counterparty</span>
          <StatusPill value={respondentLabel} tone={respondentStatus === 'ACCEPTED' ? 'green' : respondentStatus === 'PENDING' ? 'blue' : respondentStatus === 'EXPIRED' || respondentStatus === 'DECLINED' ? 'gray' : 'gray'} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Payment</span>
          <StatusPill value={paidPayment ? `paid $${Number(paidPayment.amountUsd || dispute.priceUsd || 0).toFixed(2)}` : 'not paid'} tone={paidPayment ? 'green' : 'yellow'} />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Parties</h3>
        {[initiator, respondent].filter(Boolean).map((party) => (
          <div key={party!.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium capitalize">{formatLabel(party!.role)}</span>
              <StatusPill value={party!.briefStatus || 'not started'} tone={party!.briefStatus === 'SUBMITTED' ? 'green' : party!.briefStatus === 'IN_PROGRESS' ? 'yellow' : 'gray'} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {party!.role === 'RESPONDENT'
                ? (party!.invitationStatus === 'ACCEPTED'
                    ? 'Joined'
                    : party!.invitationStatus === 'PENDING'
                      ? `Invited to ${party!.invitationEmail || 'counterparty'}`
                      : party!.invitationStatus === 'EXPIRED'
                        ? 'Invitation expired'
                        : party!.invitationEmail || 'Not invited')
                : party!.userId === currentUserId ? 'You' : 'Initiator'}
            </p>
            {party!.role === 'RESPONDENT' && party!.invitationStatus && (
              <div className="mt-2"><StatusPill value={`invite ${party!.invitationStatus}`} tone={party!.invitationStatus === 'ACCEPTED' ? 'green' : party!.invitationStatus === 'PENDING' ? 'blue' : 'gray'} /></div>
            )}
          </div>
        ))}
        {!respondent && <p className="text-xs text-muted-foreground">No counterparty yet. The initiator can invite someone anytime from the workspace.</p>}
      </div>

      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        {dispute.state === 'COMPLETED' ? 'Opinion is ready for both parties.' :
          dispute.state === 'UNDER_ANALYSIS' ? 'Both briefs are submitted. Evaluators are generating the opinion.' :
          bothBriefsSubmitted ? 'Both briefs are submitted. Analysis should begin shortly.' :
          waitingFor ? `Waiting for brief from: ${formatLabel(waitingFor)}.` :
          'Waiting for both parties to complete the required steps.'}
      </div>
    </aside>
  );
}
