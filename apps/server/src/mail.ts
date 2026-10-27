import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "./config";

export type Lang = "en" | "tr";
export const toLang = (value: unknown): Lang => (value === "tr" ? "tr" : "en");

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  readonly kind: Config["email"]["kind"];
  /** Rejects if the message could not be handed to the mail system. Callers must report that truthfully. */
  send(message: MailMessage): Promise<void>;
  /** False when mail cannot be sent right now (not configured, or the provider is unreachable). */
  healthy(): Promise<boolean>;
  /** Development and test transports keep what they "sent". Real transports return nothing. */
  readonly outbox: readonly (MailMessage & { at: string })[];
}

class SmtpMailer implements Mailer {
  readonly kind = "smtp" as const;
  readonly outbox: never[] = [];
  private transport: Transporter;
  private lastCheck = { at: 0, ok: false };

  constructor(private readonly config: Config) {
    this.transport = nodemailer.createTransport(config.email.smtpUrl as string);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.config.email.from, to: message.to, subject: message.subject, text: message.text });
  }

  async healthy(): Promise<boolean> {
    if (Date.now() - this.lastCheck.at < 30_000) return this.lastCheck.ok;
    let ok = false;
    try {
      ok = (await this.transport.verify()) === true;
    } catch {
      ok = false;
    }
    this.lastCheck = { at: Date.now(), ok };
    return ok;
  }
}

/** Keeps messages in memory (and, for local development, as files). Refused outright in production by loadConfig. */
class DevMailer implements Mailer {
  readonly outbox: (MailMessage & { at: string })[] = [];
  failNext = false;
  /** Simulates the mail system being unreachable. */
  down = false;

  constructor(
    readonly kind: "dev-outbox" | "memory",
    private readonly dir: string | null,
  ) {
    if (dir) mkdirSync(dir, { recursive: true });
  }

  async send(message: MailMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Simulated delivery failure");
    }
    const entry = { ...message, at: new Date().toISOString() };
    this.outbox.push(entry);
    if (this.dir) writeFileSync(join(this.dir, `${entry.at.replace(/[:.]/g, "-")}-${this.outbox.length}.txt`), `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
  }

  async healthy(): Promise<boolean> {
    return !this.down;
  }
}

export function createMailer(config: Config): Mailer {
  if (config.email.kind === "smtp") return new SmtpMailer(config);
  return new DevMailer(config.email.kind, config.email.kind === "dev-outbox" ? join(config.dataDir, "outbox") : null);
}

export type TestMailer = DevMailer;

const COPY = {
  en: {
    verify: (url: string) => ({ subject: "Verify your Balkan Universal Account email", text: `Welcome to Balkan Universal Account.\n\nConfirm that this is your email address:\n${url}\n\nThe link works once and expires in one hour. If you did not create an account, ignore this message.` }),
    reset: (url: string) => ({ subject: "Reset your Balkan Universal Account password", text: `Someone asked to reset the password for this Balkan Universal Account.\n\nChoose a new password:\n${url}\n\nThe link works once and expires in one hour. If this was not you, ignore this message; your password has not changed.` }),
    approveChange: (url: string, to: string) => ({ subject: "Approve an email address change", text: `A change of the email address on your Balkan Universal Account to ${to} was requested.\n\nApprove it:\n${url}\n\nYour current address stays active until the change is finished. If this was not you, ignore this message and change your password.` }),
    verifyNew: (url: string) => ({ subject: "Confirm your new email address", text: `Confirm that this is your new email address for Balkan Universal Account:\n${url}\n\nThe link works once and expires in one hour.` }),
    staff: (reference: string, url: string) => ({ subject: `New website submission ${reference}`, text: `A new website project was submitted: ${reference}\n\nOpen it in BUSW administration:\n${url}\n\n(No project content is included in this message.)` }),
  },
  tr: {
    verify: (url: string) => ({ subject: "Balkan Universal Account e-postanızı doğrulayın", text: `Balkan Universal Account'a hoş geldiniz.\n\nBu e-posta adresinin size ait olduğunu doğrulayın:\n${url}\n\nBağlantı bir kez çalışır ve bir saat içinde geçerliliğini yitirir. Hesap oluşturmadıysanız bu iletiyi yok sayın.` }),
    reset: (url: string) => ({ subject: "Balkan Universal Account parolanızı sıfırlayın", text: `Biri bu Balkan Universal Account'un parolasını sıfırlamak istedi.\n\nYeni bir parola seçin:\n${url}\n\nBağlantı bir kez çalışır ve bir saat içinde geçerliliğini yitirir. Bu istek size ait değilse iletiyi yok sayın; parolanız değişmedi.` }),
    approveChange: (url: string, to: string) => ({ subject: "E-posta adresi değişikliğini onaylayın", text: `Balkan Universal Account hesabınızın e-posta adresinin ${to} olarak değiştirilmesi istendi.\n\nDeğişikliği onaylayın:\n${url}\n\nDeğişiklik tamamlanana kadar mevcut adresiniz geçerli kalır. Bu istek size ait değilse iletiyi yok sayın ve parolanızı değiştirin.` }),
    verifyNew: (url: string) => ({ subject: "Yeni e-posta adresinizi doğrulayın", text: `Bu adresin Balkan Universal Account için yeni e-posta adresiniz olduğunu doğrulayın:\n${url}\n\nBağlantı bir kez çalışır ve bir saat içinde geçerliliğini yitirir.` }),
    staff: (reference: string, url: string) => ({ subject: `Yeni web sitesi başvurusu ${reference}`, text: `Yeni bir web sitesi projesi gönderildi: ${reference}\n\nBUSW yönetiminde açın:\n${url}\n\n(Bu iletide proje içeriği yer almaz.)` }),
  },
} as const;

export const mailCopy = (lang: Lang) => COPY[lang];
