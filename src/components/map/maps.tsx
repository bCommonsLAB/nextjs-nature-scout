import React from 'react';
import dynamic from 'next/dynamic';

const MapNoSSR = dynamic(() => import('./mapNoSSR'), {
  ssr: false,
});

interface MapProps {
  position: [number, number];
  zoom: number;
  onCenterChange: (newCenter: [number, number]) => void;
}

const Map: React.FC<MapProps> = ({ position, zoom, onCenterChange }) => {
  return (
    <div className="w-full h-full relative">
      <MapNoSSR position={position} zoom={zoom} onCenterChange={onCenterChange} />
    </div>
  );
};

export default Map;

