import { NextResponse } from "next/server";

interface RequestBody {
  imageUrls: string[];
}

export async function POST(request: Request) {
  try {
    const { imageUrls }: RequestBody = await request.json();
    const plantNetApiKey = process.env.PLANTNET_API_KEY?.trim();

    if (!imageUrls?.length) {
      return NextResponse.json(
        { error: "Keine Bilder übermittelt" },
        { status: 400 }
      );
    }

    if (!plantNetApiKey) {
      return NextResponse.json(
        { error: "PlantNet API-Key fehlt auf dem Server" },
        { status: 500 }
      );
    }

    //console.log("imageUrls", imageUrls);
    // Erstelle die URL mit Query-Parametern
    const baseUrl = "https://my-api.plantnet.org/v2/identify/all";
    const urlParams = new URLSearchParams();
    
    // Pflichtparameter
    urlParams.append("api-key", plantNetApiKey);
    
    // Füge die Bilder hinzu (max. 5)
    imageUrls.slice(0, 5).forEach((url) => {
      urlParams.append("images", url);
      urlParams.append("organs", "auto");
    });
    urlParams.append("include-related-images", "false");
    urlParams.append("no-reject", "false");
    urlParams.append("nb-results", "3");
    urlParams.append("lang", "de");
    urlParams.append("type", "kt");

    const apiUrl = `${baseUrl}?${urlParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      let errorData: { message?: string; error?: string } | null = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      console.error("PlantNet API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return NextResponse.json(
        { 
          error: "Fehler bei der Pflanzenidentifikation",
          details: errorData?.message || errorData?.error || "Unbekannter Upstream-Fehler",
          statusText: response.statusText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Fehler bei der Pflanzenidentifikation:", error);
    return NextResponse.json(
      { error: "Fehler bei der Pflanzenidentifikation" },
      { status: 500 }
    );
  }
}
