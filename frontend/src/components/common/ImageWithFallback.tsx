import React from 'react';
import { useImageUrl } from '../../hooks/useImageUrl';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  onLoad,
  onError
}) => {
  const { imageUrl, isLoading, error } = useImageUrl(src);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 min-h-32 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-500 min-h-32 ${className}`}>
        <div className="text-center">
          <div className="text-sm">Image not available</div>
          {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={onError}
    />
  );
};
