"use client";

import Image from 'next/image';

interface ImageDisplayProps {
  filename: string;
  alt: string;
  width: number;
  height: number;
}

export function ImageDisplay({ filename, alt, width, height }: ImageDisplayProps) {
  const imageUrl = `/api/images/${filename}`;

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