/**
 * Embeds a text watermark directly onto an image using canvas.
 * Returns a Blob of the watermarked image (JPEG).
 */
export async function applyWatermark(
  file: File,
  watermarkText: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure watermark style
      const fontSize = Math.max(img.width, img.height) * 0.06;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = fontSize * 0.05;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Tile watermark across the image at -30 degrees
      ctx.save();
      ctx.translate(img.width / 2, img.height / 2);
      ctx.rotate((-30 * Math.PI) / 180);

      const textWidth = ctx.measureText(watermarkText).width;
      const spacingX = textWidth + fontSize * 2;
      const spacingY = fontSize * 4;
      const diagonal = Math.sqrt(img.width ** 2 + img.height ** 2);

      for (let y = -diagonal; y < diagonal; y += spacingY) {
        for (let x = -diagonal; x < diagonal; x += spacingX) {
          ctx.strokeText(watermarkText, x, y);
          ctx.fillText(watermarkText, x, y);
        }
      }
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
