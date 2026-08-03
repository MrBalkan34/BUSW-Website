# BUSW Website — Reference Document

**Purpose of this document:** this is the complete, standalone source of truth
handed from the BUSW Flight Companion development conversation to a new,
separate Claude Code conversation dedicated to building the official BUSW
website. The new conversation has no access to the Flight Companion
conversation history — everything it needs to know before making any
architectural or design decision for the website should be here.

**What this document is not:** it does not design the website, does not
propose a visual identity, does not write any implementation code, HTML, or
CSS. Where something relevant to the website has genuinely **not** been
decided yet, that is stated explicitly rather than invented. Treat any gap
below as a real gap to raise with the project owner, not something to fill
in with a plausible guess.

**Generated:** 2026-08-03, at the close of the BUSW Flight Companion v0.3.0
Pre-Alpha public release milestone.

---

## How to read this document

Section 1 covers BUSW as a company/ecosystem. Section 2 covers BUSW Flight
Companion as a product — BUSW's first shipped application, and the only
concrete evidence of "what BUSW makes and how BUSW works" that currently
exists. Where Section 1 draws an inference from Section 2 (e.g. "the way
BUSW documents decisions"), that's flagged explicitly as an inference from
the one existing product, not a separately-stated company policy.

---
---

# SECTION 1 — BUSW

## Company identity

- **Full name:** Balkan Universal Software Works
- **Abbreviation:** BUSW (used everywhere in practice — product names, the
  GitHub org/repo naming convention, the Electron app identifier). Treat
  "BUSW" as the working, public-facing form of the name; "Balkan Universal
  Software Works" is the full legal/formal form, used in the `author` field
  of Flight Companion's `package.json` and in generated exe metadata
  (Company Name field on the built .exe files).
- **Founder / owner:** Eymen Balkan. This is both the git commit author name
  configured in the Flight Companion repository and the real name on the
  GitHub account that owns the repo (`MrBalkan34`).

## Purpose / long-term vision

**No formal, separately-written BUSW company mission or vision statement
exists anywhere in the current project material.** This is a real gap, not
an oversight on this document's part — do not invent one.

What *can* be honestly said, as an observed pattern rather than a stated
policy: BUSW's first (and, as of this writing, only) product was built with
a deliberately narrow, disciplined philosophy — do one specific job well,
automate what can be automated, always leave the human in control, and
resist scope creep even when a broader feature set would look more
impressive. Whether that pattern reflects a general BUSW company ethos or is
specific to Flight Companion's own product philosophy is not something this
document can determine. If the website needs a company mission/vision
statement, that is new copy to be written with the project owner, not
extracted from anything that already exists.

## Current public presence

As of this writing, BUSW's only confirmed public presence is:

- **GitHub**: the Flight Companion repository, public, under the personal
  GitHub account `MrBalkan34` (real name Eymen Balkan) — see "GitHub" below.
  This is a **personal GitHub account**, not a GitHub Organization. There is
  no `github.com/BUSW`-style org as of this writing.
- **No website exists yet.** That is the entire purpose of the next
  conversation.
- **No confirmed social media presence** (Twitter/X, Discord, YouTube,
  Reddit, etc.) — none was mentioned or referenced anywhere in the Flight
  Companion project material. Do not assume any exists; ask before
  referencing or linking to one on the website.
- **No confirmed public email address.** The email associated with this
  Claude Code session is `teymenbalkan@gmail.com`, but nothing in the
  project material confirms this is intended as BUSW's public/official
  contact address (the GitHub profile's public `email` field is empty/null).
  Confirm the intended contact address with the project owner before
  publishing any "Contact" copy or mailto link.

## Current products

**BUSW Flight Companion is BUSW's first and, as of this writing, only
product.** See Section 2 for the full product reference. There is no
mention anywhere in the project material of any other product, past or
planned, beyond Flight Companion's own internal roadmap (which is entirely
about Flight Companion's own future versions, not a second product).

## Branding decisions already finalized (do not re-litigate these)

- **Company name:** Balkan Universal Software Works / **BUSW**. Final.
- **First product name:** **BUSW Flight Companion**. Final — this was a
  deliberate rebrand completed during this project (see Section 2's
  history), replacing an earlier working title ("TOD Calculator" / "Top of
  Descent Calculator"). The rebrand is complete and public (it shipped in
  the v0.3.0 Pre-Alpha release). Do not reintroduce the old name anywhere
  user-facing.
- **Product monogram/mark:** "**BFC**" (initials of BUSW Flight Companion),
  used as a small square/rounded-square logo mark in the app's UI header,
  window title bar, taskbar icon, and installer branding.
- **Naming convention pattern established:** product names are prefixed
  with "BUSW" (e.g. "BUSW Flight Companion"), and app identifiers follow a
  `com.busw.<productname>` reverse-DNS pattern (Flight Companion's is
  `com.busw.flightcompanion`). If/when a second BUSW product exists, this is
  the established pattern to follow for consistency, though nothing requires
  the website itself to follow an app-identifier-style convention.

**Explicitly NOT finalized — do not invent these for the website:**
- BUSW's own visual identity independent of Flight Companion (no company-level
  logo, no company-level color palette, no typography system, no company
  wordmark). What exists (see "Existing logos/icons/assets" below) is
  Flight Companion's *product* icon, not a BUSW company logo. The website's
  visual identity is explicitly this next conversation's job to define, per
  the instruction that produced this document — this document deliberately
  does not propose one.
- No tagline/slogan for BUSW as a company exists.

## Existing logos, icons, and assets

- **Flight Companion's app icon** — a rounded-square mark with the text
  "BFC" in bold monospace on an orange diagonal gradient
  (`#ffb020` → `#ff7a1a`), dark near-black text/background contrast
  (`#05070a`). Exists as:
  - `build/icon.ico` (multi-resolution: 16/32/48/64/128/256px) — used as the
    Windows exe/window/taskbar icon.
  - `build/icon.png` (256px master) in the Flight Companion repo.
  - This exact same mark also appears inline in the app's own UI (the
    `.brand-mark` element in `public/style.css`, using the identical
    gradient/colors).
