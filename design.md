# RogueTris Design Notes

## Progressive Speed System

- Base gravity is defined by `BASE_GRAVITY_MS` in `script.js`.
- `computeGravity(level, speedUpLevels)` applies:
  - A 10% multiplicative speed-up per level: `0.9^(level - 1)`.
  - An additional multiplicative boost per active Speed Up level: `0.85^(speedUpLevels)`.
  - A lower clamp of 200ms to keep the game playable.
- `Game.ticksForLevel()` delegates to `computeGravity`, so all gravity decisions use the same formula.
- Speed is displayed in the UI as a badge using the ratio `BASE_GRAVITY_MS / ticksForLevel()` rounded to one decimal place.

## Upgrade System

### Upgrade Definitions

- All upgrades are defined in `UPGRADE_DEFS` in `script.js`.
- Each upgrade has:
  - `id`: stable identifier.
  - `name`: display name.
  - `type`: `"temp"` or `"perm"`.
  - `weight`: relative selection weight.
  - `icon`: emoji-style icon used in the UI.
  - `desc`: short description of the effect.
- Selection uses `pickWeighted(items, count)`, which builds a weighted pool and samples without repeating the same id in a single pick.

### Unlock Flow

- On level-up, `Game.unlock()` is triggered once `linesSinceUnlock >= unlockThreshold`.
- There is a 20% chance to show an upgrade-only modal:
  - Mode `"upgrade"`: three upgrades drawn from `UPGRADE_DEFS`, no piece options.
  - Mode `"mixed"`: three piece unlocks plus two upgrades.
- The unlock modal is rendered by `Game.showUnlockModal()`:
  - Mixed mode shows piece cards with mini-previews and an "Upgrades" section.
  - Upgrade-only mode shows only upgrade cards with a "Special Upgrade" title.
  - A reroll button is available when rerolls are allowed.

### Temporary Upgrades

- Stored in `Game.tempUpgrades`:
  - `speedUpLevels`: increases gravity via `computeGravity`.
  - `rerollCharges`: extra rerolls for the unlock modal.
  - `shieldCharges`: extra protection against game over.
  - `scoreMultiplier`: multiplier applied to line and combo score.
  - `scoreMultiplierLines`: remaining lines for which the multiplier is active.
- Implemented upgrade ids:
  - `speed_up`: boosts `speedUpLevels`.
  - `extra_reroll`: increments `rerollCharges`.
  - `second_chance`: enables a one-time top-row clear on game over.
  - `invulnerability`: grants multiple `shieldCharges` that clear the top few rows on game over.
  - `score_mult`: sets `scoreMultiplier` to 2 for several cleared lines.
  - `board_clear`: clears several bottom rows immediately.

### Permanent Upgrades

- Stored in `Game.permUpgrades`:
  - `expandedPreview`: shows an additional preview slot using `#preview2`.
  - `obstacleMode`: enables obstacle rows and double-scoring interactions.
- Permanent upgrades are applied once per run and persist via the piece pool when relevant.

### Scoring Interactions

- Base line clear score is taken from `scores` and scaled by level.
- Obstacle lines double the base line score.
- Combos add an additional bonus that grows with combo count and level.
- When `scoreMultiplier` is active:
  - The combined line and combo score is multiplied.
  - `scoreMultiplierLines` is reduced by the number of lines cleared.
  - When `scoreMultiplierLines` reaches zero, the multiplier resets to 1.

## Analytics

- Upgrade selection analytics are stored in `localStorage` under the key `rogueTris_upgradeStats`.
- `Game.recordUpgradeSelection(id)` increments a counter for the chosen upgrade id.
- Data can be inspected via the browser console for balancing and analysis.

