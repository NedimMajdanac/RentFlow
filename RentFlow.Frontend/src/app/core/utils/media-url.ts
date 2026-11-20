import { environment } from "../../environments/environment.development";

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${environment.apiUrl}${url}`;
}