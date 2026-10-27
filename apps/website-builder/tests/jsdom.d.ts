// The tests need only a sliver of jsdom and of Node's file API, and neither ships types in this project.
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: Record<string, unknown>);
    window: Window & typeof globalThis & { eval(code: string): unknown };
  }
}

declare module "node:fs" {
  export function readFileSync(path: URL, encoding: "utf8"): string;
}
