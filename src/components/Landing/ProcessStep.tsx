import { User, Sparkles, CheckCircle, Database } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IconType = LucideIcon;

const iconMap: Record<string, IconType> = {
  user: User,
  sparkles: Sparkles,
  check: CheckCircle,
  database: Database,
};

interface ProcessStepProps {
  iconSrc: string;
  title: string;
}

export function ProcessStep({ iconSrc, title }: ProcessStepProps) {
  const IconComponent = iconMap[iconSrc];

  return (
    <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0 min-w-[240px]">
      <div className="flex flex-col w-full">
        {IconComponent && (
          <IconComponent 
            size={48}
            className="object-contain self-center w-12 aspect-square"
          />
        )}
        <div className="mt-6 w-full">{title}</div>
      </div>
    </div>
  );
}