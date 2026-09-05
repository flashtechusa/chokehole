# RESEARCH_NOTES.md — factual claims and their status

Every factual claim in the game comes from the research index in the Master Game
Design Bible v1.1. This file tracks what the code asserts, how confident that
assertion is, and what the Choke Hole team still needs to confirm.

**Rule:** where research does not establish a fact, the code carries an explicit
placeholder (`VENUE TBD — TEAM CONFIRMATION REQUIRED`) rather than a guess.
Nothing here was invented to fill a gap.

## Where facts live in the code

| Fact type | File |
| --- | --- |
| Venue, city, date, event name, note, research status, sources | `src/game/data/worldtour/venues.ts` |
| The same record for built arenas | `src/game/data/arenas/*.ts` (`history`) |
| Performer persona summaries | `src/game/data/characters/*.ts` (`publicPersonaSummary`, `personaResearch`) |
| Documented but unbuilt personas | `src/game/data/characters/index.ts` (`ROSTER_ROADMAP`) |

Everything else in those files — moves, stats, buffs, quotes, hazards,
objectives, sponsors, the whole IBS/SQUELSH layer — is game fiction.

## Venues with unresolved detail

| Stop | What is confirmed | What is missing |
| --- | --- | --- |
| Original warehouse, New Orleans, 2018 | The city, the year, and that Choke Hole began in a New Orleans warehouse out of the underground queer party scene. | The exact venue/address. The arena is a **stylised composite**, not a recreation. |
| The Freezening, New Orleans, 2019 Carnival | The event era and the post-climate-apocalypse warehouse storyline. | The exact venue/address. |
| The ReBoot, New Orleans, Feb 24–27 2022 | The dates. | The venue. |
| ARMAGEDDON, New Orleans, Feb 28 – Mar 1 2025 | The dates. | The venue. |
| The Metropolitan Museum of Art, 2023–24 | Choke Hole's involvement with Jacolby Satterwhite's *A Metta Prayer*. | The separately described **basement performance is USER-CONFIRMED only** and is not depicted anywhere in the game. It needs photo/video reference and team confirmation before any arena is built from it. |

## Confirmed venues used as built or roadmap arenas

Hi-Ho Lounge (2017 precursor) · Superchief Gallery (Jun 27 2019) · King's Hall /
Brooklyn Mirage, LadyLand (Sep 11 2021) · Kampnagel K6, Choke Hole vs Hamburg
Queens (Sep 30 – Oct 2 2021) · AREA15 PORTAL residency (Oct 6–8 2022) ·
Kampnagel Boob Camp (Jan 23–28 2023) · Zony Mash PORTAL (Feb 15–17 2023) ·
Ace Hotel New Orleans 5 YEARS (Jun 2023) · Ostbahnhof LA rave (Jul 15 2023) ·
The Globe Theatre / Outfest (Jul 21 2023) · 70 Scott Avenue / UNTER (Oct 6 2023) ·
Contemporary Arts Center / NOFF (Nov 4 2023) · Zony Mash QASINO (Feb 2–3 2024) ·
Joy Theater CLOWNHOLE (Apr 5 2024) · Times Square Condiment Wars (May 3 2024) ·
Kampnagel K6 PORTAL (Jun 6–8 2024) · SO36 Berlin (Jun 11 2024) · Harmony Circle
Prospect.6 (2024 opening weekend) · Kampnagel ARMAGEDDON (Apr 3–5 2025) ·
Festsaal Kreuzberg ARMAGEDDON (Apr 11 2025) · MoMA PS1 Night at the Museum: Pride
(Jun 13 2025) · Pioneer Works ARMAGEDDON (Nov 11–12 2025) · Joy Theater TV: Live +
Uncut (Feb 12–13 2026) · Kampnagel TV: Live + Uncut (Feb 26–28 2026) · Festsaal
Kreuzberg TV: Live + Uncut (Mar 4 2026) · Burnt Hall, Palace of Youth — Balkan
Beatdown, Prishtina Queer Festival (Sep 5 2026).

