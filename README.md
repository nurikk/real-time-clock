# Real Time

A dependency-free, local-time clock study inspired by Maarten Baas’s **Real Time / Schiphol Clock**. An actual AI-generated painter film sits behind a circular glass dial; SVG hands show the device’s local time independently. This is an unaffiliated ambient prototype, not footage from the original artwork.

## Run

Open `index.html` directly (`file://`), or from this directory run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8000>. No installation, build, CDN, web font, API key, or network service is needed. A browser with H.264 MP4 support is required.

- **Live:** device-local hours, minutes, and seconds, with fractional hand angles. Wall time is sampled afresh, including when a hidden tab resumes; no interval-counting drift.
- **Demo ×60:** explicitly labeled simulated time starting at 10:10. One real second advances one simulated minute. **Live** immediately restores real time; reloading also starts live.
- **Pause film / Play film:** pause the ambient footage without stopping the clock. Autoplay rejection exposes an accessible **Play film** button and status message.
- **Fullscreen:** enter/exit where the browser supports the Fullscreen API; Escape exits normally. Unsupported browsers hide the control.
- **Reduced motion:** the film stays paused on an actual frame, overlapping playback stops, and hands update once per second rather than sweeping. The preference is observed both at startup and when changed. A hidden tab also pauses the film.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible page, SVG dial and controls |
| `styles.css` | Responsive ivory display, circular crop, rim and glass lighting |
| `clock.js` | Pure time geometry, live/demo state, media playback and browser hooks |
| `assets/painter.mp4` | Exact copy of the completed AI-generated video |
| `assets/painter-still.jpg` | First frame extracted from that video, for loading/reduced-motion display |
| `generation-request.json` | Nonsecret source request and completed-generation provenance |
| `tests/clock.test.js` | Node built-in tests; no test dependencies |

## Media provenance and cost

- Completed generation: **Wan 3.0**, per the supplied generation handoff.
- Completed metadata reports **$0.68 USD**. No further generation or spending was performed for this implementation.
- Local inspection: **1280 × 720**, **30 fps**, **8.034 seconds**, H.264/yuv420p, with an AAC audio stream. Both browser video elements are always muted despite the source request asking for no audio.
- The original `request.json` names an earlier `google/veo-3.1-fast` attempt. `generation-request.json` preserves that historical request verbatim in `source_request`, separately from the successful Wan provenance. It does not pretend the earlier request is the exact completed Wan payload; optional parameter transfer is unverified.
- No provider URLs, signed download links, credentials, or job identifiers are included.
- SHA-256 of `assets/painter.mp4`: `0bf340d33a6daa0d4ee2d5eb28d3331de0fe3f030b530d7e2e68e013f078381f`.

The supplied MP4 is already browser-compatible; no conversion pipeline is necessary. To recreate the still locally with ffmpeg:

```sh
ffmpeg -ss 0 -i assets/painter.mp4 -frames:v 1 -q:v 3 assets/painter-still.jpg
```

## Validation

```sh
node --test tests/clock.test.js
node --check clock.js
```

Tests cover midnight/noon, fractional angles, hour/day rollover, fresh wall time after resume or clock correction, accelerated demo time, and returning to live time. Helpers use local `Date` fields rather than UTC for the dial. They can also be tested in another timezone:

```sh
TZ=Europe/Amsterdam node --test tests/clock.test.js
```

### Browser-observable checks

Run `window.clock.snapshot()` in the browser console. It returns:

- `mode`, rendered ISO `time`, and `angles.hour/minute/second` (degrees clockwise from 12).
- `reducedMotion`, `videoState`, and whether a dissolve is `blending`.
- Each real video’s `readyState`, playback `time`, `paused`, intrinsic `width/height`, local `src`, and current `opacity`.

A loaded film has `readyState >= 2`, width 1280, height 720, and increasing video time while playing. The active layer swaps on each dissolve. `#clock` exposes `data-mode`, `data-video-state`, and `data-reduced-motion`; each SVG hand exposes its actual `transform`. Hooks are read-only snapshots, not a hidden mode that can silently override the clock.

Check Live → Demo → Live, pause/play, fullscreen, keyboard focus, a narrow viewport, and switching away from/back to the tab. Emulate `prefers-reduced-motion: reduce`: both videos must stay paused and the UI must say “Still frame · reduced motion”. To exercise autoplay rejection deterministically, make `HTMLMediaElement.prototype.play` reject with `NotAllowedError` before page initialization, then restore it and activate **Play film**. A failed asset produces an explicit unavailable status while hands keep working.

## Honest visual limitations

The man makes short ambient painting gestures; **he does not trace the complete live hands**. The figure/video never rotates. Hands and dial marks are crisp vector overlays, not brush strokes painted by the actor. The original framing is cropped to a circle and may clip the lower body.

Two copies of the same local video overlap for a **0.7-second dissolve** near the loop boundary. This softens the cut but is not a truly continuous performance: brief double-image ghosting or pose discontinuity can remain. If the next layer is not ready, native video looping remains available. The first-frame still is taken from the real film, never a generated substitute. Accuracy follows the device clock; there is no network time synchronization. Browser validation does not guarantee identical media/fullscreen behavior on every mobile browser.
