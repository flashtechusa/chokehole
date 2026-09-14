# Audio

Every sound is synthesised at runtime with WebAudio by
`src/game/audio/AudioManager.ts`. **No audio files ship**, so nothing here
carries a licence.

## Keys

`bell · slap · thud · heavy · whoosh · rope · squelsh · finisher · pinSlap ·
crowdPop · static · uiMove · uiSelect · uiBack · grapple · reversal · buzz`

Plus a continuous crowd bed (`setCrowd`) and an intensity-driven music bed
(`setMusicIntensity`), both scaled by crowd heat.

## Replacing placeholders

`playTheme(url)` and `playVO(intensity)` exist as the seams for approved
entrance music and recorded announcer lines. Call sites do not change.

Real CHOKE HOLE music, performer entrance music, recorded voices and event audio
go in only when rights are confirmed.

## Subtitles

Every callout already carries its text through the `callout` sim event, so an
announcer line can be captioned without new plumbing.

## iOS

The context is created on the first real user gesture (`Audio.unlock()`, called
from the title and match start). Nothing plays before that, by policy.
