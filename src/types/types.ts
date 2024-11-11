export interface ImageAnalysisResult {
    analysis: string;
    error?: string;
} 

export interface Bild {
    url: string;
    filename?: string;
  }
  
  export interface GetImageProps {
    imageTitle: string;
    anweisung: string;
    onBildUpload: (imageTitle: string, filename: string, url: string, analysis: string) => void;
    existingImage?: Bild;
  }