/**
 * Embeds an aggressive "PREVIEW" watermark and compresses the image.
 * Returns JPEG Blob (~1-2 MB for a typical 5 MB source).
 */
export async function applyWatermark(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas not supported");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // --- Aggressive watermark ---
  const watermarkText = "PREVIEW";
  const fontSize = Math.max(width, height) * 0.05;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = Math.max(ctx.measureText(watermarkText).width, fontSize * 4);
  const spacingX = textWidth * 1.6;
  const spacingY = fontSize * 3.2;
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-30 * Math.PI) / 180);

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = fontSize * 0.08;

  for (let y = -diagonal; y < diagonal; y += spacingY) {
    for (let x = -diagonal; x < diagonal; x += spacingX) {
      ctx.strokeText(watermarkText, x, y);
      ctx.fillText(watermarkText, x, y);
    }
  }

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Failed to create blob")); return; }
        resolve(blob);
      },
      "image/jpeg",
      0.45,
    );
  });
}

