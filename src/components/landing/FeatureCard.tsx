import { Camera, Building, MapPinCheck  } from "lucide-react";
import { FeatureCardProps } from "../../types/landingpage";
import type { LucideIcon } from "lucide-react";

type IconType = LucideIcon;

const iconMap: Record<string, IconType> = {
  camera: Camera,
  building: Building,
  map : MapPinCheck ,
};

export function FeatureCard({ iconSrc, title, description }: FeatureCardProps) {
  const IconComponent = iconMap[iconSrc];

  return (
    <div className="flex flex-col flex-1 shrink basis-0 min-w-[240px] items-center text-center">
      <div className="flex flex-col w-full items-center">
        {IconComponent && <IconComponent size={48} className="mb-2" />}
        <div className="flex flex-col items-center mt-2 w-full">
          <div className="text-2xl font-bold leading-snug text-center">{title}</div>
          <div className="mt-3 text-base leading-6 text-center">{description}</div>
        </div>
      </div>
    </div>
  );
};