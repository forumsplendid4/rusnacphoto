/**
 * Embeds text watermark into image and compresses it for faster upload/load.
 * Returns JPEG Blob.
 */
export async function applyWatermark(file: File, watermarkText: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const maxDimension = 2400;
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

  const fontSize = Math.max(width, height) * 0.05;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = fontSize * 0.05;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-30 * Math.PI) / 180);

  const textWidth = Math.max(ctx.measureText(watermarkText).width, fontSize * 4);
  const spacingX = textWidth + fontSize * 1.5;
  const spacingY = fontSize * 3.5;
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

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
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.82,
    );
  });
}
