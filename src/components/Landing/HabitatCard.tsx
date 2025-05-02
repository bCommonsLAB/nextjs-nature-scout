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
          width={340}
          height={240}
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <CardContent className="relative z-10 flex flex-col justify-end p-4 text-white">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="font-medium text-lg mb-1">{title}</h3>
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{location}</span>
            </div>
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{recorder}</span>
            </div>
            {org && <p className="text-sm">{org}</p>}
          </div>
          <Badge variant="outline" className={`${getStatusStyle(status)} border whitespace-nowrap ml-2 self-end`}>
            {getStatusText(status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};