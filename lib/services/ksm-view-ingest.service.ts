import { Client } from 'pg';
import { prisma } from '@/lib/db';
import { FileStatus, Priority, Prisma, Stage } from '@prisma/client';
import { createAuditLog } from './audit.service';
import {
  getSourceRefIdFromRaw,
  rawToNormalized,
  type KsmTechnicalData,
} from '@/lib/ksm-technical-data';
import { getNextFileNo } from './file.service';

const DEFAULT_VIEW_NAME = 'ksm_technical_view';
function getViewName(): string {
  const name = process.env.KSM_VIEW_NAME ?? DEFAULT_VIEW_NAME;
  if (!/^[a-zA-Z0-9_.]+$/.test(name)) return DEFAULT_VIEW_NAME;
  return name;
}
const EXTERNAL_DB_URL = process.env.KSM_VIEW_DATABASE_URL ?? process.env.EXTERNAL_DATABASE_URL;

export interface IngestResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Find file id by ksmTechnicalData.raw.source_ref_id (or equivalent key).
 */
async function findFileIdBySourceRefId(sourceRefId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM files
    WHERE ksm_technical_data->'raw'->>'source_ref_id' = ${sourceRefId}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/**
 * Convert VIEW row (with possible Date/bigint etc.) to plain object for JSONB.
 */
function rowToRaw(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = v;
    } else if (typeof v === 'object' && 'toISOString' in (v as object)) {
      out[k] = (v as Date).toISOString();
    } else if (typeof v === 'bigint') {
      out[k] = String(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Ingest from external VIEW: SELECT * and upsert files by source_ref_id.
 * - New row -> create file with raw + normalized, status AWAITING_ASSIGNMENT.
 * - Existing source_ref_id -> update only raw (normalized preserved).
 * @param byUserId Optional user id for audit log when creating files (e.g. admin who triggered ingest).
 */
export async function ingestFromKsmView(byUserId?: string): Promise<IngestResult> {
  const result: IngestResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  if (!EXTERNAL_DB_URL) {
    result.errors.push('KSM_VIEW_DATABASE_URL or EXTERNAL_DATABASE_URL is not set');
    return result;
  }

  const client = new Client({ connectionString: EXTERNAL_DB_URL });
  try {
    await client.connect();
    const viewName = getViewName();
    const res = await client.query(`SELECT * FROM "${viewName}"`);
    const rows = res.rows as Record<string, unknown>[];

    const onreproDept = await prisma.department.findUnique({
      where: { code: 'ONREPRO' },
    });
    if (!onreproDept) {
      result.errors.push('Önrepro departmanı bulunamadı');
      return result;
    }

    const genelFileType = await prisma.fileType.findFirst({
      where: { name: 'GENEL' },
    });

    for (const row of rows) {
      const raw = rowToRaw(row);
      const sourceRefId = getSourceRefIdFromRaw(raw);
      if (!sourceRefId) {
        result.skipped += 1;
        continue;
      }

      const existingId = await findFileIdBySourceRefId(sourceRefId);
      if (existingId) {
        const existing = await prisma.file.findUnique({
          where: { id: existingId },
          select: { ksmTechnicalData: true },
        });
        const current = (existing?.ksmTechnicalData ?? {}) as KsmTechnicalData;
        const updated: KsmTechnicalData = {
          raw,
          normalized: current.normalized ?? rawToNormalized(raw),
        };
        await prisma.file.update({
          where: { id: existingId },
          data: { ksmTechnicalData: updated as unknown as Prisma.JsonObject },
        });
        result.updated += 1;
      } else {
        const normalized = rawToNormalized(raw);
        const customerName =
          (normalized.customer_name as string)?.trim() ||
          (raw.customer_name != null ? String(raw.customer_name) : '') ||
          sourceRefId;
        const fileNo = await getNextFileNo();
        const ksmTechnicalData: KsmTechnicalData = { raw, normalized };
        const file = await prisma.file.create({
          data: {
            fileNo,
            customerName: customerName.slice(0, 200),
            sapNumber: (normalized.sap_no as string)?.slice(0, 50) ?? undefined,
            orderName: (normalized.order_name as string)?.slice(0, 200) ?? undefined,
            designNo: (normalized.design_no as string)?.slice(0, 50) ?? undefined,
            revisionNo: (normalized.revision_no as string)?.slice(0, 50) ?? undefined,
            ksmTechnicalData: ksmTechnicalData as unknown as Prisma.JsonObject,
            status: FileStatus.AWAITING_ASSIGNMENT,
            stage: Stage.PRE_REPRO,
            assignedDesignerId: null,
            targetAssigneeId: null,
            currentDepartmentId: onreproDept.id,
            fileTypeId: genelFileType?.id ?? undefined,
            difficultyLevel: 3,
            difficultyWeight: 1.0,
            requiresApproval: true,
            priority: Priority.NORMAL,
          },
        });
        if (byUserId) {
          await createAuditLog({
            fileId: file.id,
            actionType: 'CREATE',
            byUserId,
            toDepartmentId: onreproDept.id,
            payload: { fileNo: file.fileNo, customerName: file.customerName, source: 'ksm_view_ingest' },
          });
        }
        result.created += 1;
      }
    }
  } catch (e) {
    result.errors.push((e as Error).message);
  } finally {
    await client.end();
  }

  return result;
}
