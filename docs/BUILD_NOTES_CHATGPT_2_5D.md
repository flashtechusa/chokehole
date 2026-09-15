# ChatGPT 2.5D build notes — first pass

Branch: `chatgpt/action-arcade-2.5d`

This pass intentionally does **not** add more wrestlers or venues. It moves the Jassy-vs-RAID vertical slice toward the locked action-arcade target.

## Implemented

- kept the renderer lightweight/2D-first rather than returning to free-camera 3D
- made the audience event-driven instead of expensive simulated crowd AI
- added actual arms/cheering poses, sign movement and phone/camera flashes to the 2D crowd
- added stronger crowd reactions for reversals, pins, near falls, big spots, finishers and victory
- added a dedicated giant-telephone visual gag for Jassy's finisher presentation
- added a dedicated Silly String visual gag for RAID's signature/finisher presentation
- kept the combat simulation renderer-independent
- documented Action Arcade Wrestling as a clean-room design reference, not a code/assets source
- updated README to make character likeness and action-arcade wrestling the project priority

## Why these changes first

The project already has a surprisingly capable renderer-independent combat core and a 2D renderer. Replacing it again would repeat the earlier mistake of treating renderer changes as game design.

This pass targets the problems that are visible immediately on a phone:

1. the room needs to react like a CHOKE HOLE crowd
2. big moves need performer-specific spectacle
3. the project direction needs to stop drifting back toward generic 3D

## Not claimed complete

- final character likeness / production art
- final Jassy / RAID signature and finisher choreography
- full performer-confirmed movesets
- production-quality pose atlases
- final match pacing and AI tuning
- final phone performance verification

Those remain the next acceptance gates.
