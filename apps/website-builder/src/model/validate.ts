import { isCountryCode } from "../pricing/regions";
import { defaultOrder, HOME_SLUG } from "./order";
import { newId, newProjectId } from "./ids";
import {
  LIMITS,
  PROJECT_VERSION,
  QUOTE_IDS,
  type Addons,
  type Asset,
  type ClientDetails,
  type ContactProps,
  type ExtraLanguage,
  type FeaturesProps,
  type FooterProps,
  type GalleryProps,
  type HeaderProps,
  type HeroProps,
  type ImageRef,
  type Order,
  type Page,
  type Project,
  type Section,
  type SectionType,
  type TextImageProps,
} from "./types";
import { isAnchorSlug } from "./urls";

class ValidationError extends Error {}

type Schema<T> = (value: unknown, path: string) => T;

function fail(path: string, message: string): never {
  throw new ValidationError(`${path}: ${message}`);
}

const str =
  (max: number): Schema<string> =>
  (value, path) => {
    if (typeof value !== "string") fail(path, "expected text");
    if (value.length > max) fail(path, `longer than ${max} characters`);
    return value;
  };

const bool: Schema<boolean> = (value, path) => {
  if (typeof value !== "boolean") fail(path, "expected true or false");
  return value;
};

const count =
  (max: number): Schema<number> =>
  (value, path) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) fail(path, `expected a whole number from 0 to ${max}`);
    return value;
  };

const oneOf =
  <T extends string>(options: readonly T[]): Schema<T> =>
  (value, path) => {
    if (typeof value !== "string" || !options.includes(value as T)) {
      fail(path, `expected one of ${options.join(", ")}`);
    }
    return value as T;
  };

const arr =
  <T>(item: Schema<T>, max: number): Schema<T[]> =>
  (value, path) => {
    if (!Array.isArray(value)) fail(path, "expected a list");
    if (value.length > max) fail(path, `more than ${max} items`);
    return value.map((entry, i) => item(entry, `${path}[${i}]`));
  };

function obj<T>(shape: { [K in keyof T]: Schema<T[K]> }): Schema<T> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      fail(path, "expected an object");
    }
    const record = value as Record<string, unknown>;
    const out: Partial<T> = {};
    for (const key of Object.keys(shape) as (keyof T)[]) {
      out[key] = shape[key](record[key as string], `${path}.${String(key)}`);
    }
    return out as T;
  };
}

const image: Schema<ImageRef> = obj<ImageRef>({
  assetId: (value, path) => (value === null ? null : str(80)(value, path)),
  alt: str(LIMITS.short),
  decorative: bool,
});

const header: Schema<HeaderProps> = obj<HeaderProps>({
  brand: str(LIMITS.short),
  links: arr(obj({ label: str(60), href: str(LIMITS.short) }), LIMITS.navLinks),
});

const footer: Schema<FooterProps> = obj<FooterProps>({ text: str(LIMITS.short) });

const SECTION_SCHEMAS: { [T in SectionType]: Schema<Section["props"]> } = {
  hero: obj<HeroProps>({
    heading: str(LIMITS.heading),
    subheading: str(LIMITS.text),
    buttonLabel: str(60),
    buttonHref: str(LIMITS.short),
    image,
  }),
  textImage: obj<TextImageProps>({
    heading: str(LIMITS.heading),
    body: str(LIMITS.body),
    image,
    imageSide: oneOf(["left", "right"] as const),
  }),
  features: obj<FeaturesProps>({
    heading: str(LIMITS.heading),
    intro: str(LIMITS.text),
    items: arr(obj({ title: str(LIMITS.short), text: str(LIMITS.text) }), LIMITS.features),
  }),
  gallery: obj<GalleryProps>({
    heading: str(LIMITS.heading),
    items: arr(obj({ image, caption: str(LIMITS.short) }), LIMITS.gallery),
  }),
  contact: obj<ContactProps>({
    heading: str(LIMITS.heading),
    text: str(LIMITS.text),
    email: str(LIMITS.short),
    phone: str(60),
    address: str(LIMITS.short),
  }),
} as { [T in SectionType]: Schema<Section["props"]> };

const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

const section: Schema<Section> = (value, path) => {
  if (typeof value !== "object" || value === null) fail(path, "expected an object");
  const record = value as Record<string, unknown>;
  const type = oneOf(SECTION_TYPES)(record.type, `${path}.type`);
  const anchor = str(40)(record.anchor, `${path}.anchor`);
  if (!isAnchorSlug(anchor)) fail(`${path}.anchor`, "use lowercase letters, numbers and hyphens");
  return {
    id: str(80)(record.id, `${path}.id`),
    type,
    anchor,
    props: SECTION_SCHEMAS[type](record.props, `${path}.props`),
  } as Section;
};

const SLUG = /^[a-z][a-z0-9-]{0,39}$/;

const page: Schema<Page> = obj<Page>({
  id: str(80),
  title: str(LIMITS.title),
  slug: (value, path) => {
    const slug = str(40)(value, path);
    if (slug !== HOME_SLUG && !SLUG.test(slug)) fail(path, "use lowercase letters, numbers and hyphens, starting with a letter");
    return slug;
  },
  description: str(LIMITS.description),
  customLayout: bool,
  copywriting: bool,
  sections: arr(section, LIMITS.sections),
});

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

const dimension: Schema<number> = (v, p) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 10000) fail(p, "invalid size");
  return v;
};

const asset: Schema<Asset> = obj<Asset>({
  id: str(80),
  name: str(LIMITS.short),
  mime: oneOf(["image/jpeg", "image/png", "image/webp"] as const),
  width: dimension,
  height: dimension,
  dataUrl: (v, p) => {
    const text = str(LIMITS.assetBytes * 2)(v, p);
    if (!DATA_URL.test(text)) fail(p, "not a supported embedded image");
    return text;
  },
});

