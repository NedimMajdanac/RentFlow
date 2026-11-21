export const MAX_PHOTOS = 10;                     // isto kao backend
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;   // isto kao backend
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const photoKey = (f: File): string => `${f.name}|${f.size}|${f.lastModified}`;

export async function looksLikeImage(file: File): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b.length < 12) return false;

  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50; // WEBP
  return jpeg || png || webp;
}