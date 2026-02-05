'use client';

import { PreReproDevralButton } from './pre-repro-devral-button';
import { PreReproDevretButton } from './pre-repro-devret-button';
import { PreReproReturnButton } from './pre-repro-return-button';

type PreReproActionsProps = {
  fileId: string;
  assignedDesignerId: string | null;
  targetAssigneeId: string | null;
  currentUserId: string;
  claimedByFullName?: string | null;
};

export function PreReproActions({
  fileId,
  assignedDesignerId,
  targetAssigneeId,
  currentUserId,
  claimedByFullName,
}: PreReproActionsProps) {
  if (assignedDesignerId == null) {
    return <PreReproDevralButton fileId={fileId} />;
  }
  if (assignedDesignerId === currentUserId) {
    if (targetAssigneeId) {
      return (
        <div className="flex items-center gap-2">
          <PreReproDevretButton fileId={fileId} />
          <PreReproReturnButton fileId={fileId} />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Hedef kişi atanmadığı için devredemezsiniz
        </span>
        <PreReproReturnButton fileId={fileId} />
      </div>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">
      Başka biri devraldı{claimedByFullName ? ` (${claimedByFullName})` : ''}
    </span>
  );
}
