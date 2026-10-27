import { createInterface } from "node:readline/promises";
import { userInfo } from "node:os";
import { loadConfig } from "../config";
import { createServices, type Services } from "../services";

export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else out[key] = true;
  }
  return out;
}

export async function withServices<T>(work: (services: Services) => Promise<T>): Promise<T> {
  const services = await createServices(loadConfig());
  try {
    return await work(services);
  } finally {
    services.db.close();
  }
}

export const operatorName = (): string => {
  let host = "host";
  try {
    host = userInfo().username;
  } catch {
    // Some environments hide the account name.
  }
  return `operator:${host}`;
};

export async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export function main(work: () => Promise<void>): void {
  work().catch((error: unknown) => {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
