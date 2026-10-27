import { pruneAssets } from "../model/reducer";
import type { Project } from "../model/types";
import { parseProject, type ParseResult } from "../model/validate";

const MAX_FILE_BYTES = 60_000_000;

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function fileSlug(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || "website";
}

export function saveProjectFile(project: Project): void {
  const json = JSON.stringify(pruneAssets(project));
  downloadBlob(`${fileSlug(project.site.title)}.busw-site.json`, new Blob([json], { type: "application/json" }));
}

export type ReadResult = { ok: true; project: Project } | { ok: false; error: string; code: "too-large" | "not-project" | "invalid" };

/** `error` is a plain-English diagnostic; `code` lets the interface show the reason in the client's language. */
export async function readProjectFile(file: File): Promise<ReadResult> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "That file is too large to be a project.", code: "too-large" };
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "That file is not a BUSW Website Builder project.", code: "not-project" };
  }
  const parsed: ParseResult = parseProject(data);
  return parsed.ok ? parsed : { ok: false, error: parsed.error, code: "invalid" };
}
