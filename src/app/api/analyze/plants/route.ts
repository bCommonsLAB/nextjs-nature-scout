import { NextResponse } from "next/server";

interface RequestBody {
  imageUrls: string[];
}

export async function POST(request: Request) {
  try {
    const { imageUrls }: RequestBody = await request.json();

    if (!imageUrls?.length) {
      return NextResponse.json(
        { error: "Keine Bilder übermittelt" },
        { status: 400 }
      );
    }

    // Erstelle die URL mit Query-Parametern
    const baseUrl = "https://my-api.plantnet.org/v2/identify/all";
    const urlParams = new URLSearchParams();
    
    // Pflichtparameter
    urlParams.append("api-key", process.env.PLANTNET_API_KEY || "");
    
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
      const errorData = await response.json();
      console.error("PlantNet API Error:", errorData);
      throw new Error(`PlantNet API Fehler: ${response.statusText}`);
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
