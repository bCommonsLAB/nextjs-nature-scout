import { HelpCircle } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

interface TooltipDetail {
  [key: string]: string;
}

interface ParameterHeadingProps {
  title: string;
  description: string;
  details: TooltipDetail;
}

export function ParameterHeading({ title, description, details }: ParameterHeadingProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="font-semibold capitalize">{title}</span>
      <HelpCircle 
        className="w-4 h-4 text-gray-400 cursor-help"
        data-tooltip-id={`${title.toLowerCase()}-tooltip`}
      />
      <Tooltip id={`${title.toLowerCase()}-tooltip`}>
        <div className="max-w-xs">
          <h3 className="font-semibold mb-2 capitalize">{title}</h3>
          <p className="mb-2">{description}</p>
          <ul className="space-y-4">
            {Object.entries(details).map(([key, value]) => (
              <li key={key}>
                <span className="font-bold">{key.replace(/_/g, ' ')}:</span> {value}
              </li>
            ))}
          </ul>
        </div>
      </Tooltip>
    </div>
  );
}