- **Important caveat, stated explicitly by the project owner at the time it
  was created:** this icon is a **temporary placeholder**, generated
  programmatically (rendered via an HTML canvas, not designed by a human
  designer) specifically to unblock desktop packaging. It is not intended as
  BUSW's or Flight Companion's final, permanent visual identity. Do not treat
  it as a finished brand asset to build the website's visual language around
  — it's a reasonable placeholder for "what does the current app look like
  today," not a source of truth for what BUSW's design language should be
  going forward.
- **Two product screenshots exist and are already public**, embedded in the
  GitHub release notes (uploaded directly by the project owner, not
  generated by Claude):
  - `https://github.com/user-attachments/assets/27ff2e91-04a9-4240-a8f3-a904db5fe698`
  - `https://github.com/user-attachments/assets/bfa13076-c2b3-46a0-9b25-e331f070d279`

  These are legitimate, already-public, hotlinkable images and are a
  reasonable source for "what the app looks like" website content without
  needing new screenshots taken. (No alt text/captions are attached beyond
  their presence in the release body — confirm what they depict before
  reusing, since this document's author has not independently re-verified
  their exact content post-upload.)
- **No other BUSW or Flight Companion logo variants exist** (no wordmark-only
  version, no dark/light variants, no favicon-specific export, no SVG
  source file — only the `.ico`/`.png` pair described above).

## GitHub organization / repositories

- **Not a GitHub Organization.** The repository lives under the personal
  GitHub user account `MrBalkan34` (display name: Eymen Balkan).
