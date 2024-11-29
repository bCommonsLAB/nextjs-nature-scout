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
            case 'standard': return 'standard';
            case 'hochwertig': return 'schützenswert';
            case 'gesetzlich': return 'gesetzlich';
            default: return 'Unbekannt';
        }
    }
  return (
    <Card className="overflow-hidden relative min-h-[250px] flex flex-col justify-end">
      <Image 
        src={imageSrc} 
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 250px"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <CardContent className="relative z-10 flex flex-col justify-end p-4 text-white" >
        <div>
            <h3 className="font-medium text-lg mb-1">{title}</h3>
            <div className="flex items-center text-sm mb-1">
              <MapPin className="w-4 h-4 mr-1" />
              {location}
            </div>
            <div className="flex items-center text-sm mb-2">
              <User className="w-4 h-4 mr-1" />
              {recorder}
            </div>
            <div className="flex justify-between items-end">
              <p className="text-sm">{org}</p>
              <Badge variant="outline" className={`${getStatusStyle(status)} border whitespace-nowrap`}>
                {getStatusText(status)}
              </Badge>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};