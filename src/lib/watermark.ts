/**
 * Embeds aggressive text watermark into image and compresses it for faster upload/load.
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

  // --- Aggressive watermark ---
  const fontSize = Math.max(width, height) * 0.045;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = Math.max(ctx.measureText(watermarkText).width, fontSize * 4);
  const spacingX = textWidth + fontSize * 0.8;
  const spacingY = fontSize * 2.5;
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

  // Two passes at different angles for harder removal
  const passes = [
    { angle: -30, fillAlpha: 0.55, strokeAlpha: 0.3 },
    { angle: 30, fillAlpha: 0.35, strokeAlpha: 0.2 },
  ];

  for (const pass of passes) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((pass.angle * Math.PI) / 180);

    ctx.fillStyle = `rgba(255, 255, 255, ${pass.fillAlpha})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${pass.strokeAlpha})`;
    ctx.lineWidth = fontSize * 0.06;

    for (let y = -diagonal; y < diagonal; y += spacingY) {
      for (let x = -diagonal; x < diagonal; x += spacingX) {
        ctx.strokeText(watermarkText, x, y);
        ctx.fillText(watermarkText, x, y);
      }
    }

    ctx.restore();
  }

  // Third pass: large semi-transparent centered text
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-15 * Math.PI) / 180);
  const bigFontSize = Math.max(width, height) * 0.12;
  ctx.font = `bold ${bigFontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = bigFontSize * 0.04;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(watermarkText, 0, 0);
  ctx.fillText(watermarkText, 0, 0);
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
