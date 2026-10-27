import type { ElementType } from "react";
import { LIMITS } from "../model/types";
import type {
  ContactProps,
  FeaturesProps,
  FooterProps,
  GalleryProps,
  HeaderProps,
  HeroProps,
  Section,
  TextImageProps,
} from "../model/types";
import { mailtoHref, safeHref, telHref } from "../model/urls";
import type { RenderCtx } from "../site/ctx";
import { Frame, Img, Text, imageVisible, ph } from "../site/fields";

interface BlockProps<P> {
  id: string;
  anchor: string;
  props: P;
  ctx: RenderCtx;
  /** "h1" for the page's title section, "h2" for the rest. */
  heading: "h1" | "h2";
}

type TextTag = ElementType;

/** Menu links are shared by every page, so an in-page anchor must lead back to the home page elsewhere. */
function menuHref(ctx: RenderCtx, href: string | null): string | null {
  if (href === null || ctx.mode !== "export") return href;
  return href.startsWith("#") && ctx.pageFile !== undefined && ctx.pageFile !== "index.html" ? `index.html${href}` : href;
}

export function HeaderBlock({ props, ctx }: { props: HeaderProps; ctx: RenderCtx }) {
  const links = props.links.map((link, index) => ({ link, index, href: menuHref(ctx, safeHref(link.href)) }));
  const shown = ctx.mode === "edit" ? links : links.filter((l) => l.href && l.link.label.trim());
  return (
    <Frame ctx={ctx} id="header" tag="header" className="bw-header">
      <div className="bw-container">
        <Text ctx={ctx} target="header" path={["brand"]} value={props.brand} as={"span" as TextTag} className="bw-brand" placeholder={ph(ctx, "canvas.ph.siteName")} maxLength={LIMITS.short} />
        {shown.length > 0 && (
          <nav aria-label="Main">
            <ul className="bw-nav">
              {shown.map(({ link, index, href }) => (
                <li key={index}>
                  {ctx.mode === "edit" ? (
                    <Text ctx={ctx} target="header" path={["links", index, "label"]} value={link.label} as="span" placeholder={ph(ctx, "canvas.ph.link")} maxLength={60} />
                  ) : (
                    <a href={href ?? undefined} aria-current={href === ctx.pageFile ? "page" : undefined}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </Frame>
  );
}

export function FooterBlock({ props, ctx }: { props: FooterProps; ctx: RenderCtx }) {
  return (
    <Frame ctx={ctx} id="footer" tag="footer" className="bw-footer">
      <div className="bw-container">
        <Text ctx={ctx} target="footer" path={["text"]} value={props.text} as="p" placeholder={ph(ctx, "canvas.ph.footerText")} maxLength={LIMITS.short} />
      </div>
    </Frame>
  );
}

export function Hero({ id, anchor, props, ctx, heading }: BlockProps<HeroProps>) {
  const showImage = imageVisible(ctx, props.image);
  const href = safeHref(props.buttonHref);
  const showButton = ctx.mode === "edit" || (props.buttonLabel.trim() !== "" && href !== null);
  return (
    <Frame ctx={ctx} id={id} tag="section" anchor={anchor} className="bw-section bw-hero">
      <div className="bw-container">
        <div className={`bw-grid${showImage ? "" : " bw-no-image"}`}>
          <div className="bw-stack">
            <Text ctx={ctx} target={id} path={["heading"]} value={props.heading} as={heading} placeholder={ph(ctx, "canvas.ph.headline")} maxLength={LIMITS.heading} />
            <Text ctx={ctx} target={id} path={["subheading"]} value={props.subheading} as="p" className="bw-lede" placeholder={ph(ctx, "canvas.ph.shortDescription")} maxLength={LIMITS.text} />
            {showButton &&
              (ctx.mode === "edit" ? (
                <p>
                  <Text ctx={ctx} target={id} path={["buttonLabel"]} value={props.buttonLabel} as="span" className="bw-btn" placeholder={ph(ctx, "canvas.ph.buttonLabel")} maxLength={60} />
                </p>
              ) : (
                <p>
                  <a className="bw-btn" href={href ?? undefined}>
                    {props.buttonLabel}
                  </a>
                </p>
              ))}
          </div>
          {showImage && (
            <figure>
              <Img ctx={ctx} image={props.image} eager />
            </figure>
          )}
        </div>
      </div>
    </Frame>
  );
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function TextImage({ id, anchor, props, ctx, heading }: BlockProps<TextImageProps>) {
  const showImage = imageVisible(ctx, props.image);
  const gridClass = `bw-grid${showImage ? "" : " bw-no-image"}${props.imageSide === "left" ? " bw-image-left" : ""}`;
  return (
    <Frame ctx={ctx} id={id} tag="section" anchor={anchor} className="bw-section bw-split">
      <div className="bw-container">
        <div className={gridClass}>
          <div className="bw-stack">
            <Text ctx={ctx} target={id} path={["heading"]} value={props.heading} as={heading} placeholder={ph(ctx, "canvas.ph.heading")} maxLength={LIMITS.heading} />
            {ctx.mode === "edit" ? (
              <Text ctx={ctx} target={id} path={["body"]} value={props.body} as="div" className="bw-prose" placeholder={ph(ctx, "canvas.ph.body")} maxLength={LIMITS.body} multiline />
            ) : (
              <div className="bw-prose">
                {paragraphs(props.body).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
          {showImage && (
            <figure>
              <Img ctx={ctx} image={props.image} />
            </figure>
          )}
        </div>
      </div>
    </Frame>
  );
}

export function Features({ id, anchor, props, ctx, heading }: BlockProps<FeaturesProps>) {
  return (
    <Frame ctx={ctx} id={id} tag="section" anchor={anchor} className="bw-section bw-features">
      <div className="bw-container">
        <div className="bw-stack">
          <Text ctx={ctx} target={id} path={["heading"]} value={props.heading} as={heading} placeholder={ph(ctx, "canvas.ph.heading")} maxLength={LIMITS.heading} />
          <Text ctx={ctx} target={id} path={["intro"]} value={props.intro} as="p" className="bw-lede" placeholder={ph(ctx, "canvas.ph.intro")} maxLength={LIMITS.text} />
        </div>
        {(props.items.length > 0 || ctx.mode === "edit") && (
          <div className="bw-cards">
            {props.items.map((item, i) => (
              <div className="bw-card" key={i}>
                <Text ctx={ctx} target={id} path={["items", i, "title"]} value={item.title} as="h3" placeholder={ph(ctx, "canvas.ph.title")} maxLength={LIMITS.short} />
                <Text ctx={ctx} target={id} path={["items", i, "text"]} value={item.text} as="p" placeholder={ph(ctx, "canvas.ph.description")} maxLength={LIMITS.text} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

export function Gallery({ id, anchor, props, ctx, heading }: BlockProps<GalleryProps>) {
  const items = props.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => imageVisible(ctx, item.image));
  return (
    <Frame ctx={ctx} id={id} tag="section" anchor={anchor} className="bw-section bw-gallery-section">
      <div className="bw-container">
        <Text ctx={ctx} target={id} path={["heading"]} value={props.heading} as={heading} placeholder={ph(ctx, "canvas.ph.heading")} maxLength={LIMITS.heading} />
        {items.length > 0 && (
          <div className="bw-gallery">
            {items.map(({ item, index }) => (
              <figure key={index}>
                <Img ctx={ctx} image={item.image} />
                <figcaption>
                  <Text ctx={ctx} target={id} path={["items", index, "caption"]} value={item.caption} as="span" placeholder={ph(ctx, "canvas.ph.caption")} maxLength={LIMITS.short} />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

export function Contact({ id, anchor, props, ctx, heading }: BlockProps<ContactProps>) {
  const mail = mailtoHref(props.email);
  const tel = telHref(props.phone);
  const rows: { label: string; key: "email" | "phone" | "address"; value: string; href: string | null }[] = [
    { label: "Email", key: "email", value: props.email, href: mail },
    { label: "Phone", key: "phone", value: props.phone, href: tel },
    { label: "Address", key: "address", value: props.address, href: null },
  ];
  const shown = ctx.mode === "edit" ? rows : rows.filter((r) => r.value.trim() !== "");
  return (
    <Frame ctx={ctx} id={id} tag="section" anchor={anchor} className="bw-section bw-contact">
      <div className="bw-container">
        <div className="bw-stack">
          <Text ctx={ctx} target={id} path={["heading"]} value={props.heading} as={heading} placeholder={ph(ctx, "canvas.ph.heading")} maxLength={LIMITS.heading} />
          <Text ctx={ctx} target={id} path={["text"]} value={props.text} as="p" className="bw-lede" placeholder={ph(ctx, "canvas.ph.shortText")} maxLength={LIMITS.text} />
        </div>
        {shown.length > 0 && (
          <dl className="bw-contact-list">
            {shown.map((row) => (
              <div key={row.key}>
                <dt>{row.label}</dt>
                <dd>
                  {ctx.mode === "edit" ? (
                    <Text ctx={ctx} target={id} path={[row.key]} value={row.value} as="span" placeholder={ph(ctx, `canvas.ph.${row.key}`)} maxLength={LIMITS.short} />
                  ) : row.href ? (
                    <a href={row.href}>{row.value}</a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Frame>
  );
}

export function renderSection(section: Section, ctx: RenderCtx, heading: "h1" | "h2") {
  const common = { id: section.id, anchor: section.anchor, ctx, heading };
  switch (section.type) {
    case "hero":
      return <Hero key={section.id} {...common} props={section.props} />;
    case "textImage":
      return <TextImage key={section.id} {...common} props={section.props} />;
    case "features":
      return <Features key={section.id} {...common} props={section.props} />;
    case "gallery":
      return <Gallery key={section.id} {...common} props={section.props} />;
    case "contact":
      return <Contact key={section.id} {...common} props={section.props} />;
  }
}
