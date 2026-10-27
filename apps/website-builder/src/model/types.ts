export const PROJECT_VERSION = 2;

export type PaletteId = "paper" | "ink" | "sand" | "forest";
export type FontId = "system" | "humanist" | "serif";

export interface ImageRef {
  /** Key into Project.assets, or null for an empty slot. */
  assetId: string | null;
  alt: string;
  /** Decorative images are exported with alt="". */
  decorative: boolean;
}

export interface Asset {
  id: string;
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  /** data: URL of the already-downscaled image. */
  dataUrl: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface HeaderProps {
  brand: string;
  links: NavLink[];
}

export interface FooterProps {
  text: string;
}

export interface HeroProps {
  heading: string;
  subheading: string;
  buttonLabel: string;
  buttonHref: string;
  image: ImageRef;
}

export interface TextImageProps {
  heading: string;
  /** Paragraphs separated by a blank line. */
  body: string;
  image: ImageRef;
  imageSide: "left" | "right";
}

export interface FeatureItem {
  title: string;
  text: string;
}

export interface FeaturesProps {
  heading: string;
  intro: string;
  items: FeatureItem[];
}

export interface GalleryItem {
  image: ImageRef;
  caption: string;
}

export interface GalleryProps {
  heading: string;
  items: GalleryItem[];
}

export interface ContactProps {
  heading: string;
  text: string;
  email: string;
  phone: string;
  address: string;
}

export interface SectionPropsMap {
  hero: HeroProps;
  textImage: TextImageProps;
  features: FeaturesProps;
  gallery: GalleryProps;
  contact: ContactProps;
}

export type SectionType = keyof SectionPropsMap;

export type Section = {
  [T in SectionType]: {
    id: string;
    type: T;
    /** Optional slug used as the HTML id so menu links like #work can target it. */
    anchor: string;
    props: SectionPropsMap[T];
  };
}[SectionType];

/** A page of the site. pages[0] is the home page and always has the slug "index". */
export interface Page {
  id: string;
  /** Used for the menu label and the browser tab title. */
  title: string;
  slug: string;
  /** Page description for search engines. */
  description: string;
  /** Additional pages only: the client wants a custom layout instead of the selected design. */
  customLayout: boolean;
  /** The client wants BUSW to write the text for this page. */
  copywriting: boolean;
  sections: Section[];
}

export interface SiteSettings {
  title: string;
  description: string;
  lang: string;
}

export interface ThemeSettings {
  palette: PaletteId;
  font: FontId;
}

/** Work that BUSW cannot price from the catalogue. It is recorded as a quote request. */
export const QUOTE_IDS = [
  "online-store",
  "customer-accounts",
  "payment-system",
  "custom-database",
  "api-integration",
  "complex-animations",
  "base-page-custom-layout",
] as const;
export type QuoteId = (typeof QUOTE_IDS)[number];

export type HostingChoice = "none" | "hosting" | "care";

export interface ExtraLanguage {
  id: string;
  name: string;
  /** When true the language covers every page, including pages added later. */
  allPages: boolean;
  /** Number of pages to translate when allPages is false. */
  pageCount: number;
}

export interface Addons {
  advancedForm: boolean;
  booking: boolean;
  blog: boolean;
  analytics: boolean;
  businessEmail: boolean;
  photoGalleries: number;
  imagePrepBatches: number;
  migrationPages: number;
  extraRevisions: number;
  languages: ExtraLanguage[];
  hosting: HostingChoice;
  quoteRequests: QuoteId[];
}

export interface ClientDetails {
  businessName: string;
  contactName: string;
  email: string;
  notes: string;
}

/** Everything the client decides besides the design itself. */
export interface Order {
  /** ISO 3166-1 alpha-2 code of the business's country; null until chosen. */
  country: string | null;
  addons: Addons;
  client: ClientDetails;
}

export interface Project {
  version: typeof PROJECT_VERSION;
  /** Stable id for this project; sent with a submission. */
  id: string;
  templateId: string | null;
  site: SiteSettings;
  theme: ThemeSettings;
  header: HeaderProps | null;
  footer: FooterProps | null;
  pages: Page[];
  assets: Record<string, Asset>;
  order: Order;
}

/** Selection is a section id, or one of the fixed blocks. */
export type SelectionId = string | "header" | "footer" | "site" | "page" | null;

export const LIMITS = {
  title: 120,
  heading: 160,
  short: 200,
  text: 2000,
  body: 6000,
  description: 300,
  notes: 3000,
  name: 120,
  pages: 20,
  sections: 40,
  navLinks: 8,
  features: 6,
  gallery: 12,
  assets: 60,
  assetBytes: 4_000_000,
  languages: 5,
  quantity: 99,
} as const;

/** The base package and every additional standard page include this many sections. */
export const INCLUDED_SECTIONS_PER_PAGE = 6;