- **Repository:** `https://github.com/MrBalkan34/BUSW-Flight-Companion`
  - Public, not a fork.
  - Default/only branch: `master`.
  - Repository description (already public, likely written by the project
    owner): *"BUSW Flight Companion is an actively developed pre-alpha
    flight companion for Microsoft Flight Simulator and X-Plane. Beginning
    with live flight-phase awareness and top-of-descent planning, it aims to
    become a complete operational companion for flight simulation."*
  - Repository topics (already set, public): `aviation`, `aviation-tools`,
    `desktop`, `desktop-app`, `electron`, `electron-app`, `flight-sim`,
    `flight-sim-hardware`, `flight-simualtor` *(sic — typo exists in the live
    topic list)*, `flight-simulator`, `flight-simulators`,
    `microsoft-flight-simulator`, `msfs`, `msfs2024`, `simbrief`, `x-plane`,
    `x-plane-12`, `xplane`, `xplane-flight-simulator`, `xplane12`.
  - `homepage` field: currently empty. This is the natural field to populate
    once the website has a real URL.
  - `license`: **none set** — no LICENSE file exists in the repository, and
    no license has been chosen. See "Copyright decisions" below.
  - No `.github/` directory — no issue templates, no CI/CD workflows, no
    CONTRIBUTING.md, no CODE_OF_CONDUCT.md.
- **This is the only repository known to exist.** No second repo (e.g. for
  a future website) has been created as of this writing.

## Copyright decisions

**None have been made.** There is no LICENSE file in the Flight Companion
repository, and no license type (MIT, GPL, proprietary/all-rights-reserved,
etc.) has been chosen. This was flagged inside the Flight Companion project
itself as a known, deliberately-deferred item — "LICENSE file" is explicitly
listed as v1.0 (portfolio-ready) scope in that project's own roadmap, not
something addressed yet. Do not assume any particular license for
copyright-notice text on the website (e.g. a footer "© 2026 BUSW" line is
safe as a copyright *claim*, but do not state or imply a specific open-source
license without confirming one has actually been chosen).

## Legal documents

**None exist.** No privacy policy, no terms of service, no EULA, no
end-user license agreement for Flight Companion. Flight Companion has zero
account system, zero payment processing, and zero data collection beyond
what's needed to talk to a local flight simulator and (optionally) fetch a
SimBrief flight plan by ID — but this is a technical fact about the app, not
a substitute for an actual privacy policy if the website collects anything
(analytics, a mailing list signup, a contact form, download telemetry,
etc.). If the website will do any of that, a real privacy policy needs to be
written — nothing here should be treated as one.

## Current website goals, scope, and pages

**None of this has been decided.** No one has specified what the website
needs to accomplish (marketing/download page? company presence? developer
docs? blog? all of the above?), what pages it should have, what its
information architecture looks like, or what "done" looks like for a first
version. This is explicitly the next conversation's job to establish with
the project owner — do not infer or invent a sitemap, page list, or scope
from anything in this document. The one soft signal available: Flight
Companion's own roadmap describes its v1.0 milestone as "portfolio-ready,"
including "full README/architecture writeup for a portfolio audience" — this
suggests the project owner may see the eventual public presence (website
included) as serving a portfolio purpose in addition to a product-marketing
one, but this is an inference from a product roadmap document, not a stated
website requirement. Confirm before assuming.

## Decisions that are finalized and must not be changed

- The company name (Balkan Universal Software Works / BUSW).
- The product name (BUSW Flight Companion) and that the "TOD Calculator"
  rebrand is complete, shipped, and permanent — never reintroduce the old
  name in anything user-facing.
- The GitHub repository's existing URL, name, description, and topics (don't
  casually rename/move the repo — that breaks the already-public release
  download links).
- Flight Companion's existing v0.3.0-prealpha GitHub release, its tag name
  (`v0.3.0-prealpha`), and its uploaded binary assets — these are live and
  linked to from wherever the project owner has already shared them.

## Future plans already agreed upon

These are Flight Companion-specific (no BUSW-company-level future plans
beyond Flight Companion exist in the project material):

- A **future optional premium subscription tier** for Flight Companion —
  strategy-level only ("free-forever core, single premium tier" positioning),
  **zero implementation**, no accounts, no payment code. Explicitly gated
  behind a separate, explicit go-ahead from the project owner before any
  implementation work starts. If the website will ever need to communicate
  pricing, this is the only established context — there are no actual prices,
  tier names, or feature splits decided yet.
- Flight Companion's own version roadmap (v0.4 "copilot" release through
  v1.0) — see Section 2. Relevant to the website mainly as context for how
  to talk about "what's next" for the product, not as anything the website
  itself needs to implement.
