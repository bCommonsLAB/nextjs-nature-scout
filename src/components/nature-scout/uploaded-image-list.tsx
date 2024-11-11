"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bild } from "@/types/nature-scout";
import Image from "next/image";

interface UploadedImageListProps {
  bilder: Bild[];
}

export function UploadedImageList({ bilder }: UploadedImageListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hochgeladene Bilder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bilder.map((bild) => (
            <div key={bild.imageKey} className="border rounded-lg p-4">
              <Image 
                src={`${bild.url}`}
                alt={`Bild ${bild.imageKey}`} 
                className="w-full h-48 object-contain rounded bg-gray-50" 
                width={200} 
                height={200} 
              />
              <p className="mt-2 text-sm text-gray-600">{bild.imageKey.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 