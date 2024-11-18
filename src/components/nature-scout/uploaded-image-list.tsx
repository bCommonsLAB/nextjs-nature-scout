"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bild } from "@/types/nature-scout";
import Image from "next/image";
import { Info, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

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
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">{bild.imageKey.replace("_", " ")}</p>
                {bild.analyse && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{bild.analyse}</p>
                      {bild.plantnetResult && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <div className="text-sm">
                                <p>Wissenschaftlicher Name: {bild.plantnetResult.species.scientificName}</p>
                                <p>Score: {(bild.plantnetResult.score * 100).toFixed(1)}%</p>
                                <p>Familie: {bild.plantnetResult.species.family.scientificNameWithoutAuthor}</p>
                                {bild.plantnetResult.species.commonNames.length > 0 && (
                                  <p>Bekannte Namen: {bild.plantnetResult.species.commonNames.join(", ")}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {bild.plantnetResult && (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={bild.plantnetResult.score * 100} 
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-gray-500 min-w-[45px]">
                          {(bild.plantnetResult.score * 100).toFixed(0)}%
                        </span>
                        {bild.plantnetResult.score < 0.7 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">Spezies konnte nicht eindeutig erkannt werden. Bitte ein anderes Bild hochladen.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 