const language: Schema<ExtraLanguage> = obj<ExtraLanguage>({
  id: str(80),
  name: str(60),
  allPages: bool,
  pageCount: count(LIMITS.pages),
});

const addons: Schema<Addons> = obj<Addons>({
  advancedForm: bool,
  booking: bool,
  blog: bool,
  analytics: bool,
  businessEmail: bool,
  photoGalleries: count(LIMITS.quantity),
  imagePrepBatches: count(LIMITS.quantity),
  migrationPages: count(LIMITS.quantity),
  extraRevisions: count(LIMITS.quantity),
  languages: arr(language, LIMITS.languages),
  hosting: oneOf(["none", "hosting", "care"] as const),
  quoteRequests: arr(oneOf(QUOTE_IDS), QUOTE_IDS.length),
});

const client: Schema<ClientDetails> = obj<ClientDetails>({
  businessName: str(LIMITS.name),
  contactName: str(LIMITS.name),
  email: str(LIMITS.short),
  notes: str(LIMITS.notes),
});

const order: Schema<Order> = obj<Order>({
  country: (value, path) => {
    if (value === null) return null;
    const code = str(2)(value, path);
    if (!isCountryCode(code)) fail(path, "unknown country");
    return code;
  },
  addons,
  client,
});

const projectSchema: Schema<Project> = (value, path) => {
  if (typeof value !== "object" || value === null) fail(path, "expected an object");
  const r = value as Record<string, unknown>;
  if (r.version !== PROJECT_VERSION) fail(`${path}.version`, `unsupported version (expected ${PROJECT_VERSION})`);

  const assetsRaw = r.assets;
  if (typeof assetsRaw !== "object" || assetsRaw === null || Array.isArray(assetsRaw)) {
    fail(`${path}.assets`, "expected an object");
  }
  const assetEntries = Object.entries(assetsRaw as Record<string, unknown>);
  if (assetEntries.length > LIMITS.assets) fail(`${path}.assets`, `more than ${LIMITS.assets} images`);
  const assets: Record<string, Asset> = {};
  for (const [key, entry] of assetEntries) {
    const parsed = asset(entry, `${path}.assets.${key}`);
    if (parsed.id !== key) fail(`${path}.assets.${key}`, "id does not match its key");
    assets[key] = parsed;
  }

  const pages = arr(page, LIMITS.pages)(r.pages, `${path}.pages`);
  if (pages.length === 0) fail(`${path}.pages`, "a site needs at least one page");
  if (pages[0]?.slug !== HOME_SLUG) fail(`${path}.pages[0].slug`, `the first page must use the slug "${HOME_SLUG}"`);
  const pageIds = new Set<string>();
  const slugs = new Set<string>();
  const sectionIds = new Set<string>();
  pages.forEach((p, i) => {
    if (pageIds.has(p.id)) fail(`${path}.pages`, `duplicate page id ${p.id}`);
    pageIds.add(p.id);
    if (slugs.has(p.slug)) fail(`${path}.pages`, `duplicate page slug ${p.slug}`);
    slugs.add(p.slug);
    if (i > 0 && p.slug === HOME_SLUG) fail(`${path}.pages[${i}].slug`, `"${HOME_SLUG}" is reserved for the home page`);
    if (i === 0 && p.customLayout) fail(`${path}.pages[0].customLayout`, "the home page uses a quote request for a custom layout");
    for (const s of p.sections) {
      if (sectionIds.has(s.id)) fail(`${path}.pages`, `duplicate section id ${s.id}`);
      sectionIds.add(s.id);
    }
  });

  return {
    version: PROJECT_VERSION,
    id: str(80)(r.id, `${path}.id`),
    templateId: r.templateId === null ? null : str(60)(r.templateId, `${path}.templateId`),
    site: obj<Project["site"]>({
      title: str(LIMITS.title),
      description: str(LIMITS.description),
      lang: (v, p) => {
        const text = str(20)(v, p);
        if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(text)) fail(p, "invalid language code");
        return text;
      },
    })(r.site, `${path}.site`),
    theme: obj<Project["theme"]>({
      palette: oneOf(["paper", "ink", "sand", "forest"] as const),
      font: oneOf(["system", "humanist", "serif"] as const),
    })(r.theme, `${path}.theme`),
    header: r.header === null ? null : header(r.header, `${path}.header`),
    footer: r.footer === null ? null : footer(r.footer, `${path}.footer`),
    pages,
    assets,
    order: order(r.order, `${path}.order`),
  };
};

/** Version 1 projects had one list of sections. They become the home page of a version 2 project. */
function migrate(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const record = input as Record<string, unknown>;
  if (record.version !== 1) return input;
  const { sections, ...rest } = record;
  const site = (record.site ?? {}) as { title?: unknown };
  return {
    ...rest,
    version: PROJECT_VERSION,
    id: newProjectId(),
    // Earlier drafts had no template. Marking them as a custom design means choosing a template later asks before replacing them.
    templateId: "custom",
    pages: [
      {
        id: newId("pg"),
        title: typeof site.title === "string" && site.title ? site.title : "Home",
        slug: HOME_SLUG,
        description: "",
        customLayout: false,
        copywriting: false,
        sections,
      },
    ],
    order: defaultOrder(),
  };
}

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string };

/** Strictly validates untrusted data (an opened file, a stored draft or a submission). */
export function parseProject(input: unknown): ParseResult {
  try {
    return { ok: true, project: projectSchema(migrate(input), "project") };
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message };
    throw error;
  }
}
