import * as React from "react";
import { HabitatCardProps } from "../../types/landingpage";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export const HabitatCard: React.FC<HabitatCardProps> = ({
    imageSrc,
    title,
    location,
    recorder,
    status,
    org
}) => {

    function getStatusColor(status: string): string {
        switch (status) {
            case 'active': return 'text-green-500';
            case 'pending': return 'text-yellow-500';
            case 'closed': return 'text-red-500';
            default: return 'text-gray-500';
        }
    }
        
    function getStatusText(status: string): string {
        switch (status) {
            case 'active': return 'Aktiv';
            case 'pending': return 'Ausstehend';
            case 'closed': return 'Geschlossen';
            default: return 'Unbekannt';
        }
    }
  return (
    <Card className="overflow-hidden relative">
      <Image 
        src={imageSrc} 
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 300px"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <CardContent className="relative z-10 h-full flex flex-col justify-end p-4 text-white">
        <h3 className="font-medium text-lg mb-1">{title}</h3>
        <div className="flex items-center text-sm mb-1">
          <MapPin className="w-4 h-4 mr-1" />
          {location}
        </div>
        <div className="flex items-center text-sm mb-2">
          <User className="w-4 h-4 mr-1" />
          {recorder}
        </div>
        <div className="flex justify-between items-center">
          <Badge variant="outline" className={`${getStatusColor(status)} border`}>
            {getStatusText(status)}
          </Badge>
          <p className="text-xs">{org}</p>
        </div>
      </CardContent>
    </Card>
  );
};