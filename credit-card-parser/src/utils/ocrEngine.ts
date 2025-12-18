import Tesseract from 'tesseract.js';

export async function extractTextWithOCR(
  image: HTMLCanvasElement | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      image,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress * 100);
          }
        }
      }
    );
    
    return result.data.text;
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error('Failed to perform OCR on image');
  }
}

export async function extractTextFromMultiplePages(
  canvases: HTMLCanvasElement[],
  onProgress?: (progress: number) => void
): Promise<string> {
  let fullText = '';
  const totalPages = canvases.length;
  
  for (let i = 0; i < canvases.length; i++) {
    const pageText = await extractTextWithOCR(canvases[i], (pageProgress) => {
      const overallProgress = ((i / totalPages) * 100) + (pageProgress / totalPages);
      if (onProgress) {
        onProgress(overallProgress);
      }
    });
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}
