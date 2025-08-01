"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bild } from "@/types/nature-scout";
import Image from "next/image";
import { Info, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UploadedImageListProps {
  bilder: Bild[];
}

export function UploadedImageList({ bilder }: UploadedImageListProps) {
  const [infoDialog, setInfoDialog] = useState<string | null>(null);
  const [warningDialog, setWarningDialog] = useState<string | null>(null);

  return (
    <>
      <div className="flex overflow-x-auto gap-3 pb-4 -mx-2 px-2">
        {bilder.map((bild) => (
          <div key={bild.imageKey} className="border rounded-lg p-2 w-48 sm:w-52 flex-shrink-0">
            <div className="relative w-full aspect-square bg-gray-50 rounded overflow-hidden">
              <Image 
                src={`${bild.url}`}
                alt={`Bild ${bild.imageKey}`} 
                fill
                className="object-cover" 
                sizes="(max-width: 768px) 192px, 208px"
              />
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs sm:text-sm text-gray-600">{bild.imageKey.replace("_", " ")}</p>
              {bild.analyse && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-medium truncate">{bild.analyse}</p>
                    {bild.plantnetResult && (
                      <button 
                        className="focus:outline-none" 
                        aria-label="Details anzeigen"
                        onClick={() => setInfoDialog(bild.imageKey)}
                      >
                        <Info className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                  {bild.plantnetResult && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 min-w-[45px]">
                        Wahrscheinlichkeit: {(bild.plantnetResult.score * 100).toFixed(0)}%
                      </span>
                      {bild.plantnetResult.score < 0.7 && (
                        <button 
                          className="focus:outline-none" 
                          aria-label="Warnung anzeigen"
                          onClick={() => setWarningDialog(bild.imageKey)}
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Dialog */}
      {infoDialog && bilder.find(b => b.imageKey === infoDialog)?.plantnetResult && (
        <Dialog open={!!infoDialog} onOpenChange={(open) => !open && setInfoDialog(null)}>
          <DialogContent className="max-w-[350px] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-center">Pflanzendetails</DialogTitle>
              <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>
            <div className="mt-2 space-y-2 text-sm">
              {(() => {
                const bild = bilder.find(b => b.imageKey === infoDialog);
                if (!bild?.plantnetResult) return null;
                return (
                  <>
                    <p><span className="font-semibold">Wissenschaftlicher Name:</span> {bild.plantnetResult.species.scientificName}</p>
                    <p><span className="font-semibold">Score:</span> {(bild.plantnetResult.score * 100).toFixed(1)}%</p>
                    <p><span className="font-semibold">Familie:</span> {bild.plantnetResult.species.family.scientificNameWithoutAuthor}</p>
                    {bild.plantnetResult.species.commonNames.length > 0 && (
                      <p><span className="font-semibold">Bekannte Namen:</span> {bild.plantnetResult.species.commonNames.join(", ")}</p>
                    )}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Warning Dialog */}
      {warningDialog && (
        <Dialog open={!!warningDialog} onOpenChange={(open) => !open && setWarningDialog(null)}>
          <DialogContent className="max-w-[350px] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-center text-amber-500">Warnung</DialogTitle>
              <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>
            <div className="mt-2 text-sm">
              <p>Spezies konnte nicht eindeutig erkannt werden. Bitte ein anderes Bild hochladen.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 