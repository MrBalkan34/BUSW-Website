import { HOME_SLUG, findPageOfSection, pageFile, referencedAssetIds } from "./order";
import { LIMITS, type Asset, type FooterProps, type HeaderProps, type Page, type Project, type Section, type SelectionId } from "./types";

export type Path = (string | number)[];

export interface EditorState {
  past: Project[];
  present: Project;
  future: Project[];
  selected: SelectionId;
  /** The page being edited. It is view state, not part of the undo history. */
  activePageId: string;
  lastEdit: { key: string; at: number } | null;
}

export type PagePatch = Partial<Pick<Page, "title" | "slug" | "description" | "customLayout" | "copywriting">>;

export type Action =
  | { type: "load"; project: Project }
  | { type: "select"; id: SelectionId }
  | { type: "setActivePage"; id: string }
  | { type: "setProp"; target: string; path: Path; value: unknown; at: number }
  | { type: "setAnchor"; id: string; value: string; at: number }
  | { type: "addSection"; pageId: string; section: Section; afterId: string | null }
  | { type: "removeSection"; id: string }
  | { type: "moveSection"; id: string; dir: -1 | 1 }
  | { type: "duplicateSection"; id: string; newId: string }
  | { type: "addPage"; page: Page }
  | { type: "removePage"; id: string }
  | { type: "movePage"; id: string; dir: -1 | 1 }
  | { type: "setPage"; id: string; patch: PagePatch; at: number }
  | { type: "setOrder"; path: Path; value: unknown; at: number }
  | { type: "setHeader"; header: HeaderProps | null }
  | { type: "setFooter"; footer: FooterProps | null }
  | { type: "addAsset"; asset: Asset }
  | { type: "undo" }
  | { type: "redo" };

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 1000;

export function createState(project: Project): EditorState {
  return { past: [], present: project, future: [], selected: null, activePageId: project.pages[0]?.id ?? "", lastEdit: null };
}

export function setIn(root: unknown, path: Path, value: unknown): unknown {
  const [head, ...rest] = path;
  if (head === undefined) return value;
  if (Array.isArray(root)) {
    const copy = root.slice();
    copy[head as number] = setIn(root[head as number], rest, value);
    return copy;
  }
  const record = (root ?? {}) as Record<string, unknown>;
  return { ...record, [head]: setIn(record[head as string], rest, value) };
}

function commit(state: EditorState, next: Project, key: string | null, at: number): EditorState {
  const coalesce =
    key !== null && state.lastEdit !== null && state.lastEdit.key === key && at - state.lastEdit.at < COALESCE_MS;
  return {
    ...state,
    past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastEdit: key === null ? null : { key, at },
  };
}

/** Keeps the selection and active page valid after the project changed under them. */
function settle(state: EditorState): EditorState {
  const { present } = state;
  let selected = state.selected;
  if (selected !== null && selected !== "site" && selected !== "page") {
    if (selected === "header") selected = present.header ? selected : null;
    else if (selected === "footer") selected = present.footer ? selected : null;
    else selected = findPageOfSection(present, selected) ? selected : null;
  }
  const activePageId = present.pages.some((p) => p.id === state.activePageId) ? state.activePageId : (present.pages[0]?.id ?? "");
  return selected === state.selected && activePageId === state.activePageId ? state : { ...state, selected, activePageId };
}

