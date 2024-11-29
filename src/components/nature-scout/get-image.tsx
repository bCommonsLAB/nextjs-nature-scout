"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Progress } from "../ui/progress";
import { publicConfig } from '@/lib/config';
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';

const { maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT, quality: IMAGE_QUALITY } = publicConfig.imageSettings;

const SAMPLE_IMAGES = [
  {
    src: '/panoramasamples/trockenrasen kurzgrasig.jpg',
    title: 'Trockenrasen kurzgrasig',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/moor verlandungsmoor.jpg',
    title: 'Moor Verlandungsmoor',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/magerwiese artenreich.jpg',
    title: 'Magerwiese artenreich',
    type: 'panorama'
  },
  {
    src: '/panoramasamples/fettwiese.jpg',
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
  existingImage: Bild | undefined;
  doAnalyzePlant?: boolean;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
}

export function GetImage({ 
  imageTitle, 
  anweisung, 
  onBildUpload, 
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

  const compressImage = async (file: File): Promise<Blob> => {
    if (typeof window === 'undefined') {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          let width = img.width;
          let height = img.height;
          console.log("width", width);
          console.log("height", height);

          console.log("MAX_WIDTH", MAX_WIDTH);
          console.log("MAX_HEIGHT", MAX_HEIGHT);
          
          // Berechne neue Dimensionen
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Konvertiere zu Blob mit reduzierter Qualität
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Blob konnte nicht erstellt werden'));
              }
            },
            'image/jpeg',
            IMAGE_QUALITY  // Qualität (0.7 = 70%)
          );
        };
      };
      
      reader.onerror = (error) => reject(error);
    });
  };

  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setLocalUploadProgress(0);

    try {
      const compressedBlob = await compressImage(file);
      console.log("✅ Bild komprimiert");

      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      const compressedFile = new File([compressedBlob], newFileName, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append("image", compressedFile);
      setLocalUploadProgress(20);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await uploadResponse.json();
      console.log("📸 Bild hochgeladen, URL:", data.url);
      
      // Pflanzenanalyse nur wenn doAnalyzePlant true ist
      let plantAnalysis = null;
      if (doAnalyzePlant) {
        setLocalUploadProgress(70);
        plantAnalysis = await analyzePlants([data.url]);
        setLocalUploadProgress(90);
      } else {
        setLocalUploadProgress(90);
      }

      setUploadedImage(data.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${data.url}?${Date.now()}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        opacity: 1
      });

      onBildUpload(
        imageTitle, 
        data.filename, 
        data.url, 
        plantAnalysis?.bestMatch || "",
        plantAnalysis?.results[0]
      );

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
      console.log("🏁 Upload-Prozess abgeschlossen");
    }
  };

  const handleSampleImageClick = async (sampleSrc: string) => {
    setIsUploading(true);
    setLocalUploadProgress(20);

    try {
      const response = await fetch(sampleSrc);
      const blob = await response.blob();
      
      const pathParts = sampleSrc.split('/');
      const originalFileName = pathParts[pathParts.length - 1];
      const fileName = originalFileName?.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_') + '.jpg';
      
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], fileName, {
        type: 'image/jpeg',
      });
      
      const formData = new FormData();
      formData.append("image", compressedFile);
      setLocalUploadProgress(40);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await uploadResponse.json();
      
      let plantAnalysis = null;
      if (doAnalyzePlant) {
        setLocalUploadProgress(70);
        plantAnalysis = await analyzePlants([data.url]);
        setLocalUploadProgress(90);
      }

      setUploadedImage(data.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${data.url}?${Date.now()}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        opacity: 1
      });

      onBildUpload(
        imageTitle,
        data.filename,
        data.url,
        plantAnalysis?.bestMatch || "",
        plantAnalysis?.results[0]
      );

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
        
        <div 
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200" 
          style={backgroundImageStyle}
          onLoad={() => console.log("🎨 Hintergrundbild geladen:", uploadedImage)}
        >
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