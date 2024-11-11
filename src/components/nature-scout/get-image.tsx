"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Progress } from "../ui/progress";
import { publicConfig } from '@/lib/config';
import { GetImageProps } from "@/types/types";

const { maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT, quality: IMAGE_QUALITY } = publicConfig.imageSettings;


export function GetImage({ imageTitle, anweisung, onBildUpload, existingImage }: GetImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
    console.log("compressImage");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
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
    console.log("🚀 Start handleBildUpload");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const compressedBlob = await compressImage(file);
      console.log("✅ Bild komprimiert");

      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      const compressedFile = new File([compressedBlob], newFileName, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append("image", compressedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await uploadResponse.json();
      console.log("📸 Bild hochgeladen, URL:", data.url);
      
      setUploadedImage(data.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${data.url}?${Date.now()}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        opacity: 1
      });
      onBildUpload(imageTitle, data.filename, data.url, "");
      setUploadProgress(100);
      
    } catch (error) {
      console.error("❌ Fehler beim Hochladen:", error);
    } finally {
      setIsUploading(false);
      console.log("🏁 Upload-Prozess abgeschlossen");
    }
  };

  return (
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
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center mt-2">{Math.round(uploadProgress)}% hochgeladen</p>
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
  );
} 