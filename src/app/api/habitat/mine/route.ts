import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { requireAuth } from '@/lib/server-auth';

/** Erlaubte Status-Filter (entsprechen AnalysisJob.status). */
const ALLOWED_STATUS = ['draft', 'pending', 'analyzing', 'completed', 'failed'] as const;
type AllowedStatus = typeof ALLOWED_STATUS[number];

/**
 * GET /api/habitat/mine?status=draft – Eigene Habitate des angemeldeten Benutzers.
 *
 * Ohne `status` werden alle nicht gelöschten eigenen Habitate geliefert; mit `status` (z. B.
 * `draft`) nur die passenden – primär für Resume und „Meine Habitate → Entwürfe".
 * Nutzt den Index `{ 'metadata.email': 1, status: 1 }`.
 * Siehe specs/regeln/offline-erfassung-und-sync.md (§8) und offline-erfassung-umsetzungsplan.md (1.2).
 */
export async function GET(request: Request) {
  let currentUser;
  try {
    currentUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const userEmail = currentUser.email;
  if (!userEmail) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');

  if (statusParam && !ALLOWED_STATUS.includes(statusParam as AllowedStatus)) {
    return NextResponse.json({ error: 'Ungültiger Status-Filter' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    // Nur eigene, nicht gelöschte Habitate
    const query: Record<string, unknown> = {
      'metadata.email': userEmail,
      deleted: { $ne: true }
    };
    if (statusParam) {
      query.status = statusParam;
    }

    const entries = await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .project({
        jobId: 1,
        status: 1,
        startTime: 1,
        updatedAt: 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.standort': 1,
        'metadata.latitude': 1,
        'metadata.longitude': 1,
        'metadata.bilder': 1
      })
      .toArray();

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Fehler beim Abrufen der eigenen Habitate:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der eigenen Habitate' }, { status: 500 });
  }
}
