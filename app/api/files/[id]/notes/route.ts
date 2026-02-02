import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileNotes, addNote } from '@/lib/services/note.service';
import { noteSchema } from '@/lib/validations';

export async function GET(
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

    const notes = await getFileNotes(params.id);

    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    console.error('GET /api/files/[id]/notes error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

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
    const { message } = noteSchema.parse(body);

    const note = await addNote(
      params.id,
      session.user.id,
      session.user.departmentId,
      message
    );

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/files/[id]/notes error:', error);

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
