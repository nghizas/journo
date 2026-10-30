# Journo

A minimalist life-data journal for iPhone. Sliders, counters, and an emotion wheel instead of long-form writing. The data exports as JSON so you can use it for visualizations and generative art.

## How it works

- **Today** is a draft. Every tap is autosaved on the phone, so you can close the app and come back all day.
- At night, set **Bed time**, then **End day & save**. The day moves into the on-phone archive and a fresh draft starts.
- **Archive** lets you export a day, a month, or everything as JSON through the iOS share sheet. Choose *Save to Files* and an iCloud Drive folder to keep the files.
- **Import backup** restores an exported file onto a new phone or browser.
- **Back-fill past days:** tap the date at the top to pick an earlier day. Ending that day returns the app to today. Picking a day that's already archived opens it for editing.

## Nightly backup to iCloud

**End day & save** archives the day on the phone and immediately saves `journo-YYYY-MM-DD.json`:

- **Download** (default): goes to Files › Downloads, which is iCloud Drive/Downloads unless you changed it in Settings › Safari › Downloads.
- **Share sheet**: pick Save to Files and a folder (iOS remembers the last one).

Switch modes under **Archive → Nightly backup**. Days that weren't backed up are flagged, and **Back up all now** exports everything in one file.

## Time entry

Tap a time to get a keypad: type `7 3 0` for 7:30 or `1 1 4 5` for 11:45, then tap AM or PM. Keys that can't make a valid time are disabled.

## Run locally

```sh
uv run main.py          # or: python3 main.py
```

Open the printed `phone:` URL in Safari on your iPhone (same Wi-Fi). Over plain HTTP the app works, but offline mode needs HTTPS.

## Install on iPhone (HTTPS via GitHub Pages)

1. Push this repo to GitHub. Only the app code is published; your data never leaves the phone.
2. Repo **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` deploys `web/`.
3. Open `https://<user>.github.io/<repo>/` in Safari → Share → **Add to Home Screen**.

When you change the app, bump `VERSION` in `web/sw.js`.

## Data format

```json
{
  "app": "journo", "schema": 4, "range": "2026-10", "exportedAt": "…",
  "days": [{
    "date": "2026-10-15",
    "wake": "2026-10-15T07:10",
    "bed":  "2026-10-16T00:20",
    "sleepHours": 7.5,
    "sleepRating": 4,
    "dayRating": 4,
    "dreamRecall": "remember",
    "dreams": [{ "t": "2026-10-15T07:15", "text": "flying over a city" }],
    "meals": { "breakfast": null, "lunch": 3, "dinner": 2, "other": null },
    "pages": 15,
    "caffeineLog": [{ "t": "2026-10-15T08:05" }, { "t": "2026-10-15T13:40" }],
    "alcoholLog": [{ "t": "2026-10-15T19:30" }],
    "caffeine": 2, "alcohol": 1,
    "exercise": ["bootcamp", "other"],
    "exerciseIntensity": 2,
    "sexPartner": 1, "sexSolo": 0,
    "moods": [{ "t": "2026-10-15T14:02", "core": "happy", "feeling": "optimistic", "nuance": "hopeful", "intensity": 4 }],
    "energy": [{ "t": "2026-10-15T15:10", "energy": 2, "tension": 4 }],
    "social": [{ "t": "2026-10-15T19:00", "who": ["friends", "partner"], "effect": 2 }],
    "productivity": 3,
    "tags": ["travel", "late night"],
    "notes": [{ "t": "2026-10-15T13:27", "text": "coffee with a friend" }],
    "savedAt": "…"
  }]
}
```

- `meals`: each of `breakfast`, `lunch`, `dinner`, `other` is 0–4 (trash, junk, mixed, clean, dialed) or `null` = skipped (the default). Days logged before schema 3 have a single `diet` 0–10 instead (junk 0–2, meh 3–4, mixed 5–6, clean 7–8, dialed in 9–10).
- `pages` is pages read, 0–50 in steps of 5, where 50 = 50+.
- `moods`: `core` → `feeling` → optional `nuance`, from the Willcox feelings wheel plus an added `calm` core.
- `sleepRating` / `dayRating` are 1–5; `null` = not rated.
- `caffeineLog` / `alcoholLog`: one entry per drink with its time. `caffeine` / `alcohol` are the counts, added at export. Days before schema 4 have only `alcohol` as a 0–3 count (3 = 3+).
- `dreamRecall`: `"none"`, `"forgot"`, `"remember"`, or `null` = not answered.
- `energy`: Thayer's model, each 1–5. `energy` tired → energized, `tension` calm → tense.
- `tags`: free-form strings picked from your tag list.
- `social`: one entry per interaction. `who` ⊂ partner, family, friends, work, new people. `effect` −2 drained, −1 flat, 0 fine, 1 good, 2 recharged. `[]` = alone (or not logged).
- `productivity`: 0–4 (jack shit, phoned it in, got by, crushed it, full scale domination). `null` = not rated.
- `sexPartner` / `sexSolo` are 0–2 where 2 = 2+.
- `exercise`: activity keys (`yoga`, `bootcamp`, `orangetheory`, `sweep`, `other`); `[]` = rest day (the default). `exerciseIntensity` is derived at export as the hardest activity of the day: 2 intense (yoga/boot/otf), 1 moderate (sweep/other), 0 rest.
- A bed time before noon is stored as the next calendar date. `sleepHours` = this day's `wake` − previous day's `bed`.
- Days you filled in later are marked `"backfill": true`.
- Everything you track is defined at the top of `web/app.js`: the `MEALS`, `FOOD`, `PAGES`, `DRINKS`, `DREAM_RECALL`, `DEFAULT_TAGS`, `ENERGY`, `SOCIAL`, `PRODUCTIVITY`, `PICKS`, `EXERCISE`, `INTENSITY` and `WHEEL` lists.
