const assets = {
  lockup: { src: '/brand/nsoroma-logo.png' },
  mark: { src: '/brand/nsoroma-mark.png' },
} as const;

type BrandLogoVariant = keyof typeof assets;

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  /** Set when the word “Nsoroma” is already visible next to the image. */
  decorative?: boolean;
}

export default function BrandLogo({
  variant = 'lockup',
  className,
  decorative = false,
}: BrandLogoProps) {
  const asset = assets[variant];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset.src} alt={decorative ? '' : 'Nsoroma'} className={className} />
  );
}
