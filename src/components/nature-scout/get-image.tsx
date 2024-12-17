"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';
import { Button } from "../ui/button";

const SAMPLE_IMAGES = [
  {
    src: '/panoramasamples/trockenrasen-kurzgrasig.jpg',
    title: 'Trockenrasen kurzgrasig',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/verlandungsmoor.jpg',
    title: 'Moor Verlandungsmoor',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/magerwiese-artenreich.jpg',
    title: 'Magerwiese artenreich',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/fettwiese-standard.jpg',
    title: 'Fettwiese',
    type: 'panorama'
  },
  {
    src: '/detailsamples/Arnika.jpg',
    title: 'Arnika (typisch für Magerwiese)',
    type: 'detail'
  },
  {
    src: '/detailsamples/Salvia pratensis.JPG',
    title: 'Salva pratensis (typisch für Magerwiese)',
    type: 'detail'
  },
  {
    src: '/detailsamples/Trifolium montanum.JPG',
    title: 'Trifolium montanum (typisch für Magerwiese)',
    type: 'detail'
  }
];

interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  onBildUpload: (
    imageKey: string,
    filename: string,
    url: string,
    bestMatch: string,
    result?: PlantNetResult
  ) => void;
  onDeleteImage: (imageKey: string) => void;
  existingImage: Bild | undefined;
  doAnalyzePlant?: boolean;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
}

export function GetImage({ 
  imageTitle, 
  anweisung, 
  onBildUpload, 
  onDeleteImage,
  existingImage, 
  doAnalyzePlant = false,
  isUploading,
  setIsUploading 
}: GetImageProps) {
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [backgroundImageStyle, setBackgroundImageStyle] = useState<React.CSSProperties>(
    existingImage?.url ? {
      backgroundImage: `url("${existingImage.url}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 1
    } : {}
  );

  useEffect(() => {
    if (existingImage?.url) {
      setUploadedImage(existingImage.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${existingImage.url}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1
      });
    }
  }, [existingImage]);


  async function uploadImage(imageUrl: string, filename: string): Promise<{ url: string; filename: string }> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });

    const formData = new FormData();
    formData.append("image", file);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) throw new Error('Upload fehlgeschlagen');
    return await uploadResponse.json();
  }

  async function processImage(
    imageSource: File | string,
    originalFileName: string,
    doAnalyzePlant: boolean
  ): Promise<{
    url: string;
    filename: string;
    analysis: PlantNetResponse | null;
  }> {
    let uploadResult;
    if (typeof imageSource === 'string') {
      uploadResult = await uploadImage(imageSource, originalFileName);
    } else {
      const formData = new FormData();
      formData.append("image", imageSource);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Upload fehlgeschlagen');
      uploadResult = await uploadResponse.json();
    }

    setLocalUploadProgress(60);

    let analysis = null;
    if (doAnalyzePlant) {
      setLocalUploadProgress(70);
      analysis = await analyzePlants([uploadResult.url]);
      setLocalUploadProgress(90);
    }

    return { 
      url: uploadResult.url, 
      filename: uploadResult.filename, 
      analysis 
    };
  }

  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setLocalUploadProgress(20);

    try {
      const { url, filename, analysis } = await processImage(
        file,
        file.name,
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        bestMatch: analysis?.bestMatch || "",
        result: analysis?.results[0]
      });

      setLocalUploadProgress(100);
      toast.success(
        doAnalyzePlant 
          ? 'Bild hochgeladen und Pflanze analysiert'
          : 'Bild hochgeladen'
      );
    } catch (error) {
      console.error("❌ Fehler beim Hochladen oder Analysieren:", error);
      toast.error('Fehler beim Hochladen oder Analysieren des Bildes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSampleImageClick = async (sampleSrc: string) => {
    setIsUploading(true);
    setLocalUploadProgress(20);

    try {
      const pathParts = sampleSrc.split('/');
      const originalFileName = pathParts[pathParts.length - 1];
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const fullSampleUrl = `${baseUrl}${sampleSrc}`;

      const { url, filename, analysis } = await processImage(
        fullSampleUrl,
        originalFileName || '',
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        bestMatch: analysis?.bestMatch || "",
        result: analysis?.results[0]
      });

      setLocalUploadProgress(100);
      toast.success(
        doAnalyzePlant 
          ? 'Beispielbild hochgeladen und Pflanze analysiert'
          : 'Beispielbild hochgeladen'
      );
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Beispielbildes:", error);
      toast.error('Fehler beim Verarbeiten des Beispielbildes');
    } finally {
      setIsUploading(false);
    }
  };

  function updateUIWithImage(
    url: string, 
    data: { 
      imageTitle: string;
      filename: string;
      bestMatch: string;
      result?: PlantNetResult;
    }
  ) {
    setUploadedImage(url);
    setBackgroundImageStyle({
      backgroundImage: `url("${url}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      opacity: 1
    });

    onBildUpload(
      data.imageTitle,
      data.filename,
      url,
      data.bestMatch,
      data.result
    );
  }

  async function analyzePlants(imageUrls: string[]) {
    const response = await fetch('/api/analyze/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrls }),
    });

    if (!response.ok) {
      throw new Error('Analyse fehlgeschlagen');
    }

    return await response.json() as PlantNetResponse;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-start w-64 min-h-64 border-2 border-gray-300 rounded-lg bg-gray-50 p-4 space-y-2">
        <h2 className="text-lg font-semibold">{imageTitle} Upload</h2>
        <p className="text-sm text-center">{anweisung}</p>
        
        <div className="relative w-full">
          <div 
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200" 
            style={backgroundImageStyle}
            onLoad={() => console.log("🎨 Hintergrundbild geladen:", uploadedImage)}
          >
            {uploadedImage && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  onDeleteImage(imageTitle);
                  setUploadedImage(null);
                  setBackgroundImageStyle({});
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <label htmlFor={`dropzone-file-${imageTitle}`} className="flex flex-col items-center justify-center w-full h-full">
              {isUploading ? (
                <div className="w-full px-4">
                  <Progress value={localUploadProgress} className="w-full" />
                  <p className="text-xs text-center mt-2">{Math.round(localUploadProgress)}% hochgeladen</p>
                </div>
              ) : !uploadedImage ? (
                <>
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="text-xs text-gray-500">Klicken Sie zum Hochladen oder ziehen Sie die Datei hierher</p>
                  <p className="text-xs text-gray-500">PNG, JPG</p>
                </>
              ) : null}
              <input 
                id={`dropzone-file-${imageTitle}`} 
                type="file" 
                className="hidden" 
                onChange={handleBildUpload}
                accept="image/*"
              />
            </label>
          </div>
        </div>
        
        {uploadedImage && doAnalyzePlant && (
          <div className="w-full mt-2 text-sm">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Oder wähle ein Beispielbild:</p>
          <div className="grid grid-cols-4 gap-1">
          {SAMPLE_IMAGES
            .filter(sample => 
              imageTitle.toLowerCase().includes('detail') 
                ? sample.type === 'detail' 
                : sample.type === 'panorama'
            )
            .map((sample, index) => (
              <button
                key={index}
                onClick={() => handleSampleImageClick(sample.src)}
                className="relative w-[50px] h-[50px] rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                title={sample.title}
              >
                <Image
                  src={sample.src}
                  alt={sample.title}
                  width={50}
                  height={50}
                  className="object-cover"
                />
              </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

} 