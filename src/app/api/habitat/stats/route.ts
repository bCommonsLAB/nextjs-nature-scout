import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { schutzstatusToProtectionStatus } from '@/lib/utils/data-validation';

type Filter = Record<string, unknown> & { $or?: unknown[]; $and?: unknown[] };

// Baut den MongoDB-Filter aus denselben Query-Parametern wie /api/habitat/public
// (Suche, Gemeinde, Habitat, Gruppe, Schutzstatus, Erfasser, Organisation),
// damit die Kennzahlen zur gefilterten Galerie/Karte passen.
// Basis: nur verifizierte, nicht gelöschte, keine Entwürfe. KEIN erzwungener
// red/yellow-Standardfilter – die Gesamtzahl bleibt "alle verifizierten".
function buildFilter(searchParams: URLSearchParams): Filter {
  const filter: Filter = {
    deleted: { $ne: true },
    status: { $ne: 'draft' },
    verified: true,
  };
  const ensureOr = (): unknown[] => {
    if (!filter.$or) filter.$or = [];
    return filter.$or;
  };
  const ensureAnd = (): unknown[] => {
    if (!filter.$and) filter.$and = [];
    return filter.$and;
  };

  const gemeinde = searchParams.get('gemeinde');
  if (gemeinde) {
    const vals = gemeinde.split(',');
    if (vals.length > 1) ensureOr().push(...vals.map((g) => ({ 'metadata.gemeinde': { $regex: `^${g}$`, $options: 'i' } })));
    else filter['metadata.gemeinde'] = gemeinde;
  }

  const habitat = searchParams.get('habitat');
  if (habitat) {
    const vals = habitat.split(',');
    if (vals.length > 1) ensureOr().push(...vals.map((h) => ({ 'result.habitattyp': { $regex: `^${h}$`, $options: 'i' } })));
    else filter['result.habitattyp'] = habitat;
  }

  const habitatfamilie = searchParams.get('habitatfamilie');
  if (habitatfamilie) {
    const or = ensureOr();
    for (const fam of habitatfamilie.split(',')) {
      or.push({ 'result.habitatfamilie': { $regex: `^${fam}$`, $options: 'i' } });
      or.push({ 'verifiedResult.habitatfamilie': { $regex: `^${fam}$`, $options: 'i' } });
    }
  }

  // Schutzstatus: protectionStatus (neu) oder schutzstatus (alt).
  const protectionStatus = searchParams.get('protectionStatus');
  const schutzstatus = searchParams.get('schutzstatus');
  let psValues: Array<'red' | 'yellow' | 'green'> = [];
  if (protectionStatus) {
    psValues = protectionStatus
      .split(',')
      .map((s) => decodeURIComponent(s.trim()).toLowerCase())
      .filter((v): v is 'red' | 'yellow' | 'green' => v === 'red' || v === 'yellow' || v === 'green');
  } else if (schutzstatus) {
    for (const s of schutzstatus.split(',').map((x) => decodeURIComponent(x.trim()))) {
      const p = schutzstatusToProtectionStatus(s);
      if (!psValues.includes(p)) psValues.push(p);
    }
  }
  if (psValues.length > 0) {
    const unique = Array.from(new Set(psValues));
    ensureAnd().push(unique.length === 1 ? { protectionStatus: unique[0] } : { protectionStatus: { $in: unique } });
  }

  const person = searchParams.get('person');
  if (person) {
    const vals = person.split(',');
    if (vals.length > 1) ensureOr().push(...vals.map((p) => ({ 'metadata.erfassungsperson': { $regex: `^${p}$`, $options: 'i' } })));
    else filter['metadata.erfassungsperson'] = person;
  }

  const organization = searchParams.get('organization');
  if (organization) {
    const vals = organization.split(',');
    if (vals.length > 1) ensureOr().push(...vals.map((o) => ({ 'metadata.organizationName': { $regex: `^${o}$`, $options: 'i' } })));
    else filter['metadata.organizationName'] = organization;
  }

  const searchTerm = searchParams.get('search');
  if (searchTerm) {
    ensureOr().push(
      { 'metadata.erfassungsperson': { $regex: searchTerm, $options: 'i' } },
      { 'metadata.gemeinde': { $regex: searchTerm, $options: 'i' } },
      { 'metadata.flurname': { $regex: searchTerm, $options: 'i' } },
      { 'result.habitattyp': { $regex: searchTerm, $options: 'i' } },
    );
  }

  return filter;
}

// Öffentliche Statistik / Bestenliste für die Seite "Unsere Habitate".
// Reagiert auf dieselben Filter wie die Galerie (werden sie weggelassen, zählt alles).
//   summary: Gesamtzahl Habitate + Hektar je Schutzstatus (rot/gelb) aus plotsize
//   topErfasser / topOrganisationen: Bestenlisten (für die globale Ansicht ohne Filter aufrufen)
// limit: Einträge je Bestenliste (1..50, Default 10). Kein Auth nötig.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get('limit') || '10');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50) : 10;

  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    const match = buildFilter(searchParams);

    const [summaryAgg, topErfasser, topOrganisationen, topGemeindenAgg] = await Promise.all([
      collection
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalHabitats: { $sum: 1 },
              m2Gesetzlich: { $sum: { $cond: [{ $eq: ['$protectionStatus', 'red'] }, { $ifNull: ['$metadata.plotsize', 0] }, 0] } },
              m2Hochwertig: { $sum: { $cond: [{ $eq: ['$protectionStatus', 'yellow'] }, { $ifNull: ['$metadata.plotsize', 0] }, 0] } },
            },
          },
        ])
        .toArray(),
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
          { $project: { _id: 0, name: '$_id', count: 1, organizationName: 1, organizationLogo: 1 } },
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
      // Gemeinden nach erfasster Gesamtfläche (unabhängig vom Schutzstatus).
      collection
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$metadata.gemeinde',
              m2: { $sum: { $ifNull: ['$metadata.plotsize', 0] } },
              count: { $sum: 1 },
            },
          },
          { $match: { _id: { $nin: [null, ''] } } },
          { $sort: { m2: -1, _id: 1 } },
          { $limit: limit },
          { $project: { _id: 0, name: '$_id', count: 1, m2: 1 } },
        ])
        .toArray(),
    ]);

    const s =
      (summaryAgg[0] as { totalHabitats?: number; m2Gesetzlich?: number; m2Hochwertig?: number } | undefined) || {};
    const summary = {
      totalHabitats: s.totalHabitats || 0,
      hektarGesetzlich: Math.round(((s.m2Gesetzlich || 0) / 10000) * 10) / 10,
      hektarHochwertig: Math.round(((s.m2Hochwertig || 0) / 10000) * 10) / 10,
    };

    const topGemeinden = (topGemeindenAgg as Array<{ name?: string; count?: number; m2?: number }>).map((g) => ({
      name: g.name,
      count: g.count,
      hektar: Math.round(((g.m2 || 0) / 10000) * 10) / 10,
    }));

    return NextResponse.json({ summary, topErfasser, topOrganisationen, topGemeinden });
  } catch (error) {
    console.error('Fehler beim Laden der Habitat-Statistik:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Statistik' }, { status: 500 });
  }
}
