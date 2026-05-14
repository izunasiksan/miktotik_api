import html2canvas from 'html2canvas';

/**
 * Capture an element and download it as an image.
 * @param {string} elementId - The ID of the element to capture.
 * @param {string} fileName - The name of the downloaded file.
 */
export const downloadElementAsImage = async (elementId, fileName = 'chart.png') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Add a small delay to ensure any animations are completed
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 3, // Higher quality for printing/reports
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Optional: you can modify the cloned element before capturing
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.padding = '20px';
          clonedElement.style.borderRadius = '0px';
        }
      }
    });
    
    // Use blob for better memory efficiency and quality control
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0); // Highest quality setting
  } catch (error) {
    console.error('Error capturing element:', error);
  }
};
