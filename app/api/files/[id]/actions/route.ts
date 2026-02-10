import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileById, assignFile, takeoverFile } from '@/lib/services/file.service';
import {
  requestApproval,
  sendToCustomer,
  customerOk,
  customerNok,
  restartMg,
  qualityOk,
  qualityNok,
  directToQuality,
  sendToProduction,
} from '@/lib/services/workflow.service';
import { addNote } from '@/lib/services/note.service';
import { canPerformAction } from '@/lib/rbac';
import { userHasActiveTimer } from '@/lib/services/timer.service';
import { assignFileSchema, takeoverSchema, nokNoteSchema, restartMgSchema, simpleActionSchema, addNoteActionSchema } from '@/lib/validations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    const file = await getFileById(params.id);
    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dosya bulunamadı' } },
        { status: 404 }
      );
    }

    const hasTimer = await userHasActiveTimer(params.id, session.user.id);

    // Check permission
    if (!canPerformAction(session.user, action, file, hasTimer)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
        { status: 403 }
      );
    }

    let result;

    switch (action) {
      case 'ASSIGN': {
        const validated = assignFileSchema.parse(data);
        result = await assignFile(params.id, validated.designerId, session.user.id, validated.note);
        break;
      }

      case 'TAKEOVER': {
        const validated = takeoverSchema.parse(data);
        result = await takeoverFile(
          params.id,
          session.user.id,
          session.user.departmentId,
          validated.note
        );
        break;
      }

      case 'REQUEST_APPROVAL': {
        const validated = simpleActionSchema.parse(data);
        result = await requestApproval(params.id, session.user.id, validated.note);
        break;
      }

      case 'SEND_TO_CUSTOMER': {
        const validated = simpleActionSchema.parse(data);
        result = await sendToCustomer(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'CUSTOMER_OK': {
        const validated = simpleActionSchema.parse(data);
        result = await customerOk(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'CUSTOMER_NOK': {
        const validated = nokNoteSchema.parse(data);
        result = await customerNok(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'RESTART_MG': {
        const validated = restartMgSchema.parse(data);
        result = await restartMg(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'QUALITY_OK': {
        const validated = simpleActionSchema.parse(data);
        result = await qualityOk(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'QUALITY_NOK': {
        const validated = nokNoteSchema.parse(data);
        result = await qualityNok(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'DIRECT_TO_QUALITY': {
        const validated = simpleActionSchema.parse(data);
        result = await directToQuality(params.id, session.user.id, validated.note);
        break;
      }

      case 'SEND_TO_PRODUCTION': {
        const validated = simpleActionSchema.parse(data);
        result = await sendToProduction(params.id, session.user.id, session.user.departmentId, validated.note);
        break;
      }

      case 'ADD_NOTE': {
        const validated = addNoteActionSchema.parse(data);
        if (!session.user.departmentId) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Kullanıcı departmana atanmamış' } },
            { status: 422 }
          );
        }
        result = await addNote(
          params.id,
          session.user.id,
          session.user.departmentId,
          validated.note
        );
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz işlem' } },
          { status: 422 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('POST /api/files/[id]/actions error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: error.flatten().fieldErrors } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