Source URLs are stored per record in `venues.ts`.

## Performer research status

Both playable wrestlers are marked `TEAM CONFIRMATION REQUIRED`.

- **JASSY** — founding performer; billionaire landlord / "SHE-E-O" heel persona;
  documented on-stage rivalry with RAID. Catchphrases, signature moves and the
  final spelling still need performer sign-off.
  **Look is now reference-matched.** The team supplied reference photography (the
  Balkan Beatdown 2026 Prishtina Queer Festival performer poster, plus studio
  stills). Colours and shapes were read off those images by hand and encoded as
  rig data — a two-tone golden-blonde-over-dark flipped bob with a choppy dark
  fringe, hot-pink swept eyeshadow, pale contoured face with over-drawn lips,
  pink patent leg-of-mutton puff sleeves, black patent leotard with a plunging
  neckline, pink satin collar with a black necktie, pink hip sash, nude legs and
  black patent boots. Her prop is a giant gold brick phone, which is what the
  reference shows her performing with (it replaced a placeholder briefcase).
  **The reference images themselves are not shipped, traced or embedded** — see
  the non-negotiables below.
- **RAID** — mutant bug created by laboratory experimentation; the tenant side of
  the anti-gentrification rivalry. Catchphrases, signature moves and the final
  spelling still need performer sign-off.
  **Look is now reference-matched.** The team supplied reference photography.
  Colours and shapes were read off those images by hand and encoded as rig data —
  a sculpted creature head with a huge lipsticked maw of jagged teeth and blue
  skull patches, a fan of salmon spines sweeping back off the skull, neon lime
  limbs, a grey reptile-scale torso plate carrying a yellow lightning bolt,
  shiny amber trunks, grey knee pads, and yellow-green trainers with black side
  stripes. His signature silhouette is **four extra clawed arms at the waist**
  with yellow claws, on top of the usual two.
  **OPEN:** no prop is visible in the supplied reference, so his prop is set to
  `none` and "THE CANISTER" is retained in the data as a placeholder name only —
  TEAM CONFIRMATION REQUIRED on what RAID actually carries.
  **The reference images themselves are not shipped, traced or embedded.**

Public sources vary on several spellings (Jocelyn/Jocylene; Nicole's Revenge /
Nicoles Revenge; Ivana Dickie/Dickic). The game uses stable internal ids that are
independent of display strings, so a rename is a one-line change with no effect
on saves or logic.

## Creative source treated as a design blueprint

In a 2023 interview about the Las Vegas projection-mapped production, Jassy
described each wrestler's giant signature prop triggering a special move "very
much like a videogame." The signature/prop system is built directly on that.

## Open questions for the Choke Hole team

1. Final game title and logo usage.
2. Final spelling and styling of every wrestler name.
3. Which performers want to be playable at launch.
4. Approved photos, costume references, colours and props per performer.
5. The actual signature moves, catchphrases, rivalry lines and finishers each
   performer wants represented.
6. Permission for the official logo, SQUELSH art, IBS art, PinkStar visuals,
   event posters, recorded announcer audio and music.
7. Exact address and photos of the 2018 warehouse and the 2019 Freezening venue.
8. Venues for The ReBoot (2022) and the New Orleans ARMAGEDDON (2025).
9. Exact nature and location of the Met basement performance, with references.
10. Whether real venue names may appear commercially, or should be fictionalised
    (every arena already carries a `genericName` fallback for this).

## Non-negotiables encoded in the build

- No scraped performer photography anywhere in the pipeline. Team-supplied
  reference images are used only as a human reference for choosing rig colours
  and proportions; they are never bundled, traced or converted into assets.
- No commercial music or third-party samples; all audio is synthesised.
- Third-party artworks appear only as original stylised stand-ins (the Times
  Square condiment rig).
- Collaborator IP (e.g. the Clownhole co-production) stays unbuilt until cleared.
- Factual summaries are written in original wording; no long passages reproduced.
