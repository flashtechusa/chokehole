# Action-arcade direction — locked target

This document records the visual/gameplay target for **CHOKE HOLE: NO HOLES BARRED** after playtesting the 2D, full-3D and current 2.5D prototypes.

## Product call

The game is a **mobile-first single-player arcade wrestling game** first.

Local two-player can be added later for parties and live CHOKE HOLE events, but it does not replace single-player just because AI is harder to tune.

## Primary reference

**Action Arcade Wrestling** is the clearest external reference for camera, readability, move density and over-the-top wrestling presentation.

We are adapting design principles, not copying code, assets, characters, UI or proprietary move data.

Useful principles:

- restricted/readable wrestling plane instead of free-camera 3D navigation
- large cel/comic-readable characters
- simple core inputs with context/direction producing a large moveset
- paired attacker/receiver choreography for throws and wrestling spots
- exaggerated impact graphics and impossible special moves
- ring ropes/corners as gameplay rather than decoration
- arcade spectacle over simulation realism

## CHOKE HOLE differences

The final game must look and feel like CHOKE HOLE rather than like a reskin of another wrestling game.

That means:

- real performer likenesses
- real costumes, makeup, wigs and silhouettes
- actual CHOKE HOLE stage gags where verified
- I.B.S. / Squelsh / IT Factor language
- pitch-deck collage/comic graphic design
- oversized handmade-looking props
- real venues as historical stages
- camp, drag performance, satire and crowd work

## Rendering rule

Spend the phone's frame budget on the wrestlers.

**Wrestlers:** high-quality 2D / 2.5D animated performer art.

**Ring:** interactive flat/2.5D geometry with visible rope depth.

**Crowd:** lightweight 2D layers with event-driven reaction states.

**Venue:** layered 2D/parallax background plus only the interactive elements that matter to the match.

No expensive 3D crowd AI.

## Character-likeness rule

If someone who knows CHOKE HOLE cannot identify Jassy or RAID before reading the nameplate, the art is not done.

Current photo-top + articulated-limb figures are a bridge, not the final asset pipeline. Production should move toward pose/animation atlases (or an equivalent 2D skeletal setup) built from approved performer reference material.

## Controls

Left thumb / stick:

- move left/right
- facing follows movement, not the opponent
- running past an opponent does not magically rotate the wrestler

Right side:

- ATTACK
- GRAB
- IT

Context exposes the moveset:

- standing attack
- running attack
- rope-rebound attack
- back attack
- ground attack
- front grapple
- rear grapple
- directional throw
- Irish whip
- corner move
- perch / dive
- prop use
- signature
- finisher

## Match fantasy

A good match should make this sequence possible without a tutorial wall:

run → hit the ropes → rebound → flying attack → crowd pop → taunt → IT rises → front/rear grapple → ridiculous throw → near fall → 2.9 kickout → climb → dive → prop gag → signature → cinematic finisher → pin

Normal target: roughly **3–5 minutes**.

The entertaining way to play should be the strongest way to play.

## Performer-specific research

Move/config data must distinguish:

- `REAL_VERIFIED`
- `GAME_ADAPTATION`
- `GAME_ORIGINAL`

See:

- `docs/MOVE_RESEARCH_JASSY.md`
- `docs/MOVE_RESEARCH_RAID.md`

## Current verified visual gags in the renderer

- Jassy: giant telephone squash, based on public reporting/photo documentation
- RAID: Silly String stage gag, based on public reporting

Their exact game timing/choreography is an adaptation until approved by the performers.

## Acceptance test before expanding roster/venues

Do not add more content until Jassy vs RAID in the original warehouse proves:

1. both performers are visually recognisable
2. turning/facing feels natural
3. front/rear grapples are readable
4. rope running and rebounds are fun
5. paired moves look like wrestling rather than knockback
6. taunts are worth doing
7. big spots visibly wake up the crowd
8. signatures/finishers are memorable
9. normal matches build to near falls instead of ending instantly
10. the player wants to hit REMATCH
