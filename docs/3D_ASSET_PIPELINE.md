# 3D asset pipeline

## Today: procedural placeholders

Every character is built at runtime from Babylon primitives by
`render/rig/buildBody.ts`, driven by the `RigSpec` in the wrestler's config.
Parts are merged per bone with baked vertex colours, so a whole wrestler is
about twenty draw calls with one material.

No image or model files ship. No performer photograph is used anywhere.

## Skeleton

`render/rig/Skeleton.ts` builds one humanoid hierarchy:

```
root → hips → spine → chest → neck → head
                chest → shoulder/upperArm/forearm/hand  (L,R)
                hips  → thigh/shin/foot                 (L,R)
        plus midArm, lowArm, antenna  (used only when the spec asks)
```

RAID's extra limbs hang off this same skeleton rather than a different one, so
every shared clip still applies to him.

Axis convention: the rig faces +X. For a limb hanging down −Y, **+Z rotation
swings it forward**, −X swings the left side outward. Torso +Z bends forward,
head +Z is chin-down.

## Animation

`render/rig/clips.ts` builds about thirty clips from keyframed poses, shaped by
a per-character `Style`. `CharacterRig` plays or **scrubs** them: an attack is
scrubbed to its own action playhead, so what you see is exactly the frame data
the hit detection is using.

## Replacing with GLB

The Bible's minimum clip set is the one implemented here. To drop in approved
assets:

1. Put `model.glb` under `public/assets/characters/<id>/`.
2. Give `CharacterRig` a second constructor path that loads the GLB and maps its
   `AnimationGroup`s to the same clip names.
3. Leave `MatchView` alone — it only ever calls `play()` and `scrub()` by name.

Nothing in `src/game` knows the rig exists, so gameplay does not change.

## Rules

- Do not scrape performer photographs into assets.
- Keep logo and brand files replaceable.
- Record source and clearance notes per costume and arena asset.
