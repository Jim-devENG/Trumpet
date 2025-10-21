import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface UseImageUrlResult {
  imageUrl: string;
  isLoading: boolean;
  error: string | null;
}

export const useImageUrl = (imagePath: string): UseImageUrlResult => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl('');
      setIsLoading(false);
      setError(null);
      return;
    }

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      setImageUrl(imagePath);
      setIsLoading(false);
      setError(null);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First try the regular URL
        const regularUrl = apiService.getImageUrl(imagePath);
        
        // Test if the regular URL works by creating an image element
        const testImage = new Image();
        
        const testPromise = new Promise<string>((resolve, reject) => {
          testImage.onload = () => {
            console.log('✅ REGULAR IMAGE URL WORKS:', regularUrl);
            resolve(regularUrl);
          };
          testImage.onerror = () => {
            console.log('❌ REGULAR IMAGE URL FAILED, TRYING BASE64:', regularUrl);
            reject(new Error('Regular URL failed'));
          };
          testImage.src = regularUrl;
        });

        try {
          const url = await testPromise;
          setImageUrl(url);
        } catch (regularError) {
          // If regular URL fails, try base64
          console.log('🔄 FALLING BACK TO BASE64 FOR:', imagePath);
          const base64Url = await apiService.getImageUrlBase64(imagePath);
          setImageUrl(base64Url);
        }
      } catch (err) {
        console.error('❌ ERROR LOADING IMAGE:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setImageUrl('');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imagePath]);

  return { imageUrl, isLoading, error };
};


