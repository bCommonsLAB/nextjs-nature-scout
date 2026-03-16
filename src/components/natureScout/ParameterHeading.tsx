'use client';

import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TooltipDetail {
  [key: string]: string;
}

interface ParameterHeadingProps {
  title: string;
  description: string;
  details: TooltipDetail;
}

export function ParameterHeading({ title, description, details }: ParameterHeadingProps) {
  const entries = Object.entries(details).filter(([, value]) => value && value.trim() !== '');

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="font-semibold capitalize">{title}</span>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400/60"
            aria-label={`Erklärung zu ${title} öffnen`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="capitalize">{title}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(80vh-90px)] space-y-4 text-sm">
            {description ? (
              <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
            ) : (
              <p className="text-gray-500">Keine Beschreibung vorhanden.</p>
            )}

            {entries.length > 0 && (
              <ul className="space-y-4">
                {entries.map(([key, value]) => (
                  <li key={key} className="text-gray-700">
                    <span className="font-semibold">{key.replace(/_/g, ' ')}:</span>{' '}
                    <span className="whitespace-pre-wrap">{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}