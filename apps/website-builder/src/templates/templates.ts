import { newId, newProjectId } from "../model/ids";
import { defaultOrder, HOME_SLUG } from "../model/order";
import { PROJECT_VERSION, type FontId, type PaletteId, type Project, type Section } from "../model/types";
import { createSection } from "../sections/registry";

export interface Template {
  id: string;
  name: string;
  description: string;
  palette: PaletteId;
  font: FontId;
  build(): Project;
}

function section<T extends Section["type"]>(type: T, anchor: string, props: Partial<Extract<Section, { type: T }>["props"]>): Section {
  const base = createSection(type, anchor);
  return { ...base, props: { ...base.props, ...props } } as Section;
}

const year = new Date().getFullYear();

type Parts = Pick<Project, "site" | "header" | "footer"> & { sections: Section[] };

function project(t: Pick<Template, "palette" | "font"> & { id: string | null }, parts: Parts): Project {
  const { sections, ...rest } = parts;
  return {
    version: PROJECT_VERSION,
    id: newProjectId(),
    templateId: t.id,
    theme: { palette: t.palette, font: t.font },
    assets: {},
    order: defaultOrder(),
    pages: [{ id: newId("pg"), title: "Home", slug: HOME_SLUG, description: rest.site.description, customLayout: false, copywriting: false, sections }],
    ...rest,
  };
}

const studio: Template = {
  id: "studio",
  name: "Studio",
  description: "A bold intro, a gallery of your work, a short about section and a way to get in touch.",
  palette: "ink",
  font: "system",
  build() {
    return project(this, {
      site: { title: "Your Studio", description: "A short description of your studio and the work you do.", lang: "en" },
      header: {
        brand: "Your Studio",
        links: [
          { label: "Work", href: "#work" },
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ],
      },
      footer: { text: `© ${year} Your Studio` },
      sections: [
        section("hero", "", { heading: "We make things that are worth looking at", subheading: "Replace this with one or two sentences about what you do and who it is for.", buttonLabel: "See our work", buttonHref: "#work" }),
        section("gallery", "work", { heading: "Selected work" }),
        section("textImage", "about", { heading: "About the studio", body: "Tell visitors who you are and what you care about.\n\nA short second paragraph works well for how you work." }),
        section("contact", "contact", { heading: "Let's talk", text: "Tell us about your project." }),
      ],
    });
  },
};

const localBusiness: Template = {
  id: "local-business",
  name: "Local business",
  description: "Services, a short story, and your address and opening details up front.",
  palette: "paper",
  font: "humanist",
  build() {
    return project(this, {
      site: { title: "Your Business", description: "What your business offers and where to find it.", lang: "en" },
      header: {
        brand: "Your Business",
        links: [
          { label: "Services", href: "#services" },
          { label: "About", href: "#about" },
          { label: "Visit us", href: "#contact" },
        ],
      },
      footer: { text: `© ${year} Your Business` },
      sections: [
        section("hero", "", { heading: "Friendly, reliable service in your area", subheading: "Say in a sentence what you offer and who you help.", buttonLabel: "Contact us", buttonHref: "#contact" }),
        section("features", "services", { heading: "Our services", intro: "", items: [{ title: "Service one", text: "Describe it in a sentence." }, { title: "Service two", text: "Describe it in a sentence." }, { title: "Service three", text: "Describe it in a sentence." }] }),
        section("textImage", "about", { heading: "About us", body: "Share how the business started and what you stand for.", imageSide: "left" }),
        section("contact", "contact", { heading: "Visit or get in touch", text: "Add your opening hours here." }),
      ],
    });
  },
};

const personal: Template = {
  id: "personal",
  name: "Personal page",
  description: "A calm single page to introduce yourself, share what you do and invite contact.",
  palette: "sand",
  font: "serif",
  build() {
    return project(this, {
      site: { title: "Your Name", description: "A short introduction to who you are and what you do.", lang: "en" },
      header: {
        brand: "Your Name",
        links: [
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ],
      },
      footer: { text: `© ${year} Your Name` },
      sections: [
        section("hero", "", { heading: "Hello, I'm Your Name", subheading: "A line about what you do or what you are working on.", buttonLabel: "Say hello", buttonHref: "#contact" }),
        section("textImage", "about", { heading: "About me", body: "Write a few sentences about yourself.\n\nMention what you enjoy working on." }),
        section("features", "", { heading: "Highlights", intro: "", items: [{ title: "Highlight one", text: "A sentence about it." }, { title: "Highlight two", text: "A sentence about it." }, { title: "Highlight three", text: "A sentence about it." }] }),
        section("contact", "contact", { heading: "Contact", text: "Email is the best way to reach me." }),
      ],
    });
  },
};

export const TEMPLATES: Template[] = [studio, localBusiness, personal];

function blankParts(): Parts {
  return {
    site: { title: "My website", description: "", lang: "en" },
    header: { brand: "My website", links: [] },
    footer: { text: `© ${year} My website` },
    sections: [createSection("hero")],
  };
}

/** The client chose to start from an empty page. */
export function blankProject(): Project {
  return project({ id: "blank", palette: "paper", font: "system" }, blankParts());
}

/** What the builder shows before any template has been chosen. */
export function placeholderProject(): Project {
  return project({ id: null, palette: "paper", font: "system" }, blankParts());
}
