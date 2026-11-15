"use client";
/**
 * Reconnaissance de texte sur une capture d'écran, ENTIÈREMENT sur le téléphone.
 * Le moteur (Tesseract) et les modèles de langue sont servis par le site lui-même (/ocr/),
 * puis gardés en cache : l'image ne quitte jamais l'iPhone.
 */
const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/ocr`;

/**
 * Prépare l'image : texte clair sur fond sombre (style du jeu) → texte noir sur fond blanc,
 * contraste renforcé. Tesseract lit beaucoup mieux ce format.
 */
async function prepare(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  // Taille raisonnable : assez grande pour les petits chiffres, pas trop pour la mémoire de l'iPhone.
  const scale = Math.min(2, 2400 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Inversion + contraste : les textes clairs deviennent noirs, le fond devient blanc.
    const v = Math.max(0, Math.min(255, (255 - lum - 128) * 1.6 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/png"));
}

/** Lit le texte d'une image. onProgress reçoit une valeur entre 0 et 1. */
export async function readScreenshot(file: Blob, onProgress?: (p: number, step: string) => void): Promise<string> {
  onProgress?.(0, "Chargement du moteur (1re fois : ~4 Mo)");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["eng", "fra"], 1, {
    workerPath: `${BASE}/worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    gzip: true,
    logger: (m: { status: string; progress: number }) => onProgress?.(m.progress, m.status === "recognizing text" ? "Lecture du texte" : "Préparation"),
  });
  try {
    const img = await prepare(file);
    const { data } = await worker.recognize(img);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
