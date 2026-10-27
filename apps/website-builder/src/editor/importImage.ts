import { english, type TranslateFn } from "../i18n/translate";
import { newId } from "../model/ids";
import { LIMITS, type Asset } from "../model/types";

export const MAX_DIMENSION = 1600;
export const MAX_INPUT_BYTES = 25_000_000;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Reads an image file, shrinks it to at most 1600px on its longest side and re-encodes it so
 * projects and exported sites stay small. Returns an Asset, or a message for the user.
 */
export async function importImage(file: File, t: TranslateFn = english.t): Promise<Asset | string> {
  if (!ACCEPTED.includes(file.type)) return t("image.badType");
  if (file.size > MAX_INPUT_BYTES) return t("image.tooLarge");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return t("image.unreadable");
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return t("image.noCanvas");
    context.drawImage(bitmap, 0, 0, width, height);

    const preferred = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await canvasToBlob(canvas, preferred, quality);
      if (!blob) continue;
      const mime = blob.type === "image/jpeg" || blob.type === "image/webp" || blob.type === "image/png" ? blob.type : null;
      if (!mime || blob.size > LIMITS.assetBytes) continue;
      return {
        id: newId("img"),
        name: file.name.slice(0, 120) || "image",
        mime,
        width,
        height,
        dataUrl: await blobToDataUrl(blob),
      };
    }
    return t("image.stillTooLarge");
  } finally {
    bitmap.close();
  }
}
