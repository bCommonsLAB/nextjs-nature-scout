"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';
import { Button } from "../ui/button";

let SAMPLE_IMAGES = [
  {
    src: '/habitatsamples/trockenrasen-kurzgrasig.jpg',
    title: 'Trockenrasen kurzgrasig',
    type: 'habitat'
  },
  {
    src: '/habitatsamples/verlandungsmoor.jpg',
    title: 'Moor Verlandungsmoor',
    type: 'habitat'
  },
  {
    src: '/habitatsamples/magerwiese-artenreich.jpg',
    title: 'Magerwiese artenreich',
    type: 'habitat'
  },
  {
    src: '/habitatsamples/fettwiese-standard.jpg',
    title: 'Fettwiese',
    type: 'habitat'
  },
  {
    src: '/plantsamples/arnika.jpg',
    title: 'Arnika (typisch für Magerwiese)',
    type: 'plant'
  },
  {
    src: '/plantsamples/salvia-pratensis.jpg',
    title: 'Salvia pratensis (typisch für Magerwiese)',
    type: 'plant'
  },
  {
    src: '/plantsamples/trifolium-montanum.jpg',
    title: 'Trifolium montanum (typisch für Magerwiese)',
    type: 'plant'
  },
  {
    src: '/plantsamples/fumana-ericoides.jpg',
    title: 'Fumana ericoides (typisch für Trockenrasen)',
    type: 'plant'
  },
];

interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  onBildUpload: (
    imageKey: string,
    filename: string,
    url: string,
    bestMatch: string,
    result?: PlantNetResult,
    lowResUrl?: string
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
  SAMPLE_IMAGES=[]
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [progressPhase, setProgressPhase] = useState<'upload' | 'analyze' | 'complete'>('upload');
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
        backgroundImage: `url("${existingImage.url.replace('.jpg', '_low.jpg')}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1
      });
    }
  }, [existingImage]);

  // Timer für kontinuierliche Fortschrittsanzeige
  useEffect(() => {
    let progressTimer: NodeJS.Timeout | null = null;
    
    if (isUploading) {
      if (progressPhase === 'upload' && localUploadProgress < 60) {
        // Upload-Phase (0-60%)
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 10) return 10; // Sofort auf 10% setzen
            if (prevProgress < 30) return prevProgress + 0.8;
            if (prevProgress < 50) return prevProgress + 0.4;
            return Math.min(prevProgress + 0.2, 59); // Maximal 59% bis Upload fertig
          });
        }, 100);
      } else if (progressPhase === 'analyze' && localUploadProgress < 90) {
        // Analyse-Phase (60-90%)
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 70) return prevProgress + 0.3;
            if (prevProgress < 80) return prevProgress + 0.2;
            return Math.min(prevProgress + 0.1, 89); // Maximal 89% bis Analyse fertig
          });
        }, 100);
      }
    }
    
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isUploading, localUploadProgress, progressPhase]);

  async function uploadImage(imageUrl: string, filename: string): Promise<{ url: string; lowResUrl: string; filename: string }> {
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
    lowResUrl: string;
    filename: string;
    analysis: PlantNetResponse | null;
  }> {
    setProgressPhase('upload');
    setLocalUploadProgress(5);
    
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
      setProgressPhase('analyze');
      analysis = await analyzePlants([uploadResult.url]);
      setLocalUploadProgress(90);
    }

    setProgressPhase('complete');
    return { 
      url: uploadResult.url,
      lowResUrl: uploadResult.lowResUrl, 
      filename: uploadResult.filename, 
      analysis 
    };
  }

  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setProgressPhase('upload');
    setLocalUploadProgress(5);

    try {
      const { url, lowResUrl, filename, analysis } = await processImage(
        file,
        file.name,
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        lowResUrl,
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
    setProgressPhase('upload');
    setLocalUploadProgress(5);

    try {
      const pathParts = sampleSrc.split('/');
      const originalFileName = pathParts[pathParts.length - 1];

      const { url, lowResUrl, filename, analysis } = await processImage(
        sampleSrc,
        originalFileName || '',
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        lowResUrl,
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
      lowResUrl: string;
      bestMatch: string;
      result?: PlantNetResult;
    }
  ) {
    setUploadedImage(url);
    setBackgroundImageStyle({
      backgroundImage: `url("${url}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 1
    });

    onBildUpload(
      data.imageTitle,
      data.filename,
      url,
      data.bestMatch,
      data.result,
      data.lowResUrl
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
    <div>
      <div className="relative max-w-xs mx-auto">
        <div 
          className={`flex flex-col items-center justify-center h-[150px] w-[150px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200 p-2 ${uploadedImage ? "" : "space-y-1"}`}
          style={backgroundImageStyle}
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
                <p className="text-xs text-center mt-2">
                  {Math.round(localUploadProgress)}% 
                  {progressPhase === 'analyze' ? ' analysiert' : ' hochgeladen'}
                </p>
              </div>
            ) : !uploadedImage ? (
              <>
                <h2 className="text-sm font-semibold">{imageTitle.replace(/_/g, ' ')}</h2>
                <p className="text-xs text-center text-gray-500">{anweisung}</p>
                <Upload className="w-8 h-8 my-1 text-gray-400" />
                <p className="text-xs text-gray-500">Klicken zum Hochladen</p>
                {SAMPLE_IMAGES.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-600">Beispielbilder:</p>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                    {SAMPLE_IMAGES
                      .filter(sample => 
                        doAnalyzePlant ? sample.type === 'plant' 
                          : sample.type === 'habitat'
                      )
                      .map((sample, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleSampleImageClick(sample.src);
                          }}
                          className="relative w-[30px] h-[30px] rounded overflow-hidden hover:opacity-90 transition-opacity"
                          title={sample.title}
                        >
                          <Image
                            src={sample.src.replace('.jpg', '_low.jpg')}
                            alt={sample.title}
                            width={30}
                            height={30}
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
        
        {uploadedImage && doAnalyzePlant && (
          <div className="mt-2 text-xs w-[150px]">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}
      </div>
    </div>
  );
} 