- The eventual desktop app (Electron packaging) was originally sequenced as
  v1.0 scope but was **brought forward and already shipped** as part of the
  v0.3.0 Pre-Alpha release — the roadmap document predates this and hasn't
  been re-edited to reflect it. If the website references Flight Companion's
  roadmap, know that "desktop app" is already done, not still upcoming.

## Anything else the website should know

- **This is a two-person-scale, early-stage effort.** One product, one
  owner/developer, no team, no company-level infrastructure beyond a
  personal GitHub account. The website should be built at a scope that
  matches that reality unless told otherwise — nothing in the project
  material suggests a large-scale corporate site is the goal.
- **Everything about BUSW as an entity, outside of what Flight Companion's
  own repository/release page already states publicly, is undecided.** The
  website conversation should expect to have a real scoping discussion with
  the project owner before designing anything, not treat this document as
  license to proceed straight to design.

---
---

# SECTION 2 — BUSW Flight Companion

## Product overview

BUSW Flight Companion is a live, simulator-connected **Top of Descent (TOD)
and flight-phase companion** for Microsoft Flight Simulator (2020/2024) and
X-Plane (11/12). It runs as a native Windows desktop application (as of the
v0.3.0 release), reads live telemetry directly from the running simulator,
and continuously tells a pilot exactly when to start descending — updating
in real time as the flight progresses, not a one-time static calculation.
As of v0.3, it also tracks and displays which phase of flight the aircraft
is currently in (preflight through taxi-in), and gates its own advisory
output to only show the numeric descent countdown when it's actually
relevant.

It is explicitly **not** a general flight-planning tool, moving map, charts
viewer, ATC client, or logbook. It does one specific job well, on purpose.

## Purpose / positioning

The gap it fills: existing options are either static one-time TOD
calculators (web pages/add-ons with no live sim connection) or full
EFB/moving-map suites (Little Navmap, Volanta, SimToolkitPro) where TOD
calculation is one feature buried inside a much larger tool. BUSW Flight
Companion is positioned as **live, connected, and narrowly focused** — a
specialized companion, not a smaller version of a bigger tool.

