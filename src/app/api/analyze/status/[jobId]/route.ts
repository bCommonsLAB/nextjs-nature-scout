import { analyzeImageStructured } from '@/lib/services/openai-service';
import { NextRequest, NextResponse } from 'next/server';

// Korrekte Typisierung für Next.js 15 Route Handler
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    console.log('jobId', jobId);
    // Hier würde normalerweise der Status aus einer Queue abgefragt
    const images = JSON.parse(request.nextUrl.searchParams.get('images') || '[]');
    const kommentar = request.nextUrl.searchParams.get('kommentar') || '';
    
    const analysisResult = await analyzeImageStructured(images, kommentar);
    
    return NextResponse.json({
      status: 'completed',
      result: analysisResult
    });
  } catch (error) {
    console.error('Fehler bei der Statusabfrage:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Statusabfrage' },
      { status: 500 }
    );
  }
}
