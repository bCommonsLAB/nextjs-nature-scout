"use client";

import * as React from "react";
import { useState } from "react";
import { HabitatCardProps } from "../../types/landingpage";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export const HabitatCard: React.FC<HabitatCardProps> = ({
    imageSrc,
    title,
    location,
    recorder,
    status,
    org,
    orgLogo
}) => {
    // Logo-Verfügbarkeit überwachen
    const [logoError, setLogoError] = useState(false);

    function getStatusStyle(type: string): string {
      const baseStyle = "text-sm font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1";
  
      switch(type) {
          case 'gesetzlich':
              return `${baseStyle} bg-red-100 text-red-800`;
          case 'hochwertig':
              return `${baseStyle} bg-orange-100 text-orange-800`;
          case 'standard':
              return `${baseStyle} bg-green-100 text-green-800`;
          default:
              return `${baseStyle} bg-gray-100 text-gray-600`;
      }
    }
  
    function getStatusText(status: string): string {
        switch (status) {
            case 'standard': return 'ökologisch niederwertig';
            case 'hochwertig': return 'ökologisch hochwertig';
            case 'gesetzlich': return 'gesetzlich geschützt';
            default: return 'Unbekannt';
        }
    }
  return (
    <Card className="overflow-hidden relative w-full h-full flex flex-col justify-end">
      <div className="absolute inset-0">
        <Image 
          src={imageSrc} 
          alt={title}
          fill
          className="habitat-image object-cover"
          priority={false}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      
      {/* Status Badge oben rechts */}
      <div className="absolute top-4 right-4 z-20">
        <Badge variant="outline" className={`${getStatusStyle(status)} border whitespace-nowrap`}>
          {getStatusText(status)}
        </Badge>
      </div>
      
      <CardContent className="relative z-10 flex flex-col justify-end p-4 text-white">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="font-medium text-lg mb-1">{title}</h3>
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{location}</span>
            </div>
            {recorder && (
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{recorder}</span>
            </div>
            )}
            {org && (
            <div className="flex items-center text-sm">
              <Building className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{org}</span>
            </div>
            )}
          </div>
          
          {/* Organisationslogo unten rechts - nur anzeigen wenn ein gültiges Logo vorhanden ist */}
          {orgLogo && !logoError && (
            <div className="ml-2 self-end opacity-80">
              <Image 
                src={orgLogo}
                alt={org || "Organisation"}
                width={60}
                height={60}
                className="rounded-full bg-white p-1"
                onError={() => setLogoError(true)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};