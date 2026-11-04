import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';

// Öffentliche Statistik / Bestenliste für die Seite "Unsere Habitate".
// Aggregiert die Anzahl Habitate je Erfasser:in und je Organisation.
//
// scope (Query-Parameter):
//   - "verified" (Default): alle verifizierten Habitate (würdigt jeden Beitrag)
//   - "public":   nur die öffentlich sichtbaren (protectionStatus red/yellow)
// limit: Anzahl Einträge je Liste (1..50, Default 10)
//
// Kein Auth nötig (wie /api/habitat/public).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') === 'public' ? 'public' : 'verified';
  const rawLimit = Number(searchParams.get('limit') || '10');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50) : 10;

  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    // Basisfilter: nie gelöscht, keine Entwürfe, nur verifiziert.
    const match: Record<string, unknown> = {
      deleted: { $ne: true },
      status: { $ne: 'draft' },
      verified: true,
    };
    if (scope === 'public') {
      match.protectionStatus = { $in: ['red', 'yellow'] };
    }

    const [topErfasser, topOrganisationen] = await Promise.all([
      collection
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$metadata.erfassungsperson',
              count: { $sum: 1 },
              organizationName: { $first: '$metadata.organizationName' },
              organizationLogo: { $first: '$metadata.organizationLogo' },
            },
          },
          { $match: { _id: { $nin: [null, ''] } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              name: '$_id',
              count: 1,
              organizationName: 1,
              organizationLogo: 1,
            },
          },
        ])
        .toArray(),
      collection
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$metadata.organizationName',
              count: { $sum: 1 },
              organizationLogo: { $first: '$metadata.organizationLogo' },
            },
          },
          { $match: { _id: { $nin: [null, ''] } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: limit },
          { $project: { _id: 0, name: '$_id', count: 1, organizationLogo: 1 } },
        ])
        .toArray(),
    ]);

    return NextResponse.json({ scope, topErfasser, topOrganisationen });
  } catch (error) {
    console.error('Fehler beim Laden der Habitat-Statistik:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Statistik' }, { status: 500 });
  }
}
