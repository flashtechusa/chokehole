# Audio assets

## Current state

**No audio files ship in this build.** Everything you hear is synthesised in the
browser by `src/game/audio/AudioManager.ts` using WebAudio oscillators and
generated noise: the bell, mat impacts, slaps, rope hits, the crowd bed, the
SQUELSH charge, the finisher sting, the pin slaps, UI blips, and the
four-on-the-floor warehouse bed whose filter and intensity follow crowd HEAT.

This keeps the build free of any licensing question while the collective decides
what official audio it wants to supply.

## Effect names

`bell slap thud heavy whoosh rope squelsh finisher pinSlap crowdPop static
uiMove uiSelect uiBack grapple reversal buzz`

Called as `Audio.play('heavy', 0.8)`. Crowd volume is a continuous control:
`Audio.setCrowd(0..1)`, driven by HEAT. Music intensity likewise:
`Audio.setMusicIntensity(0..1)`.

## Dropping in real audio

Put files under `public/assets/audio/` and replace the matching branch in
`AudioManager.play()`. Recommended layout:

```
public/assets/audio/
  sfx/        bell.webm  mat-impact.webm  slap.webm  rope.webm  …
  crowd/      crowd-loop.webm  chant-<venue>.webm  pop.webm
  music/      theme-<name>.webm     (official Choke Hole themes only)
  announcer/  matchStart.webm  characterIntro-<id>.webm  bigHit.webm
              reversal.webm  finisherReady.webm  finisherHit.webm
              nearFall.webm  winner.webm  venue-<arenaId>.webm
```

Format: **WebM/Opus** with an **MP4/AAC** fallback for older iOS. Mono for SFX,
stereo for music. Normalise to about −16 LUFS; the crowd bed is quieter than it
sounds in isolation because it plays constantly.

`AudioManager.playTheme(url)` is the hook for official music and is intentionally
unimplemented — implementing it is the only change needed to start using licensed
tracks.

## Announcer

Announcer lines are currently a synthesised stab plus on-screen text, and every
line is subtitled (the subtitle toggle is in Settings). When recorded VO arrives,
implement `playVO` to select a clip by event name; keep the subtitles.

## Volume

Three independent sliders persist in the save file: **MUSIC**, **SFX / CROWD**,
**ANNOUNCER**, plus a master mute. WebAudio is created lazily on the first real
user gesture, because iOS refuses to start an AudioContext any other way.

## Never

Never bundle commercial music or third-party samples, and never lift sounds from
another wrestling game.
