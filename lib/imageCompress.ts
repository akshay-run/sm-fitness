export type CompressOptions = {
  maxBytes: number;
  maxWidth?: number;
  maxHeight?: number;
};

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawScaled(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
) {
  const { width, height } = img;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const w = Math.max(1, Math.floor(width * scale));
  const h = Math.max(1, Math.floor(height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    );
  });
}

export async function compressImageToJpeg(
  file: File,
  { maxBytes, maxWidth = 720, maxHeight = 720 }: CompressOptions
) {
  const img = await fileToImage(file);
  const canvas = document.createElement("canvas");
  drawScaled(img, canvas, maxWidth, maxHeight);

  // Quality sweep down to hit size target.
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  // If still too large, reduce resolution and try again once.
  if (blob.size > maxBytes) {
    const smallerCanvas = document.createElement("canvas");
    const w = Math.max(240, Math.floor(canvas.width * 0.75));
    const h = Math.max(240, Math.floor(canvas.height * 0.75));
    smallerCanvas.width = w;
    smallerCanvas.height = h;
    const ctx = smallerCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(canvas, 0, 0, w, h);

    quality = 0.75;
    blob = await canvasToBlob(smallerCanvas, quality);
    while (blob.size > maxBytes && quality > 0.35) {
      quality -= 0.08;
      blob = await canvasToBlob(smallerCanvas, quality);
    }
  }

  return blob;
}

