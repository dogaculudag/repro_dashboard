'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FileTimelineItem {
  id: string;
  displayTitle: string;
  timestampFormatted: string;
  byUserName: string;
  toDepartmentName: string | null;
}

export function FileTimelineCard({ items }: { items: FileTimelineItem[] }) {
  const [expandAll, setExpandAll] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Zaman Çizelgesi</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground shrink-0"
          onClick={() => setExpandAll((v) => !v)}
        >
          {expandAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Daralt
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Tümünü göster
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div
          className={`space-y-4 overflow-y-auto ${expandAll ? '' : 'max-h-[400px]'}`}
        >
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Henüz kayıt yok</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{item.displayTitle}</p>
                    <p className="text-sm text-muted-foreground shrink-0">
                      {item.timestampFormatted}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.byUserName}
                    {item.toDepartmentName && ` → ${item.toDepartmentName}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