**Governing product philosophy (one sentence, repeated throughout the
project's own documentation as the thing that decides every feature call):**

> *"Everything that can be detected automatically should be detected
> automatically. Manual input exists only as an override. The pilot always
> has final authority."*

**Target audience**, per the product's own positioning: casual/occasional
simmers (served by manual entry + auto-matched aircraft profiles, no setup
required) and serious enthusiasts/home-cockpit users already using SimBrief
(who get the deeper live-route and phase-awareness value). A secondary
audience: real-world GA/light-aircraft pilots using the sim for IFR
procedure practice.

## Supported simulators

- **Microsoft Flight Simulator** (2020 and 2024) — via SimConnect.
- **X-Plane** (11 and 12) — via X-Plane's built-in UDP RREF dataref protocol.

Both are optional at any given time — the app runs and shows its UI even
with no simulator connected (displaying a "Not connected" / "Searching for
simulator…" state), and auto-detects and adopts whichever simulator
connects.

## Current release status

- **Version: 0.3.0**, tagged **`v0.3.0-prealpha`**.
- **Publicly released** as a GitHub **pre-release** (the `prerelease` flag is
  set) on the `MrBalkan34/BUSW-Flight-Companion` repository, published
  2026-08-03.
- Release title: *"BUSW Flight Companion v0.3.0 Pre-Alpha"*.
- Release page: `https://github.com/MrBalkan34/BUSW-Flight-Companion/releases/tag/v0.3.0-prealpha`
- This is explicitly a **Pre-Alpha** — the release notes themselves state
  "Some functionality is still under active development and may change
  significantly before the first stable release." The website should not
  represent this as a finished, stable, or feature-complete product.
- **Two downloadable binaries are attached to this GitHub release** (see
  "Release information" below) — this is the current, real, working
  distribution channel. It is the same build verified during development
  (SHA-256 hashes of the uploaded release assets match the locally-built
  artifacts exactly).

## Features (as of v0.3.0)

**Core descent planning:**
- Live Top-of-Descent calculation, two modes: fixed descent angle (default
  3°) or target vertical speed.
- Time-scaled "descend now" window (30 seconds of flight time at current
  groundspeed) — gives a fast aircraft proportionally more warning distance
  than a slow one.
- Great-circle route-progress calculation that matches live aircraft
  position against an imported SimBrief route to find the current leg and
  sum remaining distance.
- 17 built-in aircraft descent-profile presets (A220 through GA piston
  types), auto-matched against the live aircraft title, with manual
  override.

**Flight Context System (new in v0.3):**
- 9-phase flight model: Preflight, Taxi, Takeoff, Climb, Cruise, Descent,
  Approach, Landing, Taxi In.
- Automatic phase detection from live telemetry (ground contact, speed,
  vertical speed, altitude, and optionally cruise altitude/distance as
  context), with session-memory-based disambiguation for phase pairs that
  look telemetrically identical (e.g. Taxi vs. Taxi In).
- Time-based hysteresis (e.g. Cruise requires 60s of sustained level flight
  before confirming) and a "sticky" fallback that holds the current phase
  rather than guessing when signals are ambiguous.
- Full manual override: pick any phase directly; "Return to Auto" resumes
  live detection instantly. Manual choice always wins until explicitly
  returned to auto.
- Phase state persists across a reload and syncs live between the app's two
  pages.

**Flight Setup page** (a pre-flight *review* page, not a configuration
form):
- Live aircraft display, aircraft-family review (auto-matched + overridable),
  cruise-altitude review (SimBrief auto-filled + overridable), estimated
  weights display (read-only, correct-unit-aware), independent SimBrief
  import, the same 9-way phase picker, and a "Start a new flight" reset
  action.

**SimBrief integration:**
- OFP fetch by numeric Pilot ID only — no login, no OAuth.
- Pulls origin/destination, full route/waypoints, planned cruise altitude,
  aircraft type, and estimated ZFW/TOW (correct-unit-aware, read from the
  pilot's own SimBrief account setting).

**Desktop packaging (new as of this release):**
- Ships as a native Windows application via Electron — no separate Node.js
  install required for end users, no manual browser step, no visible
  localhost/browser chrome. Opens directly to the app's Dashboard in its own
  window.
- Distributed as both an NSIS installer and a portable single-file exe.

## Screens / pages / UI structure

The app has exactly two screens:

1. **Dashboard** (the app's default/home screen on launch) — live telemetry
   tiles (altitude, IAS, ground speed, vertical speed, aircraft), the phase
   badge + 9-way phase picker + Return-to-Auto control, the phase-gated
   Descent Advisory panel (numeric countdown during Cruise/Descent/Approach;
   contextual static message during other phases), the SimBrief import
   field, and the descent-plan form (target altitude, distance, aircraft
   profile, angle/VS toggle). A link in the header navigates to Flight
   Setup.
2. **Flight Setup** — the pre-flight review page described above, reached
   via the Dashboard's nav link, with its own link back to the Dashboard.

**Visual style:** a dark "cockpit-glass" aesthetic — near-black background
(`#05070a`), monospace numerics (`Cascadia Code`/`SF Mono`/`Consolas`
stack), a small set of accent colors (amber/orange `#ffb020`, cyan `#2dd4ff`,
plus green/red status colors), minimal chrome, styled to "look like it
belongs on an instrument panel." This is the *product's* current visual
language — not necessarily a mandate for the website's visual language,
though it's the only existing BUSW visual precedent if useful as a reference
point.

**Not independently re-verified in this session:** in-app navigation between
the two pages (`<a href="setup.html">`) inside the packaged Electron window
specifically — the Dashboard itself was fully verified running packaged;
clicking through to Setup from inside the native app window was not
separately re-tested after packaging (it works via ordinary browser
navigation in-browser, and there's no known reason it would behave
differently in Electron, but it's an honest gap, not a confirmed-working
claim).

## Product descriptions

**Short** (one line, suitable for a hero/tagline or meta description):
> BUSW Flight Companion is a live Top-of-Descent and flight-phase companion
> for Microsoft Flight Simulator and X-Plane.

**Medium** (one paragraph, suitable for a product card or GitHub-style
summary):
> BUSW Flight Companion connects directly to your running flight simulator —
> Microsoft Flight Simulator 2020/2024 or X-Plane — and tells you exactly
> when to start descending, updating live as you fly instead of giving you a
> single static number. As of v0.3 it also tracks which phase of flight
> you're in automatically, with full manual override always available.
> SimBrief import pulls in your filed route for live distance tracking. It's
> a focused descent-and-phase companion, not a full EFB — currently in
> public Pre-Alpha as a native Windows desktop app.

**Long** (multi-paragraph, suitable for an About/Product page):
> BUSW Flight Companion is a live, simulator-connected Top of Descent
> companion for Microsoft Flight Simulator (2020/2024) and X-Plane. It reads
> your aircraft's live altitude, speed, and position directly from the
> running simulator and continuously calculates exactly when you should
> start your descent — recalculating in real time as you fly, rather than
> giving you a single number to remember.
>
> As of version 0.3, it goes further with a full Flight Context System: it
> automatically detects which of nine flight phases you're currently in —
> from preflight through taxi-in — using live telemetry, and adapts its
> advisory display accordingly. You always have full manual control to
> override the detected phase, and the app is built around a single guiding
> principle: everything that can be detected automatically should be, but
> the pilot always has final authority.
>
> Import your filed SimBrief flight plan by Pilot ID for live, route-aware
> distance tracking on either simulator, or use it with zero setup via
> manual entry and auto-matched aircraft profiles — it's built to serve both
> the casual simmer who wants something that just works, and the serious
> home-cockpit enthusiast who already lives in SimBrief.
>
> BUSW Flight Companion is deliberately narrow in scope: it does descent
> planning and flight-phase awareness, and nothing else. It is not a
> weather briefing tool, a charts viewer, an ATC client, or a flight
> logbook — those categories are already well served by other tools, and
> Flight Companion is built to complement them, not replace them.
>
> As of its v0.3.0 Pre-Alpha release, it ships as a native Windows desktop
> application — no separate Node.js install, no manual browser step. It's
> free, in active early development, and the project welcomes bug reports
> and feedback from early testers.

*(These three descriptions are new copy written for this handover, closely
based on the project's own existing positioning language — not previously
published verbatim anywhere else. They are a reasonable starting point for
website copy, not a locked-in final text — the website conversation is free
to revise tone/length as needed.)*

## Technologies used

- **Backend:** Node.js (≥20.17.0), Express 4, `ws` (WebSocket) 8.
- **Simulator connectivity:** `node-simconnect` (pure JS SimConnect client,
  no native compile step) for MSFS; Node's built-in `dgram` for X-Plane's
  UDP RREF protocol.
- **Frontend:** plain HTML/CSS/JavaScript — **no framework, no build step,
  no TypeScript.** This is a deliberate, explicitly-documented architectural
  choice, not a gap.
- **SimBrief integration:** SimBrief's public, key-free OFP-fetch REST
  endpoint.
- **Desktop packaging:** Electron 43 (main process hosts the Node server
  directly — no separate sidecar process), packaged with `electron-builder`
  26.
- **No database, no backend-as-a-service, no cloud infrastructure of any
  kind.** Fully local — the server binds to `127.0.0.1` only and is not
  reachable over the network.

## Architecture overview

**Governing rule:** the server is a dumb telemetry bridge; the client owns
all business logic. The server talks to the simulator(s) and to SimBrief,
and forwards state over a WebSocket — it does not compute descent math or
know what a "flight phase" is. All of that logic lives in plain client-side
JS modules, most of them pure functions (explicit input, explicit output, no
hidden state) with small stateful controllers layered on top only where
memory is genuinely needed (e.g. flight-phase detection needs to remember
whether the aircraft has been airborne yet this session).

As of the Electron packaging work, this same server runs **inside Electron's
main process** (not a spawned child process) — the desktop app is this exact
same server + client, wrapped in a native window, with no architectural
rewrite.

## GitHub repository

`https://github.com/MrBalkan34/BUSW-Flight-Companion` — see Section 1 for
full repo metadata (topics, description, license status, etc.).

## Release information

- Tag: `v0.3.0-prealpha`
- Two binaries attached to the GitHub release:
  - `BUSW.Flight.Companion.0.3.0.exe` — portable, ~100.2 MB,
    SHA-256 `c3ced131c647433ced2df40ed581614025308c72548d5a372990a29d2c2c96a2`
  - `BUSW.Flight.Companion.Setup.0.3.0.exe` — NSIS installer, ~100.4 MB,
    SHA-256 `42a75625bf101d56b16f461a82e6b72ce68d275e4f7d51d9cc06f9022252b940`
  - Direct download URLs follow the pattern:
    `https://github.com/MrBalkan34/BUSW-Flight-Companion/releases/download/v0.3.0-prealpha/<asset-name>`
- **Neither binary is code-signed.** Windows SmartScreen will show an
  "unrecognized app" warning on first run — this is expected for the current
  release, not a bug. If the website hosts a download page, it's worth
  setting that expectation for testers rather than letting it be a surprise.

## Installation methods

1. **NSIS installer** (`...Setup.0.3.0.exe`) — interactive wizard (not
   silent), lets the user choose per-user vs. all-users install and the
   install location, creates a Start Menu and desktop shortcut.
2. **Portable exe** (`...0.3.0.exe`, no "Setup" in the name) — no
   installation, just run it directly from wherever it's saved.
3. **From source** (for developers, not end users) — clone the repo,
   `npm install`, then either `npm start` (server only, open a browser to
   `localhost:3000` manually) or `npm run electron:dev` (full desktop app in
   dev mode). Also a one-click `Start.bat` for the server-only/browser path.

## System requirements

- **Windows 10 or 11.** This is currently a **Windows-only** application —
  no macOS or Linux build exists or has been attempted.
- No separate Node.js installation required for the packaged
  installer/portable exe (Electron bundles its own Node/Chromium runtime).
  Node.js is only required for the from-source developer path.
- Microsoft Flight Simulator (2020/2024) and/or X-Plane (11/12) — technically
  optional; the app runs and displays its UI without a simulator connected,
  but obviously has no telemetry to show until one connects.
- A SimBrief account (specifically, a numeric Pilot ID) — optional, only
  needed for the SimBrief-import features.

## Branding assets / current logo status

Covered in full in Section 1 ("Existing logos, icons, and assets") — in
short: a temporary, programmatically-generated "BFC" monogram icon
(orange gradient, dark text), explicitly not a final designed brand asset.
Two real, already-public product screenshots exist (linked in Section 1).

## Premium / monetization decisions

Strategy-level only, zero implementation: a future optional premium tier
alongside a free-forever core, explicitly gated behind a separate go-ahead
before any implementation begins. No pricing, tier names, or feature splits
have been decided. See Section 1's "Future plans already agreed upon" for
the exact framing — do not present this as a current or near-term feature
on the website.

## Planned integrations already agreed upon

- **Wind-aware descent profiles** (v0.4 target) — using SimBrief's per-fix
  `wind_data.level[]` data, which is already fetched by the app's SimBrief
  integration but not yet used for this purpose.
- **Step-down/STAR-aware multi-segment descent planning** (v0.4 target) —
  using SimBrief's per-fix `altitude_feet` (planned crossing altitude) and
  `is_sid_star` fields, also already fetched but not yet used for this.
- **Audio/voice callouts** for the descend-now moment, including a lead-time
  pre-alert (v0.4 target) — identified as the single highest-value next
  feature; not yet built.
- **Units toggle** (nm/ft/kt ⇄ km/m/kmh) — flagged as a real adoption
  blocker for X-Plane's non-US-heavy user base; not yet built.

No integrations with third-party services beyond SimBrief exist or are
planned. Navigraph is referenced in the product's own documentation only as
a *competitor/reference point* for charts/weather — explicitly **not** an
integration target ("Navigraph Charts and dispatch tools already own this
category").

## Known limitations (current, as of v0.3.0)

- **Windows-only.** No macOS/Linux build.
- **Unsigned executables** — expect SmartScreen warnings.
- Single-target-altitude descent model — no multi-segment STAR step-down
  support yet (planned, see above).
- No wind-aware descent profile yet (planned, see above).
- No audio/voice callouts yet (planned, see above).
- No data-staleness indicator — if the simulator pauses, telemetry tiles
  freeze with no visual warning that data has stopped updating.
- No units toggle — nm/ft/kt only.
- Aircraft-type auto-detection works on MSFS only; X-Plane users must always
  pick their aircraft/profile manually (X-Plane's protocol doesn't expose an
  aircraft-title-equivalent field the app currently reads).
- SimBrief route data is not shared between the Dashboard and Setup page —
  each fetches independently by Pilot ID (a deliberate simplicity tradeoff,
  not a bug).
- No cloud sync / multi-device support — all settings are local to one PC.
- No LAN/tablet access — the app is only reachable on the same machine it
  runs on, by design (security decision, not a missing feature).
- No accounts, login, or subscription system of any kind exists.
- Route-leg matching (for live distance-remaining calculation) is a
  reasonable heuristic, not exact — can pick the wrong leg on routes with
  sharp turns, closely-spaced waypoints, or when significantly off the
  filed route.
- Aircraft-profile matching is naive substring matching against a fixed
  keyword list — theoretically could false-positive-match an unrelated
  aircraft title, though no real-world case of this has been reported.
- No automated test suite or CI exists yet.
- This is a **specialized descent/phase companion, and is intentionally
  never going to become a general EFB** — no weather, charts, ATC, full
  flight logbook, or fuel planning is planned, ever. This is a permanent
  scope boundary, not a "not built yet."

## Roadmap already decided (Flight Companion's own, not BUSW-company-level)

- **Near-term polish:** real-flight validation of the Flight Context System
  against a live MSFS session (the phase-detection system has been tested
  end-to-end via a fake X-Plane test responder, but never against an actual
  running simulator, MSFS or X-Plane, as of this writing); a committed,
  repo-tracked automated test suite; a data-staleness indicator; basic
  accessibility pass (ARIA live regions, focus-visible states); distinguishing
  "server connection lost" from "still searching for a simulator" in the UI.
- **v0.4 ("the copilot release"):** audio/voice callouts (including a
  lead-time pre-alert), STAR-aware multi-segment descent planning,
  wind-aware descent profiles, post-TOD profile-deviation tracking, a units
  toggle, an expanded aircraft-profile library, in-app tooltips explaining
  aviation terms for non-pilot users.
- **v0.5:** real (not simulated) X-Plane verification, LAN opt-in access
  with real token-based authentication (motivated by a validated
  tablet-kneeboard home-cockpit use case), SimBrief response caching,
  WebSocket reconnect backoff/jitter.
- **v1.0 ("portfolio-ready"):** the desktop app milestone was originally
  planned here but has already shipped early (see Section 1). Remaining
  v1.0 scope: CI (lint + test on every push), a full README/architecture
  writeup, a LICENSE file, a final accessibility/security pass, and
  screenshots/demo material.
- **Beyond v1.0 (not planned in detail):** the premium tier (strategy only,
  see above). No second product is mentioned anywhere.

## Anything else the website should know when presenting this product

- **Be accurate about maturity.** This is a Pre-Alpha, single-developer,
  early-feedback-stage product. Marketing copy should not overstate
  stability, feature completeness, or team size.
- **The "TOD Calculator" name must never appear anywhere user-facing** on
  the website — it's a fully retired working title. It's fine to mention in
  historical/changelog context (e.g. "originally prototyped as a TOD
  Calculator") if the project owner wants that story told, but never as the
  product's current identity.
- **The product's own README is currently stale** (describes pre-v0.3
  functionality — no mention of the Flight Setup page, the phase system, or
  the desktop app) — do not treat repo README content as more current or
  authoritative than this document or the actual GitHub release notes.
- The GitHub release notes text itself (quoted in full context above under
  "Current release status") is already public and already contains a decent
  amount of ready-to-reuse marketing-adjacent copy (feature highlights,
  download links, screenshots) — a reasonable starting reference for a
  website's download/product page without needing to reinvent that copy from
  scratch.
