'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileActionButtons } from '@/components/files/file-action-buttons';
import { FileActions } from '@/components/files/file-actions';
import type { WorkflowAction } from '@/lib/types';

export type FileForActionsPanel = {
  id: string;
  stage?: string | null;
  status: string;
  assignedDesignerId: string | null;
  targetAssigneeId?: string | null;
  assignedDesigner?: { fullName: string } | null;
  currentDepartment?: { code: string } | null;
  pendingTakeover?: boolean;
  requiresApproval?: boolean;
};

type FileActionsPanelProps = {
  file: FileForActionsPanel;
  fileId: string;
  currentUserId: string;
  availableWorkflowActions: WorkflowAction[];
  hasActiveTimer: boolean;
};

/**
 * Tek standart yer: Tüm departmanlar için aksiyonlar bu panelde gösterilir.
 * - PRE_REPRO: Ön Repro butonları (Devral, Devret, Geri Kuyruğa)
 * - REPRO / diğer: Workflow aksiyonları (Devral, Onaya Gönder, vb.)
 */
export function FileActionsPanel({
  file,
  fileId,
  currentUserId,
  availableWorkflowActions,
  hasActiveTimer,
}: FileActionsPanelProps) {
  const isPreRepro = file.stage === 'PRE_REPRO';
  const isOnReproDept = file.currentDepartment?.code === 'ONREPRO';
  const hideClaimOnDetail = isOnReproDept;

  const preReproButtons = (
    <FileActionButtons
      file={{
        id: file.id,
        assignedDesignerId: file.assignedDesignerId,
        targetAssigneeId: file.targetAssigneeId ?? null,
        assignedDesigner: file.assignedDesigner,
        stage: file.stage,
      }}
      currentUserId={currentUserId}
      size="default"
      hideClaimButton={hideClaimOnDetail}
    />
  );

  const workflowActions = (
    <FileActions fileId={fileId} availableActions={availableWorkflowActions} />
  );

  const hasWorkflowUi = !isPreRepro && availableWorkflowActions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>İşlemler</CardTitle>
      </CardHeader>
      <CardContent>
        {isPreRepro ? (
          preReproButtons ?? (
            <p className="text-sm text-muted-foreground">
              Bu dosyayı Ön Repro kuyruğu sayfasından devralabilirsiniz.
            </p>
          )
        ) : hasWorkflowUi ? (
          workflowActions
        ) : (
          <p className="text-sm text-muted-foreground">
            Bu dosyada şu an yapılabilecek işlem yok.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
