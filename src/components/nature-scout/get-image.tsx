"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Progress } from "../ui/progress";

interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  onBildUpload: (imageTitle: string, filename: string, analysis: string) => void;
}

export function GetImage({ imageTitle, anweisung, onBildUpload }: GetImageProps) {
  const [ladevorgang, setLadevorgang] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append("image", file);
    setLadevorgang(true);

    try {
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await uploadResponse.json();
      const imageUrl = `/api/images/${data.filename}`;
      console.log(imageUrl);
      setUploadedImage(imageUrl);
      onBildUpload(imageTitle, data.filename, "");
    } catch (error) {
      console.error("Fehler beim Hochladen des Bildes:", error);
    } finally {
      setLadevorgang(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-64 min-h-64 border-2 border-gray-300 rounded-lg bg-gray-50 p-4 space-y-2">
      <h2 className="text-lg font-semibold">{imageTitle} Upload</h2>
      <p className="text-sm text-center">
        {anweisung}
      </p>
      <div 
        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200" 
        style={{ 
          backgroundImage: uploadedImage ? `url(${uploadedImage})` : "none", 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}
      >
        <label htmlFor={`dropzone-file-${imageTitle}`} className="flex flex-col items-center justify-center w-full h-full">
          {ladevorgang ? (
            <Progress value={33} className="w-full" />
          ) : !uploadedImage ? (
            <>
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="text-xs text-gray-500">Klicken Sie zum Hochladen oder ziehen Sie die Datei hierher</p>
              <p className="text-xs text-gray-500">PNG, JPG oder GIF (MAX. 800x400px)</p>
            </>
          ) : null}
          <input id={`dropzone-file-${imageTitle}`} type="file" className="hidden" onChange={handleBildUpload} />
        </label>
      </div>
    </div>
  );
} 