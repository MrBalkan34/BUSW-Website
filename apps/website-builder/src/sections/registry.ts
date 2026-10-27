import { newId } from "../model/ids";
import type { ImageRef, Section, SectionPropsMap, SectionType } from "../model/types";

export const emptyImage = (): ImageRef => ({ assetId: null, alt: "", decorative: false });

interface SectionInfo {
  label: string;
  description: string;
  defaults(): SectionPropsMap[SectionType];
}

export const SECTION_INFO: Record<SectionType, SectionInfo> = {
  hero: {
    label: "Hero",
    description: "Headline, short description, a button and an image.",
    defaults: () => ({ heading: "A short headline about what you do", subheading: "One or two sentences that explain it.", buttonLabel: "", buttonHref: "", image: emptyImage() }),
  },
  textImage: {
    label: "Text and image",
    description: "A heading and paragraphs next to a picture.",
    defaults: () => ({ heading: "About", body: "Write a few sentences here.\n\nLeave a blank line to start a new paragraph.", image: emptyImage(), imageSide: "right" }),
  },
  features: {
    label: "Feature cards",
    description: "A row of short cards, for services or highlights.",
    defaults: () => ({
      heading: "What I offer",
      intro: "",
      items: [
        { title: "First item", text: "A sentence describing it." },
        { title: "Second item", text: "A sentence describing it." },
        { title: "Third item", text: "A sentence describing it." },
      ],
    }),
  },
  gallery: {
    label: "Image gallery",
    description: "A grid of pictures with optional captions.",
    defaults: () => ({ heading: "Gallery", items: [{ image: emptyImage(), caption: "" }, { image: emptyImage(), caption: "" }, { image: emptyImage(), caption: "" }] }),
  },
  contact: {
    label: "Contact",
    description: "Email, phone and address. No form: visitors use your email link.",
    defaults: () => ({ heading: "Contact", text: "The best way to reach me is by email.", email: "", phone: "", address: "" }),
  },
};

export const SECTION_TYPES = Object.keys(SECTION_INFO) as SectionType[];

export function createSection(type: SectionType, anchor = ""): Section {
  return { id: newId("s"), type, anchor, props: SECTION_INFO[type].defaults() } as Section;
}
