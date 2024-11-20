import { NextResponse } from 'next/server'
import { GeocodingResult } from '@/types/nature-scout'
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY ist nicht konfiguriert')
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleResult {
  address_components: AddressComponent[];
  formatted_address: string;
  // ... andere Felder
}

interface GoogleGeocodingResponse {
  results: GoogleResult[];
  status: string;
}


const extractValue = (searchParam: string, data: GoogleGeocodingResponse): string | null => {
  const results = data.results;

  for (const result of results) {
    const addressComponents = result.address_components;
    for (const component of addressComponents) {
      if (component.types.includes(searchParam)) {
        return component.short_name.replace('Straße Ohne Straßennamen', '').replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').trim();
      }
    }
  }
  return null; // Falls nichts gefunden wird
};

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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}&language=de`
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      throw new Error(`Google Maps API responded with status: ${response.status}`)
    }

    const data: GoogleGeocodingResponse = await response.json()

    console.log(data)
    const street_number: string | null = extractValue("street_number", data)
    const route: string | null  = extractValue("route", data)
    const locality: string | null  = extractValue("locality", data)
    const administrative_area_level_3: string | null = extractValue("administrative_area_level_3", data)
    const administrative_area_level_2: string | null = extractValue("administrative_area_level_2", data)
    const administrative_area_level_1: string | null = extractValue("administrative_area_level_1", data)
    const country: string | null = extractValue("country", data)
    const postal_code: string | null = extractValue("postal_code", data)

    const geocodingResult: GeocodingResult = {
      standort: Array.from(new Set([
        route, 
        street_number, 
        postal_code,
        locality, 
        administrative_area_level_3, 
        administrative_area_level_2, 
        administrative_area_level_1, 
        country
      ]))
        .filter(Boolean)
        .join(", "),
      gemeinde: locality || administrative_area_level_3 || "",
      flurname: route || locality || ""
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