function mapPage(project: Project, pageId: string, fn: (page: Page) => Page): Project {
  return { ...project, pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

/** Applies fn to every section, keeping the identity of every page and project that did not change. */
function mapSections(project: Project, fn: (section: Section) => Section): Project {
  let changed = false;
  const pages = project.pages.map((page) => {
    let pageChanged = false;
    const sections = page.sections.map((s) => {
      const next = fn(s);
      if (next !== s) pageChanged = true;
      return next;
    });
    if (!pageChanged) return page;
    changed = true;
    return { ...page, sections };
  });
  return changed ? { ...project, pages } : project;
}

function updateTarget(project: Project, target: string, path: Path, value: unknown): Project {
  if (target === "site") return { ...project, site: setIn(project.site, path, value) as Project["site"] };
  if (target === "theme") return { ...project, theme: setIn(project.theme, path, value) as Project["theme"] };
  if (target === "header") {
    return project.header ? { ...project, header: setIn(project.header, path, value) as HeaderProps } : project;
  }
  if (target === "footer") {
    return project.footer ? { ...project, footer: setIn(project.footer, path, value) as FooterProps } : project;
  }
  return mapSections(project, (s) => (s.id === target ? ({ ...s, props: setIn(s.props, path, value) } as Section) : s));
}

/** Rewrites menu links that point at a page file. Anchors after the file name are kept. */
function rewriteMenu(header: HeaderProps | null, from: string, to: string | null): HeaderProps | null {
  if (!header) return header;
  const links = header.links.flatMap((link) => {
    const [file, anchor] = link.href.split("#");
    if (file !== from) return [link];
    return to === null ? [] : [{ ...link, href: anchor ? `${to}#${anchor}` : to }];
  });
  return { ...header, links };
}

export function reducer(state: EditorState, action: Action): EditorState {
  const { present } = state;

  switch (action.type) {
    case "load":
      return createState(action.project);

    case "select":
      return state.selected === action.id ? state : settle({ ...state, selected: action.id });

    case "setActivePage": {
      if (!present.pages.some((p) => p.id === action.id)) return state;
      const selected = state.selected === "header" || state.selected === "footer" || state.selected === "site" ? state.selected : "page";
      return { ...state, activePageId: action.id, selected };
    }

    case "setProp": {
      const next = updateTarget(present, action.target, action.path, action.value);
      if (next === present) return state;
      return commit(state, next, `${action.target}:${action.path.join(".")}`, action.at);
    }

    case "setAnchor": {
      const next = mapSections(present, (s) => (s.id === action.id ? { ...s, anchor: action.value } : s));
      if (next === present) return state;
      return commit(state, next, `${action.id}:anchor`, action.at);
    }

    case "addSection": {
      const target = present.pages.find((p) => p.id === action.pageId);
      if (!target || target.sections.length >= LIMITS.sections) return state;
      const at = action.afterId === null ? target.sections.length : target.sections.findIndex((s) => s.id === action.afterId) + 1;
      const next = mapPage(present, target.id, (p) => ({ ...p, sections: [...p.sections.slice(0, at), action.section, ...p.sections.slice(at)] }));
      return { ...commit(state, next, null, 0), selected: action.section.id };
    }

    case "removeSection": {
      const owner = findPageOfSection(present, action.id);
      if (!owner) return state;
      const index = owner.sections.findIndex((s) => s.id === action.id);
      const sections = owner.sections.filter((s) => s.id !== action.id);
      const neighbour = sections[Math.min(index, sections.length - 1)];
      return { ...commit(state, mapPage(present, owner.id, (p) => ({ ...p, sections })), null, 0), selected: neighbour?.id ?? "page" };
    }

    case "moveSection": {
      const owner = findPageOfSection(present, action.id);
      if (!owner) return state;
      const index = owner.sections.findIndex((s) => s.id === action.id);
      const target = index + action.dir;
      if (target < 0 || target >= owner.sections.length) return state;
      const sections = owner.sections.slice();
      const [moved] = sections.splice(index, 1);
      sections.splice(target, 0, moved as Section);
      return commit(state, mapPage(present, owner.id, (p) => ({ ...p, sections })), null, 0);
    }

    case "duplicateSection": {
      const owner = findPageOfSection(present, action.id);
      if (!owner || owner.sections.length >= LIMITS.sections) return state;
      const index = owner.sections.findIndex((s) => s.id === action.id);
      const original = owner.sections[index] as Section;
      const copy = { ...JSON.parse(JSON.stringify(original)), id: action.newId, anchor: "" } as Section;
      const sections = [...owner.sections.slice(0, index + 1), copy, ...owner.sections.slice(index + 1)];
      return { ...commit(state, mapPage(present, owner.id, (p) => ({ ...p, sections })), null, 0), selected: copy.id };
    }

    case "addPage": {
      if (present.pages.length >= LIMITS.pages) return state;
      const file = pageFile(action.page);
      const header = present.header && present.header.links.length < LIMITS.navLinks
        ? { ...present.header, links: [...present.header.links, { label: action.page.title, href: file }] }
        : present.header;
      const next = { ...present, header, pages: [...present.pages, action.page] };
      return { ...commit(state, next, null, 0), activePageId: action.page.id, selected: "page" };
    }

    case "removePage": {
      const index = present.pages.findIndex((p) => p.id === action.id);
      if (index <= 0) return state;
      const removed = present.pages[index] as Page;
      const next = { ...present, pages: present.pages.filter((p) => p.id !== action.id), header: rewriteMenu(present.header, pageFile(removed), null) };
      const fallback = next.pages[Math.min(index, next.pages.length - 1)];
      return settle({ ...commit(state, next, null, 0), activePageId: fallback?.id ?? "", selected: "page" });
    }

    case "movePage": {
      const index = present.pages.findIndex((p) => p.id === action.id);
      const target = index + action.dir;
      if (index <= 0 || target < 1 || target >= present.pages.length) return state;
      const pages = present.pages.slice();
      const [moved] = pages.splice(index, 1);
      pages.splice(target, 0, moved as Page);
      return commit(state, { ...present, pages }, null, 0);
    }

    case "setPage": {
      const index = present.pages.findIndex((p) => p.id === action.id);
      const current = present.pages[index];
      if (!current) return state;
      const patch: PagePatch = { ...action.patch };
      if (index === 0) {
        delete patch.slug;
        delete patch.customLayout;
      }
      if (patch.slug !== undefined && (patch.slug === HOME_SLUG || present.pages.some((p) => p.id !== current.id && p.slug === patch.slug))) {
        delete patch.slug;
      }
      if (Object.keys(patch).length === 0) return state;
      const updated = { ...current, ...patch };
      const header = patch.slug !== undefined ? rewriteMenu(present.header, pageFile(current), pageFile(updated)) : present.header;
      const next = { ...present, header, pages: present.pages.map((p) => (p.id === current.id ? updated : p)) };
      return commit(state, next, `page:${current.id}:${Object.keys(patch).join(",")}`, action.at);
    }

    case "setOrder": {
      const next = { ...present, order: setIn(present.order, action.path, action.value) as Project["order"] };
      return commit(state, next, `order:${action.path.join(".")}`, action.at);
    }

    case "setHeader":
      return { ...commit(state, { ...present, header: action.header }, null, 0), selected: action.header ? "header" : null };

    case "setFooter":
      return { ...commit(state, { ...present, footer: action.footer }, null, 0), selected: action.footer ? "footer" : null };

    case "addAsset":
      // Not an undo step on its own: the edit that references the asset is.
      return { ...state, present: { ...present, assets: { ...present.assets, [action.asset.id]: action.asset } } };

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return settle({ ...state, past: state.past.slice(0, -1), present: previous, future: [present, ...state.future], lastEdit: null });
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return settle({ ...state, past: [...state.past, present].slice(-HISTORY_LIMIT), present: next, future: state.future.slice(1), lastEdit: null });
    }
  }
}

/** Drops assets nothing refers to. Used when saving or exporting, never on the live state. */
export function pruneAssets(project: Project): Project {
  const assets: Record<string, Asset> = {};
  for (const id of referencedAssetIds(project.pages)) {
    const asset = project.assets[id];
    if (asset) assets[id] = asset;
  }
  return { ...project, assets };
}
