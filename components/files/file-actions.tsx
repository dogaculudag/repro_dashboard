'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import type { WorkflowAction } from '@/lib/types';
import {
  Play,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Factory,
  MessageSquare,
  Loader2,
} from 'lucide-react';

interface FileActionsProps {
  fileId: string;
  availableActions: WorkflowAction[];
  qualityNokReturn?: boolean;
}

const ACTION_CONFIG: Record<WorkflowAction, {
  label: string;
  icon: any;
  variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary';
  requiresNote: boolean;
  noteLabel?: string;
}> = {
  ASSIGN: { label: 'Ata', icon: Send, variant: 'default', requiresNote: false },
  TAKEOVER: { label: 'Devral', icon: Play, variant: 'default', requiresNote: false },
  REQUEST_APPROVAL: { label: 'Onaya Gönder', icon: Send, variant: 'default', requiresNote: false },
  SEND_TO_CUSTOMER: { label: 'Müşteriye Gönder', icon: Send, variant: 'default', requiresNote: false },
  CUSTOMER_OK: { label: 'Müşteri Onayladı', icon: CheckCircle, variant: 'success', requiresNote: false },
  CUSTOMER_NOK: { label: 'Müşteri Reddetti', icon: XCircle, variant: 'destructive', requiresNote: true, noteLabel: 'Red nedeni (zorunlu)' },
  RESTART_MG: { label: 'MG Yeniden Başlat', icon: RotateCcw, variant: 'warning', requiresNote: true, noteLabel: 'Açıklama (zorunlu)' },
  QUALITY_OK: { label: 'Kalite Onayladı', icon: CheckCircle, variant: 'success', requiresNote: false },
  QUALITY_NOK: { label: 'Kalite Reddetti', icon: XCircle, variant: 'destructive', requiresNote: true, noteLabel: 'Red nedeni (zorunlu)' },
  DIRECT_TO_QUALITY: { label: 'Kaliteye Gönder', icon: Send, variant: 'default', requiresNote: false },
  SEND_TO_PRODUCTION: { label: 'Üretime Gönder', icon: Factory, variant: 'success', requiresNote: false },
  ADD_NOTE: { label: 'Not Ekle', icon: MessageSquare, variant: 'secondary', requiresNote: true, noteLabel: 'Not' },
  TRANSFER: { label: 'Transfer Et', icon: Send, variant: 'default', requiresNote: false },
};

export function FileActions({ fileId, availableActions, qualityNokReturn }: FileActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const handleAction = async (action: WorkflowAction) => {
    const config = ACTION_CONFIG[action];
    
    if (config.requiresNote && !showNoteFor) {
      setShowNoteFor(action);
      return;
    }

    if (config.requiresNote && !note.trim()) {
      toast({
        title: 'Hata',
        description: 'Not alanı zorunludur',
        variant: 'destructive',
      });
      return;
    }

    setLoading(action);

    try {
      const response = await fetch(`/api/files/${fileId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'İşlem başarısız');
      }

      toast({
        title: 'Başarılı',
        description: 'İşlem tamamlandı',
        variant: 'default',
      });

      setShowNoteFor(null);
      setNote('');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const filteredActions = availableActions.filter(a => a !== 'ADD_NOTE' && a !== 'ASSIGN' && a !== 'TRANSFER');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filteredActions.map((action) => {
          const config = ACTION_CONFIG[action];
          const Icon = config.icon;
          const isLoading = loading === action;
          const label =
            action === 'REQUEST_APPROVAL' && qualityNokReturn === true
              ? 'Kolaja Gönder'
              : config.label;

          return (
            <Button
              key={action}
              variant={config.variant as any}
              onClick={() => handleAction(action)}
              disabled={isLoading || loading !== null}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              {label}
            </Button>
          );
        })}
      </div>

      {showNoteFor && (
        <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
          <label className="text-sm font-medium">
            {ACTION_CONFIG[showNoteFor as WorkflowAction].noteLabel}
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Açıklama yazın..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => handleAction(showNoteFor as WorkflowAction)}
              disabled={loading !== null}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Onayla
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteFor(null);
                setNote('');
              }}
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Add Note */}
      {availableActions.includes('ADD_NOTE') && !showNoteFor && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setShowNoteFor('ADD_NOTE')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Not Ekle
          </Button>
        </div>
      )}
    </div>
  );
}
