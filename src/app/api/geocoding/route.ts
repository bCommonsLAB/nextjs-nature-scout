import { NextResponse } from 'next/server'
import { GeocodingResult } from '@/types/nature-scout'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude und Longitude sind erforderlich' }, 
      { status: 400 }
    )
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    
    console.log('Nominatim URL:', nominatimUrl);
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'NatureScout App',
        'Accept-Language': 'de'
      },
      next: { revalidate: 3600 } // Cache für 1 Stunde
    })

    if (!response.ok) {
      throw new Error(`Nominatim responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.address) {
      throw new Error('Keine Adressdaten gefunden');
    }

    const address = data.address;
    const location = data.display_name || [
      address.road,
      address.house_number,
      address.postcode,
      address.city || address.town || address.village,
      address.municipality
    ].filter(Boolean).join(', ');

    const geocodingResult: GeocodingResult = {
      standort: location,
      gemeinde: address.town || address.municipality || 'unbekannt',
      flurname: address.suburb || address.road || 'unbekannt'
    }

    return NextResponse.json(geocodingResult)
    
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Geocoding fehlgeschlagen', details: (error as Error).message }, 
      { status: 500 }
    )
  }
}