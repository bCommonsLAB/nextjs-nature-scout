export interface HabitatCardProps {
    imageSrc: string;
    title: string;
    location: string;
    recorder: string;
    status: string,
    org: string,
    orgLogo?: string
}

export interface FeatureCardProps {
    iconSrc: string;
    title: string;
    description: string;
}

export interface ProcessStepProps {
    iconSrc: string;
    title: string;
}