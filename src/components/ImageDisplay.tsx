"use client";

import Image from 'next/image';

interface ImageDisplayProps {
  filename: string;
  alt: string;
  width: number;
  height: number;
  preserveOrientation?: boolean;
}

export function ImageDisplay({ filename, alt, width, height, preserveOrientation = true }: ImageDisplayProps) {
  const imageUrl = `/api/images/${filename}`;
  
  if (preserveOrientation) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        unoptimized={true}
        className="habitat-image object-cover"
      />
    );
  }
  
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className="object-cover"
    />
  );
} 