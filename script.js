"use strict";

const BASE_W = 10;
let W = BASE_W;
const H = 20;
const MAX_EXTRA_BOARD_COLS = 5;
const LOCK_DELAY_MS = 500;
const BASE_GRAVITY_MS = 1000;
const SOFT_DROP_MS = 40;

const SPEEDUP_BASE_INCREMENT = 1;
const SPEEDUP_RANDOM_RANGE = 0.25;
const SPEEDUP_MIN_MS = 120;
const computeGravity = (level, speedUpLevels) => {
  const base = BASE_GRAVITY_MS;
  const lv = Math.max(1, level | 0);
  const su = Math.max(0, speedUpLevels || 0);
  const levelFactor = Math.pow(0.9, lv - 1);
  const upgradeBase = 0.85;
  const upgradeFactor = Math.pow(upgradeBase, su);
  const ms = base * levelFactor * upgradeFactor;
  const clamped = Math.max(SPEEDUP_MIN_MS, Math.floor(ms));
  return clamped;
};

const byId = (id) => document.getElementById(id);
const boardEl = byId("board");
const boardWrapEl = byId("board-wrap");
const previewEl = byId("preview");
const holdEl = byId("hold");
const warningBannerEl = byId("warning-banner");
const scoreEl = byId("score");
const linesEl = byId("lines");
const levelEl = byId("level");
const achievementsEl = byId("achievements");
const objectivesEl = byId("objectives");
const objLinesEl = byId("obj-lines");
const objObstaclesEl = byId("obj-obstacles");
const objScoreEl = byId("obj-score");
const pauseBtn = byId("pause-btn");
const startBtn = byId("start-btn");
const overlayEl = byId("overlay");
const restartBtn = byId("restart-btn");
const summaryScoreEl = byId("summary-score");
const summaryLinesEl = byId("summary-lines");
const summaryLevelEl = byId("summary-level");
const particlesCanvas = byId("particles");
let particlesCtx;
const scaleRoot = byId("scale-root");
const comboVisualEl = byId("combo-visual");
const controlsMovementRadios = document.querySelectorAll('input[name="move-scheme"]');
const holdKeySelect = byId("hold-key");
const releaseKeySelect = byId("release-key");
const warningSoundToggle = byId("warning-sound-toggle");
const clearRowBtn = byId("clear-row-btn");
const clearColBtn = byId("clear-column-btn");
const clearAreaBtn = byId("clear-area-btn");
const clearRowCountEl = byId("clear-row-count");
const clearColCountEl = byId("clear-column-count");
const clearAreaCountEl = byId("clear-area-count");
let autoScale = 1;
const computeAutoScale = () => {
  if (!scaleRoot) return 1;
  const prevTransform = scaleRoot.style.transform;
  scaleRoot.style.transform = "none";
  const rect = scaleRoot.getBoundingClientRect();
  const margin = 16;
  const sx = (window.innerWidth - margin) / rect.width;
  const sy = (window.innerHeight - margin) / rect.height;
  const s = Math.min(sx, sy, 1);
  scaleRoot.style.transform = prevTransform;
  return Math.max(0.5, s);
};
const applyScale = (s) => {
  if (!scaleRoot) return;
  scaleRoot.style.transform = "scale(" + s + ")";
};
const updatePreviewCellSize = () => {
  const rootStyle = getComputedStyle(document.documentElement);
  const base = parseInt(rootStyle.getPropertyValue("--cell-size"), 10) || 26;
  const maxSize = base * 0.9;
  const minSize = 10;
  const previewSize = Math.max(minSize, Math.min(maxSize, Math.round(base * 0.7)));
  document.documentElement.style.setProperty("--preview-cell-size", previewSize + "px");
};
const recalcScale = () => {
  autoScale = computeAutoScale();
  applyScale(autoScale);
  updatePreviewCellSize();
};
window.addEventListener("resize", recalcScale);
recalcScale();

const makeCells = (container, rows, cols, cls) => {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = document.createElement("div");
      d.className = cls;
      d.dataset.row = r;
      d.dataset.col = c;
      container.appendChild(d);
    }
  }
};

makeCells(boardEl, H, W, "cell");
makeCells(previewEl, 6, 6, "preview-cell");
const previewEl2 = byId("preview2");
if (previewEl2) makeCells(previewEl2, 6, 6, "preview-cell");
const holdEl2 = byId("hold2");
if (holdEl2) makeCells(holdEl2, 6, 6, "preview-cell");
const holdEl3 = byId("hold3");
if (holdEl3) makeCells(holdEl3, 6, 6, "preview-cell");
particlesCanvas.width = boardEl.clientWidth;
particlesCanvas.height = boardEl.clientHeight;
particlesCtx = particlesCanvas.getContext("2d");
const previewWrap = byId("preview-wrap");
let audioCtx = null;
const playTone = (freq, ms, gain = 0.06) => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    setTimeout(() => { try { osc.stop(); } catch (e) {} }, ms);
  } catch (e) {}
};
const runGravitySelfTest = () => {
  try {
    const a = computeGravity(1, 0);
    const b = computeGravity(2, 0);
    const c = computeGravity(5, 0);
    const d = computeGravity(5, 2);
    const e = computeGravity(20, 0);
    if (!(a >= b && b >= c)) {
      console.error("Gravity test failed: level ordering", { a, b, c });
    }
    if (!(d < c)) {
      console.error("Gravity test failed: speedUpLevels effect", { c, d });
    }
    if (!(e >= 200 && e <= a)) {
      console.error("Gravity test failed: clamp or range", { e, a });
    }
  } catch (err) {
    console.error("Gravity test error", err);
  }
};

const showWarningBanner = (msg) => {
  if (!warningBannerEl) return;
  warningBannerEl.textContent = msg;
  warningBannerEl.classList.add('warning-banner-visible');
};

const clearWarningBanner = () => {
  if (!warningBannerEl) return;
  warningBannerEl.textContent = "";
  warningBannerEl.classList.remove('warning-banner-visible');
};


const SRS_JLSTZ_RIGHT = {
  "0>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1>2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3>0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
};
const SRS_JLSTZ_LEFT = {
  "0>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3>2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "2>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1>0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
const SRS_I_RIGHT = {
  "0>1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1>2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "2>3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3>0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
};
const SRS_I_LEFT = {
  "0>3": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "3>2": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "2>1": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "1>0": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
};

const STANDARD_PIECES = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];

const UPGRADE_DEFS = [
  { id: 'speed_up', name: 'Speed Up', type: 'temp', weight: 3, icon: '⚡', desc: 'Increase core speed up rate each level' },
  { id: 'extra_reroll', name: 'Extra Re-roll', type: 'temp', weight: 2, icon: '🎲', desc: '+1 reroll next choice' },
  { id: 'second_chance', name: 'Second Chance', type: 'temp', weight: 1, icon: '❤️', desc: 'Survive game over once' },
  { id: 'score_mult', name: 'Score Multiplier', type: 'temp', weight: 2, icon: '✖', desc: 'Double score for a few clears' },
  { id: 'clear_row', name: 'Clear Row', type: 'temp', weight: 1, icon: '➖', desc: 'Gain a consumable that clears a random row' },
  { id: 'clear_column', name: 'Clear Column', type: 'temp', weight: 1, icon: '➕', desc: 'Gain a consumable that clears a random column' },
  { id: 'clear_area', name: 'Clear Area', type: 'temp', weight: 1, icon: '⛰', desc: 'Gain a consumable that clears a 3x3 area' },
  { id: 'expanded_preview', name: '+1 Next', type: 'perm', weight: 2, icon: '🔭', desc: 'Show +1 next piece' },
  { id: 'expanded_hold', name: '+1 Hold', type: 'perm', weight: 2, icon: '📥', desc: 'Add an extra timed hold cell' },
  { id: 'expand_board', name: '+1 Board', type: 'perm', weight: 1, icon: '⬌', desc: 'Add one column to the board (max +5)' },
  { id: 'piece_removal', name: 'Remove Piece', type: 'perm', weight: 2, icon: '🗑️', desc: 'Remove a piece type' },
  { id: 'obstacle_mode', name: 'Obstacle Focus', type: 'perm', weight: 1, icon: '🧱', desc: 'Stronger obstacles that give more points' },
];
const pickWeighted = (items, count) => {
  const pool = [];
  items.forEach(it => { for (let i = 0; i < it.weight; i++) pool.push(it); });
  const res = [];
  const used = new Set();
  while (res.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const cand = pool[idx];
    if (!used.has(cand.id)) { res.push(cand); used.add(cand.id); }
    pool.splice(idx, 1);
  }
  return res;
};
const bagRandom = (source) => {
  const pool = [...(source || Object.keys(PIECES))];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

class Board {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.grid = Array.from({ length: h }, () => Array(w).fill(0));
  }
  isObstacleCell(v) {
    return typeof v === 'string' && v.startsWith('OB');
  }
  get(r, c) {
    if (r < 0 || r >= this.h || c < 0 || c >= this.w) return null;
    return this.grid[r][c];
  }
  set(r, c, v) {
    if (r < 0 || r >= this.h || c < 0 || c >= this.w) return;
    this.grid[r][c] = v;
  }
  mergePiece(piece) {
    for (const [dx, dy] of piece.blocks()) {
      const r = piece.y + dy, c = piece.x + dx;
      if (r >= 0) this.set(r, c, piece.type);
    }
  }
  clearLines() {
    const cleared = [];
    const clearedHadObstacles = [];
    for (let r = this.h - 1; r >= 0; r--) {
      if (this.grid[r].every(v => v)) {
        let maxObstacleLevel = 0;
        for (let c = 0; c < this.w; c++) {
          const v = this.grid[r][c];
          if (this.isObstacleCell(v)) {
            const n = parseInt(String(v).slice(2), 10);
            if (Number.isFinite(n) && n > maxObstacleLevel) maxObstacleLevel = n;
          }
        }
        if (maxObstacleLevel > 1) {
          for (let c = 0; c < this.w; c++) {
            const v = this.grid[r][c];
            if (this.isObstacleCell(v)) {
              const n = parseInt(String(v).slice(2), 10);
              if (Number.isFinite(n) && n > 1) {
                this.grid[r][c] = 'OB' + (n - 1);
              } else {
                this.grid[r][c] = 0;
              }
            } else {
              this.grid[r][c] = 0;
            }
          }
        } else {
          const hadOb = this.grid[r].some(v => this.isObstacleCell(v));
          cleared.push(r);
          clearedHadObstacles.push(hadOb);
          this.grid.splice(r, 1);
          this.grid.unshift(Array(this.w).fill(0));
          r++;
        }
      }
    }
    this.lastClearedHadObstacles = clearedHadObstacles;
    return cleared;
  }
  addObstacleRowPattern(pattern) {
    const topRow = this.grid[0];
    const hasBlocksInTop = topRow.some(v => v && !this.isObstacleCell(v));
    if (hasBlocksInTop) {
      for (let c = 0; c < this.w; c++) {
        if (!this.isObstacleCell(topRow[c])) {
          topRow[c] = topRow[c];
        }
      }
    }
    this.grid.shift();
    const row = Array(this.w).fill(0);
    for (let c = 0; c < this.w; c++) {
      if (pattern && pattern[c]) {
        let lvl = pattern[c];
        if (!Number.isFinite(lvl)) lvl = 2;
        lvl = Math.max(2, Math.floor(lvl));
        row[c] = 'OB' + lvl;
      }
    }
    this.grid.push(row);
  }
  addObstacleRow() {
    const topRow = this.grid[0];
    const hasBlocksInTop = topRow.some(v => v && !this.isObstacleCell(v));
    if (hasBlocksInTop) {
      for (let c = 0; c < this.w; c++) {
        if (!this.isObstacleCell(topRow[c])) {
          topRow[c] = topRow[c];
        }
      }
    }
    this.grid.shift();
    this.grid.push(Array(this.w).fill('OB2'));
  }
}

class Piece {
  constructor(type) {
    this.type = type;
    this.rot = 0;
    this.x = 3;
    this.y = -2;
    const def = PIECES[this.type];
    this.cx = def.center ? def.center[0] : Math.floor(def.shape[0].length / 2);
    this.cy = def.center ? def.center[1] : Math.floor(def.shape.length / 2);
  }
  shape() { return PIECES[this.type].shape; }
  blocks(rot = this.rot, x = this.x, y = this.y) {
    let shape = this.shape();
    for (let i = 0; i < rot; i++) {
      shape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
    }
    return shape.map((row, r) => row.map((val, c) => val ? [c, r] : null)).flat().filter(Boolean);
  }
}

class Renderer {
  constructor(board) {
    this.board = board;
    this.cells = Array.from(boardEl.children);
    this.prevActiveIdx = [];
    this.prevGhostIdx = [];
  }
  idx(r, c) { return r * W + c; }
  validGhost(piece, dx, dy, rot = piece.rot, x = piece.x, y = piece.y) {
    for (const [bx,by] of piece.blocks(rot, x, y)) {
      const r = y + by + dy;
      const c = x + bx + dx;
      if (c < 0 || c >= W || r >= H) return false;
      if (r >= 0 && this.board.get(r, c)) return false;
    }
    return true;
  }
  drawBoard() {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const v = this.board.grid[r][c];
        const el = this.cells[this.idx(r,c)];
        el.className = 'cell';
        el.style.opacity = '';
        if (v) {
          if (v === 'OB2' || v === 'OB1') {
            el.classList.add('obstacle-cell');
            el.style.backgroundColor = v === 'OB2' ? '#6b7280' : '#9ca3af';
          } else {
            el.style.backgroundColor = PIECES[v].color;
          }
        } else {
          el.style.backgroundColor = '';
        }
      }
    }
  }
  drawGhost(piece) {
    for (const i of this.prevGhostIdx) {
      this.cells[i].style.opacity = '';
      this.cells[i].classList.remove("ghost");
    }
    this.prevGhostIdx.length = 0;
    if (!piece) return;
    let gy = piece.y;
    while (this.validGhost(piece, 0, 1, piece.rot, piece.x, gy)) {
      gy++;
    }
    const color = PIECES[piece.type].color;
    for (const [dx,dy] of piece.blocks(piece.rot, piece.x, gy)) {
      const r = gy + dy, c = piece.x + dx;
      if (r >= 0 && r < H && c >= 0 && c < W) {
        if (!this.board.grid[r][c]) {
          const i = this.idx(r,c);
          this.cells[i].style.backgroundColor = color;
          this.cells[i].style.opacity = '0.28';
          this.cells[i].classList.add("ghost");
          this.prevGhostIdx.push(i);
        }
      }
    }
  }
  drawActive(piece) {
    for (const i of this.prevActiveIdx) {
      this.cells[i].classList.remove("active");
    }
    this.prevActiveIdx.length = 0;
    const color = PIECES[piece.type].color;
    for (const [dx,dy] of piece.blocks()) {
      const r = piece.y + dy, c = piece.x + dx;
      if (r >= 0 && r < H && c >= 0 && c < W) {
        const i = this.idx(r,c);
        this.cells[i].classList.add("active");
        this.cells[i].style.backgroundColor = color;
        this.prevActiveIdx.push(i);
      }
    }
  }
  clearAllTemporaryElements() {
    // Clear all temporary visual elements including ghost pieces
    for (const i of this.prevGhostIdx) {
      this.cells[i].style.opacity = '';
      this.cells[i].classList.remove("ghost");
    }
    this.prevGhostIdx.length = 0;
    
    for (const i of this.prevActiveIdx) {
      this.cells[i].classList.remove("active");
    }
    this.prevActiveIdx.length = 0;
    
    // Clear any other temporary styling
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = this.idx(r, c);
        const el = this.cells[i];
        if (!el.classList.contains('cell')) {
          el.className = 'cell';
        }
      }
    }
  }

  drawPreview(type) {
    const cells = Array.from(previewEl.children);
    for (const c of cells) {
      c.style.backgroundColor = '';
    }
    if (!type) {
      previewEl.style.opacity = "0";
      previewEl.getBoundingClientRect();
      previewEl.style.transition = "opacity 200ms ease";
      previewEl.style.opacity = "1";
      return;
    }
    const piece = new Piece(type);
    const shape = piece.shape();
    const color = PIECES[type].color;
    const w = shape[0].length;
    const h = shape.length;
    const startX = Math.floor((6 - w) / 2);
    const startY = Math.floor((6 - h) / 2);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const idx = (startY + r) * 6 + (startX + c);
          cells[idx].style.backgroundColor = color;
        }
      }
    }
    previewEl.style.opacity = "0";
    previewEl.getBoundingClientRect();
    previewEl.style.transition = "opacity 200ms ease";
    previewEl.style.opacity = "1";
    if (previewWrap) { previewWrap.classList.add("active"); setTimeout(()=>previewWrap.classList.remove("active"), 220); }
  }

  drawHold(heldPiece, helperType) {
    const cells = Array.from(holdEl.children);
    for (const c of cells) {
      c.style.backgroundColor = '';
    }
    if (!heldPiece) {
      holdEl.style.opacity = "0";
      holdEl.getBoundingClientRect();
      holdEl.style.transition = "opacity 200ms ease";
      holdEl.style.opacity = "1";
    } else {
      const piece = new Piece(heldPiece.type);
      const shape = piece.shape();
      const color = PIECES[heldPiece.type].color;
      const w = shape[0].length;
      const h = shape.length;
      const startX = Math.floor((6 - w) / 2);
      const startY = Math.floor((6 - h) / 2);
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (shape[r][c]) {
            const idx = (startY + r) * 6 + (startX + c);
            cells[idx].style.backgroundColor = color;
          }
        }
      }
      holdEl.style.opacity = "0";
      holdEl.getBoundingClientRect();
      holdEl.style.transition = "opacity 200ms ease";
      holdEl.style.opacity = "1";
    }
    if (holdEl2) {
      const cells2 = Array.from(holdEl2.children);
      for (const c of cells2) c.style.backgroundColor = '';
      if (helperType) {
        const piece2 = new Piece(helperType);
        const shape2 = piece2.shape();
        const color2 = PIECES[helperType].color;
        const w2 = shape2[0].length;
        const h2 = shape2.length;
        const startX2 = Math.floor((6 - w2) / 2);
        const startY2 = Math.floor((6 - h2) / 2);
        for (let r = 0; r < h2; r++) {
          for (let c = 0; c < w2; c++) {
            if (shape2[r][c]) {
              const idx2 = (startY2 + r) * 6 + (startX2 + c);
              cells2[idx2].style.backgroundColor = color2;
            }
          }
        }
        holdEl2.style.display = "grid";
      } else {
        holdEl2.style.display = "none";
      }
    }
  }
}

const tweenNumber = (el, to, dur = 400) => {
  const from = parseInt(el.textContent || "0", 10);
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur);
    const v = Math.round(from + (to - from) * (k < 0.5 ? 2*k*k : -1 + (4 - 2*k) * k));
    el.textContent = String(v);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

class Game {
  constructor() {
    this.board = new Board(W, H);
    this.renderer = new Renderer(this.board);
    this.queue = [];
    this.active = null;
    this.keyBindings = {
      moveLeft: ["ArrowLeft"],
      moveRight: ["ArrowRight"],
      rotateCW: ["ArrowUp"],
      rotateCCW: ["ShiftLeft","ShiftRight"],
      softDrop: ["ArrowDown"],
      hardDrop: ["Space"],
      hold: ["KeyQ"],
      release: ["KeyE"],
    };
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.isPaused = false;
    this.state = "ready";
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.softDropping = false;
    this.lastTime = performance.now();

    // Unlock System
    this.permanentPool = this.loadPool();
    this.currentPool = [...this.permanentPool];
    this.runUnlocks = [];
    this.linesSinceUnlock = 0;
    this.unlockThreshold = 10;

    this.speedUpConfig = {
      basePerUpgrade: SPEEDUP_BASE_INCREMENT,
      randomRange: SPEEDUP_RANDOM_RANGE,
      maxMultiplier: BASE_GRAVITY_MS / SPEEDUP_MIN_MS,
    };
    this.speedUpPerLevel = 1;
    this.tempUpgrades = {
      speedUpLevels: 0,
      rerollCharges: 0,
      shieldCharges: 0,
      scoreMultiplier: 1,
      scoreMultiplierLines: 0,
      clearRowCharges: 0,
      clearColumnCharges: 0,
      clearAreaCharges: 0,
    };
    this.secondChanceAvailable = false;
    this.permUpgrades = {
      expandedPreview: false,
      expandedHold: false,
      obstacleMode: true,
    };
    this.removedPieces = [];
    this.warningAudioEnabled = true;
    this.pendingObstacleTimeout = null;
    this.piecesSinceObstacle = 0;

    this.objectives = null;
    this.extraBoardColumns = 0;

    // Hold/Release System
    this.holdSlots = [];
    this.holdCooldown = 0;
    this.holdCooldownTime = 500;
    this.lastHoldTime = 0;
    this.holdCapacity = 1;
    this.maxExtraHolds = 2;
    this.extraHoldConfig = [3, 5];

    this.obstacleScoreMultiplier = 2;
    this.obstaclePieceInterval = 4;
    this.obstacleUpgradeLevel = 0;

    this.loop = this.loop.bind(this);
    this.bindInput();
    this.initDisplay();
    this.updatePoolDisplay();
    this.updateUpgradeIndicators();

    const availableKeys = ["KeyQ", "KeyW", "KeyE", "KeyA", "KeyS", "KeyD", "KeyZ", "KeyX", "KeyC"];
    const holdKeySelect = byId("hold-key");
    const releaseKeySelect = byId("release-key");

    availableKeys.forEach(key => {
      const option1 = document.createElement("option");
      option1.value = key;
      option1.textContent = key.replace("Key", "");
      holdKeySelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = key;
      option2.textContent = key.replace("Key", "");
      releaseKeySelect.appendChild(option2);
    });

    holdKeySelect.value = this.keyBindings.hold[0];
    releaseKeySelect.value = this.keyBindings.release[0];

    holdKeySelect.addEventListener("change", (e) => {
      this.keyBindings.hold[0] = e.target.value;
    });

    releaseKeySelect.addEventListener("change", (e) => {
      this.keyBindings.release[0] = e.target.value;
    });
    if (warningSoundToggle) {
      this.warningAudioEnabled = warningSoundToggle.checked;
      warningSoundToggle.addEventListener("change", () => {
        this.warningAudioEnabled = warningSoundToggle.checked;
      });
    }
    if (clearRowBtn) {
      clearRowBtn.addEventListener("click", () => this.useClearRow());
    }
    if (clearColBtn) {
      clearColBtn.addEventListener("click", () => this.useClearColumn());
    }
    if (clearAreaBtn) {
      clearAreaBtn.addEventListener("click", () => this.useClearArea());
    }

    // Add event listener for unlock modal closure
    window.addEventListener('unlockModalClosed', () => {
      this.clearVisualGuides();
      this.renderer.clearAllTemporaryElements();
      this.renderer.drawBoard();
      if (this.active) {
        this.renderer.drawGhost(this.active);
        this.renderer.drawActive(this.active);
      }
    });

    this.updateBoardDimensions();
    this.resetObjectivesForLevel();
    this.updateObjectivesDisplay();
  }

  loadPool() {
    try {
      const saved = localStorage.getItem('rogueTris_pool');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return [...STANDARD_PIECES];
  }

  savePool() {
    localStorage.setItem('rogueTris_pool', JSON.stringify(this.permanentPool));
  }

  createMiniPiece(type, blockSize = 4) {
    const p = PIECES[type];
    const shape = p.shape;
    const w = shape[0].length;

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${w}, ${blockSize}px)`;
    grid.style.gap = '1px';

    shape.forEach(row => {
      row.forEach(cell => {
        const cellDiv = document.createElement('div');
        cellDiv.style.width = `${blockSize}px`;
        cellDiv.style.height = `${blockSize}px`;
        if (cell) {
          cellDiv.style.backgroundColor = p.color;
        }
        grid.appendChild(cellDiv);
      });
    });
    return grid;
  }

  updatePoolDisplay() {
    const el = document.getElementById('pool-display');
    if (!el) return;
    el.innerHTML = '';
    const sorted = [...this.currentPool].sort((a, b) => {
      const isStdA = STANDARD_PIECES.includes(a);
      const isStdB = STANDARD_PIECES.includes(b);
      if (isStdA && !isStdB) return -1;
      if (!isStdA && isStdB) return 1;
      return a.localeCompare(b);
    });

    sorted.forEach(type => {
      const div = document.createElement('div');
      div.className = 'pool-item';
      if (this.runUnlocks.includes(type)) div.classList.add('new');

      div.title = type;
      div.appendChild(this.createMiniPiece(type, 4));
      el.appendChild(div);
    });
  }

  initDisplay() {
    this.renderer.drawBoard();
    this.renderer.drawPreview(null);
    scoreEl.textContent = "0";
    linesEl.textContent = "0";
    levelEl.textContent = "1";
    achievementsEl.textContent = "";
    if (pauseBtn) pauseBtn.disabled = true;
    const ind = byId('upgrade-indicators');
    if (ind) ind.innerHTML = '';
    this.updateConsumableButtons();
    this.updateObjectivesDisplay();
  }

  updateBoardDimensions() {
    if (!this.board || !boardEl) return;
    const cols = this.board.w;
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", var(--cell-size))";
    boardEl.setAttribute("aria-colcount", String(cols));
    if (particlesCanvas) {
      particlesCanvas.width = boardEl.clientWidth;
      particlesCanvas.height = boardEl.clientHeight;
    }
  }

  resetObjectivesForLevel() {
    const level = this.level || 1;
    const linesTarget = 6 + (level - 1) * 2;
    const scoreTarget = 800 * level;
    let obstaclesTarget = 0;
    if (this.permUpgrades && this.permUpgrades.obstacleMode) {
      const raw = 4 + level;
      obstaclesTarget = raw > 12 ? 12 : raw;
    }
    this.objectives = {
      level,
      targetLines: linesTarget,
      targetScore: scoreTarget,
      targetObstacles: obstaclesTarget,
      progressLines: 0,
      progressScore: 0,
      progressObstacles: 0
    };
  }

  updateObjectivesDisplay() {
    if (!objectivesEl) return;
    const infoEl = byId("info");
    if (!this.objectives || this.state === "gameover") {
      objectivesEl.style.display = "none";
      if (infoEl) infoEl.style.display = "";
      if (objLinesEl) objLinesEl.textContent = "";
      if (objScoreEl) objScoreEl.textContent = "";
      if (objObstaclesEl) objObstaclesEl.textContent = "";
      return;
    }
    objectivesEl.style.display = "block";
    if (infoEl) infoEl.style.display = "none";
    const obj = this.objectives;
    if (objLinesEl) {
      objLinesEl.textContent = obj.progressLines + " / " + obj.targetLines;
    }
    if (objScoreEl) {
      objScoreEl.textContent = obj.progressScore + " / " + obj.targetScore;
    }
    if (objObstaclesEl) {
      if (obj.targetObstacles > 0) {
        objObstaclesEl.textContent = obj.progressObstacles + " / " + obj.targetObstacles;
      } else {
        objObstaclesEl.textContent = "0 / 0";
      }
    }
  }

  checkObjectivesComplete() {
    const obj = this.objectives;
    if (!obj) return false;
    if (obj.targetLines > 0 && obj.progressLines < obj.targetLines) return false;
    if (obj.targetScore > 0 && obj.progressScore < obj.targetScore) return false;
    if (obj.targetObstacles > 0 && obj.progressObstacles < obj.targetObstacles) return false;
    return true;
  }

  handleLevelUp() {
    if (!this.objectives) return;
    this.level = (this.level || 1) + 1;
    tweenNumber(levelEl, this.level);
    achievementsEl.textContent = "Level Up!";
    this.updateUpgradeIndicators();
    this.resetObjectivesForLevel();
    this.updateObjectivesDisplay();
    this.unlock();
  }
  updateConsumableButtons() {
    if (!clearRowBtn || !clearColBtn || !clearAreaBtn) return;
    const rowCount = this.tempUpgrades ? this.tempUpgrades.clearRowCharges || 0 : 0;
    const colCount = this.tempUpgrades ? this.tempUpgrades.clearColumnCharges || 0 : 0;
    const areaCount = this.tempUpgrades ? this.tempUpgrades.clearAreaCharges || 0 : 0;
    if (clearRowCountEl) clearRowCountEl.textContent = String(rowCount);
    if (clearColCountEl) clearColCountEl.textContent = String(colCount);
    if (clearAreaCountEl) clearAreaCountEl.textContent = String(areaCount);
    const canUse = this.state === "playing" && !this.isPaused;
    clearRowBtn.disabled = !(rowCount > 0 && canUse);
    clearColBtn.disabled = !(colCount > 0 && canUse);
    clearAreaBtn.disabled = !(areaCount > 0 && canUse);
  }
  start() {
    this.reset();
    this.state = "playing";
    this.isPaused = false;
    if (pauseBtn) { pauseBtn.disabled = false; pauseBtn.setAttribute("aria-pressed","false"); pauseBtn.textContent = "Pause"; }
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }
  loop(time) {
    if (this.state === "paused" || this.state === "gameover") return;
    const dt = time - this.lastTime;
    this.lastTime = time;
    this.update(dt);
    
    // Validation check: ensure no temporary visual artifacts remain
    this.validateAndClearTemporaryElements();
    
    this.renderer.drawBoard();
    if (this.active) {
      this.renderer.drawGhost(this.active);
      this.renderer.drawActive(this.active);
    }
    requestAnimationFrame(this.loop);
  }

  validateAndClearTemporaryElements() {
    // Check if unlock modal is visible
    const modal = document.getElementById('unlock-overlay');
    const isModalVisible = modal && modal.classList.contains('visible');
    
    // If modal is not visible but we have visual guides, clear them
    if (!isModalVisible) {
      this.clearVisualGuides();
    }
  }
  update(dt) {
    if (this.state !== "playing") return;
    if (this.isPaused) return;
    const speed = this.softDropping ? SOFT_DROP_MS : this.ticksForLevel();
    this.dropTimer += dt;
    if (!this.active) {
      this.renderer.drawBoard();
      return;
    }
    const touching = !this.valid(this.active, 0, 1);
    if (touching) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this.lockPiece();
      }
    } else {
      this.lockTimer = 0;
      if (this.dropTimer >= speed) {
        this.move(0, 1);
        this.dropTimer = 0;
      }
    }
  }
  pullNext() {
    if (this.queue.length === 0) this.queue = bagRandom(this.currentPool);
    return this.queue.shift();
  }
  spawn() {
    const type = this.pullNext();
    this.active = new Piece(type);
    if (!this.valid(this.active, 0, 0, this.active.rot)) {
      this.state = "gameover";
      achievementsEl.textContent = "Game Over";
      if (pauseBtn) { pauseBtn.setAttribute("aria-pressed", "false"); pauseBtn.textContent = "Pause"; }
      return;
    }
    if (this.queue.length === 0) this.queue = bagRandom(this.currentPool);
    this.renderer.drawPreview(this.queue[0] || null);
    const p2 = byId('preview2');
    if (p2) {
      p2.style.display = this.permUpgrades.expandedPreview ? 'grid' : 'none';
      if (this.permUpgrades.expandedPreview) {
        const cells = Array.from(p2.children);
        for (const c of cells) c.style.backgroundColor = '';
        const next2 = this.queue[1] || null;
        if (next2) {
          const piece = new Piece(next2);
          const shape = piece.shape();
          const color = PIECES[next2].color;
          const w = shape[0].length;
          const h = shape.length;
          const startX = Math.floor((6 - w) / 2);
          const startY = Math.floor((6 - h) / 2);
          for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
              if (shape[r][c]) {
                const idx = (startY + r) * 6 + (startX + c);
                cells[idx].style.backgroundColor = color;
              }
            }
          }
        }
      }
    }
    this.updateHoldDisplay();
  }
  reset() {
    this.board = new Board(W, H);
    this.renderer = new Renderer(this.board);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.queue.length = 0;

    this.currentPool = [...this.permanentPool];
    this.runUnlocks = [];
    this.linesSinceUnlock = 0;
    if (this.pendingObstacleTimeout) {
      clearTimeout(this.pendingObstacleTimeout);
      this.pendingObstacleTimeout = null;
    }
    clearWarningBanner();
    this.updatePoolDisplay();

    this.resetObjectivesForLevel();
    this.updateBoardDimensions();

    this.spawn();
    tweenNumber(scoreEl, this.score);
    tweenNumber(linesEl, this.lines);
    tweenNumber(levelEl, this.level);
    achievementsEl.textContent = "";
    if (overlayEl) {
      overlayEl.classList.remove("visible");
      overlayEl.setAttribute("aria-hidden", "true");
    }
    this.updateUpgradeIndicators();
  }
  ticksForLevel() {
    const su = this.tempUpgrades ? this.tempUpgrades.speedUpLevels : 0;
    const raw = computeGravity(this.level, su);
    if (this.speedUpConfig && this.speedUpConfig.maxMultiplier) {
      const minMs = BASE_GRAVITY_MS / this.speedUpConfig.maxMultiplier;
      return Math.max(minMs, raw);
    }
    return raw;
  }
  valid(piece, dx, dy, rot = piece.rot) {
    for (const [bx,by] of piece.blocks(rot)) {
      const r = piece.y + by + dy;
      const c = piece.x + bx + dx;
      if (c < 0 || c >= W || r >= H) return false;
      if (r >= 0 && this.board.get(r, c)) return false;
    }
    return true;
  }
  move(dx, dy) {
    if (!this.active) return false;
    const ok = this.valid(this.active, dx, dy);
    if (ok) {
      this.active.x += dx;
      this.active.y += dy;
      this.lockTimer = 0;
    }
    return ok;
  }
  rotate(dir) {
    if (!this.active) return false;
    const from = this.active.rot;
    const to = (from + (dir === 1 ? 1 : 3)) % 4;
    const key = `${from}>${to}`;
    const type = this.active.type;
    const kicks = type === "i" ? (dir === 1 ? SRS_I_RIGHT[key] : SRS_I_LEFT[key]) : (dir === 1 ? SRS_JLSTZ_RIGHT[key] : SRS_JLSTZ_LEFT[key]);

    const baseShape = PIECES[type].shape;
    const baseW = baseShape[0].length;
    const baseH = baseShape.length;
    let w, h;
    if (from % 2 === 0) { w = baseW; h = baseH; } else { w = baseH; h = baseW; }

    const cx = this.active.cx;
    const cy = this.active.cy;
    let ncx, ncy;
    if (dir === 1) {
      ncx = h - 1 - cy;
      ncy = cx;
    } else {
      ncx = cy;
      ncy = w - 1 - cx;
    }
    const shiftX = Math.round(cx - ncx);
    const shiftY = Math.round(cy - ncy);

    for (const [kx, ky] of kicks) {
      const tx = shiftX + kx;
      const ty = shiftY + ky;
      if (this.valid(this.active, tx, ty, to)) {
        this.active.x += tx;
        this.active.y += ty;
        this.active.rot = to;
        this.active.cx = ncx;
        this.active.cy = ncy;
        this.lockTimer = 0;
        return true;
      }
    }
    return false;
  }
  hardDrop() {
    if (this.state !== "playing") return;
    if (!this.active) return;
    let dist = 0;
    while (this.move(0,1)) dist++;
    this.score += dist * 2;
    tweenNumber(scoreEl, this.score, 250);
    this.lockPiece();
  }
  applyMovementScheme(scheme) {
    if (scheme === "wasd") {
      this.keyBindings.moveLeft = ["KeyA"];
      this.keyBindings.moveRight = ["KeyD"];
      this.keyBindings.softDrop = ["KeyS"];
      this.keyBindings.rotateCW = ["KeyW"];
    } else {
      this.keyBindings.moveLeft = ["ArrowLeft"];
      this.keyBindings.moveRight = ["ArrowRight"];
      this.keyBindings.softDrop = ["ArrowDown"];
      this.keyBindings.rotateCW = ["ArrowUp"];
    }
  }
  showCombo(lines) {
    if (!comboVisualEl) return;
    if (lines < 2) return;
    let text = "";
    if (lines === 2) text = "Double";
    else if (lines === 3) text = "Triple";
    else text = "Tetris";
    comboVisualEl.textContent = text;
    comboVisualEl.classList.remove("visible");
    void comboVisualEl.offsetWidth;
    comboVisualEl.classList.add("visible");
    setTimeout(() => {
      comboVisualEl.classList.remove("visible");
    }, 700);
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (this.state !== "playing") return;
      if (this.isPaused) return;
      const code = e.code;
      const match = (name) => {
        const list = this.keyBindings[name];
        return list && list.includes(code);
      };
      if (match("moveLeft")) { e.preventDefault(); this.move(-1,0); }
      else if (match("moveRight")) { e.preventDefault(); this.move(1,0); }
      else if (match("rotateCW")) { e.preventDefault(); this.rotate(1); }
      else if (match("rotateCCW")) { e.preventDefault(); this.rotate(-1); }
      else if (match("softDrop")) { e.preventDefault(); this.softDropping = true; }
      else if (match("hardDrop")) { e.preventDefault(); this.hardDrop(); }
      else if (match("hold")) { e.preventDefault(); this.hold(); }
      else if (match("release")) { e.preventDefault(); this.release(); }
    });
    window.addEventListener("keyup", (e) => {
      const code = e.code;
      const list = this.keyBindings.softDrop;
      if (list && list.includes(code)) this.softDropping = false;
    });
    pauseBtn.addEventListener("click", () => {
      if (this.state === "playing") {
        this.state = "paused";
        this.isPaused = true;
        pauseBtn.setAttribute("aria-pressed","true");
        pauseBtn.textContent = "Play";
        this.updateConsumableButtons();
      } else if (this.state === "paused") {
        this.state = "playing";
        this.isPaused = false;
        pauseBtn.setAttribute("aria-pressed","false");
        pauseBtn.textContent = "Pause";
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
        this.updateConsumableButtons();
      }
    });
    if (startBtn) startBtn.addEventListener("click", () => { this.start(); });
    if (restartBtn) restartBtn.addEventListener("click", () => {
      if (overlayEl) {
        overlayEl.classList.remove("visible");
        overlayEl.setAttribute("aria-hidden","true");
      }
      this.start();
    });
    if (controlsMovementRadios && controlsMovementRadios.length) {
      controlsMovementRadios.forEach((r) => {
        r.addEventListener("change", () => {
          if (!r.checked) return;
          this.applyMovementScheme(r.value);
        });
      });
    }
    const touchpad = byId("touchpad");
    const zoneAction = (el) => el?.dataset?.action;
    let swipeStart = null;
    const onPointerDown = (e) => {
      if (this.state !== "playing") return;
      swipeStart = { x: e.clientX, y: e.clientY, t: performance.now(), el: e.target };
      const z = zoneAction(e.target);
      if (z === "left") this.move(-1,0);
      else if (z === "right") this.move(1,0);
      else if (z === "rotate") this.rotate(1);
      else if (z === "soft-drop") this.softDropping = true;
    };
    const onPointerUp = (e) => {
      if (!swipeStart) return;
      const dx = e.clientX - swipeStart.x;
      const dy = e.clientY - swipeStart.y;
      const magX = Math.abs(dx), magY = Math.abs(dy);
      if (!zoneAction(swipeStart.el)) {
        if (magX > magY && magX > 24) {
          if (dx > 0) this.move(1,0); else this.move(-1,0);
        } else if (magY > 28) {
          if (dy > 0) this.softDropping = true; else this.rotate(1);
        } else {
          this.rotate(1);
        }
      }
      this.softDropping = false;
      swipeStart = null;
    };
    touchpad.addEventListener("pointerdown", onPointerDown);
    touchpad.addEventListener("pointerup", onPointerUp);
    touchpad.addEventListener("pointerleave", () => { this.softDropping = false; swipeStart = null; });
    if (!window.PointerEvent) {
      const touchStart = (e) => {
        const t = e.changedTouches[0];
        onPointerDown({ clientX: t.clientX, clientY: t.clientY, target: e.target });
      };
      const touchEnd = (e) => {
        const t = e.changedTouches[0];
        onPointerUp({ clientX: t.clientX, clientY: t.clientY, target: e.target });
      };
      touchpad.addEventListener("touchstart", touchStart, { passive: true });
      touchpad.addEventListener("touchend", touchEnd, { passive: true });
      touchpad.addEventListener("touchcancel", () => { this.softDropping = false; swipeStart = null; }, { passive: true });
    }
  }
  generateUnlockOptions(count = 3) {
    const available = Object.keys(PIECES).filter(p => !this.currentPool.includes(p));
    if (available.length === 0) return [];

    const options = [];
    const pool = [...available];
    for (let i = 0; i < count; i++) {
      if (pool.length === 0) break;
      const idx = Math.floor(Math.random() * pool.length);
      options.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return options;
  }

  unlock(isReroll = false) {
    if (!isReroll) {
      this.linesSinceUnlock -= this.unlockThreshold;
      this.rerollUsed = false;
    }

    const pieceOptions = this.generateUnlockOptions(3);
    const upgradeOptions = pickWeighted(UPGRADE_DEFS, 3);
    const combined = [];
    pieceOptions.forEach(type => combined.push({ kind: 'piece', value: type }));
    upgradeOptions.forEach(up => combined.push({ kind: 'upgrade', value: up }));
    if (!combined.length) return;
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = combined[i];
      combined[i] = combined[j];
      combined[j] = tmp;
    }
    const chosen = combined.slice(0, 3);
    const chosenPieces = chosen.filter(x => x.kind === 'piece').map(x => x.value);
    const chosenUpgrades = chosen.filter(x => x.kind === 'upgrade').map(x => x.value);
    if (!chosenPieces.length && !chosenUpgrades.length) return;
    const options = { pieces: chosenPieces, upgrades: chosenUpgrades, mode: 'mixed' };

    this.state = "unlocking";
    this.isPaused = true;
    this.showUnlockModal(options);
  }

  showUnlockModal(optionsOrPieces, isPermanent = false) {
    const modal = document.getElementById('unlock-overlay');
    const container = document.getElementById('unlock-options');
    if (!modal || !container) return;

    const oldBtn = modal.querySelector('.reroll-btn');
    if (oldBtn) oldBtn.remove();

    container.innerHTML = '';
    container.setAttribute('role', 'list');
    const title = document.querySelector('#unlock-overlay .overlay-title');
    const sub = document.querySelector('#unlock-overlay .unlock-subtitle');

    if (isPermanent) {
      title.textContent = "Run Complete!";
      sub.textContent = "Choose one piece to KEEP permanently:";
    } else {
      title.textContent = "Level Up";
      sub.textContent = "Choose one new option:";
    }

    const pieces = isPermanent ? optionsOrPieces : optionsOrPieces.pieces;
    const upgrades = isPermanent ? [] : optionsOrPieces.upgrades;

    (pieces || []).forEach(type => {
      const card = document.createElement('div');
      card.className = 'unlock-card';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      const pieceLabel = isPermanent ? `Keep piece ${type} permanently` : `Add piece ${type} to this run`;
      card.title = pieceLabel;
      card.setAttribute('aria-label', pieceLabel);
      const onSelect = () => isPermanent ? this.handlePermanentSelection(type) : this.handleUnlockSelection(type);
      card.onclick = onSelect;
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      };

      const p = PIECES[type];
      const prev = document.createElement('div');
      prev.className = 'unlock-preview';

      const mini = this.createMiniPiece(type, 8);
      mini.style.position = 'absolute';
      mini.style.top = '50%';
      mini.style.left = '50%';
      mini.style.transform = 'translate(-50%, -50%)';
      prev.appendChild(mini);

      const label = document.createElement('div');
      label.className = 'unlock-title';
      label.textContent = type;

      card.appendChild(prev);
      card.appendChild(label);
      container.appendChild(card);
    });

    if (!isPermanent && upgrades && upgrades.length) {
      const divider = document.createElement('div');
      divider.style.marginTop = '8px';
      divider.style.color = 'var(--muted)';
      divider.textContent = 'Upgrades';
      container.appendChild(divider);
      upgrades.forEach(up => {
        const card = document.createElement('div');
        card.className = 'unlock-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        const upLabel = up.desc ? `${up.name}: ${up.desc}` : up.name;
        card.title = upLabel;
        card.setAttribute('aria-label', upLabel);
        const onSelect = () => this.applyUpgrade(up.id);
        card.onclick = onSelect;
        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        };
        const prev = document.createElement('div');
        prev.className = 'unlock-preview';
        prev.textContent = up.icon;
        prev.style.fontSize = '28px';
        prev.style.display = 'flex';
        prev.style.alignItems = 'center';
        prev.style.justifyContent = 'center';
        const label = document.createElement('div');
        label.className = 'unlock-title';
        label.textContent = up.name;
        card.appendChild(prev);
        card.appendChild(label);
        container.appendChild(card);
      });
    }

    const canReroll = !isPermanent && (this.tempUpgrades.rerollCharges > 0 || !this.rerollUsed);
    if (canReroll) {
      const btn = document.createElement('button');
      btn.className = 'reroll-btn';
      btn.textContent = this.tempUpgrades.rerollCharges > 0 ? `Re-roll (${this.tempUpgrades.rerollCharges})` : 'Re-roll';
       btn.setAttribute('aria-label', 'Re-roll upgrade choices');
      btn.onclick = () => {
        if (this.tempUpgrades.rerollCharges > 0) this.tempUpgrades.rerollCharges--;
        this.handleReroll();
      };
      container.parentElement.appendChild(btn);
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      const firstCard = container.querySelector('.unlock-card');
      if (firstCard) firstCard.focus();
    }, 0);
  }

  handleReroll() {
    this.rerollUsed = true;
    this.unlock(true);
  }

  resetPermanentPool() {
    const allPieces = Object.keys(PIECES);
    const shuffled = bagRandom(allPieces);
    const count = 10;
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    this.permanentPool = selected;
    this.savePool();
    this.currentPool = [...this.permanentPool];
    this.runUnlocks = [];
    this.updatePoolDisplay();
  }

  handleUnlockSelection(type) {
    this.currentPool.push(type);
    this.runUnlocks.push(type);
    this.updatePoolDisplay();
    this.closeUnlockModal();

    this.state = "playing";
    this.isPaused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }
  recordUpgradeSelection(id) {
    try {
      const key = 'rogueTris_upgradeStats';
      const raw = localStorage.getItem(key);
      let data = {};
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') data = parsed;
      }
      data[id] = (data[id] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }
  updateUpgradeIndicators() {
    const ind = byId('upgrade-indicators');
    if (!ind) return;
    ind.innerHTML = '';
    const addBadge = (text, extraClass) => {
      const b = document.createElement('div');
      b.className = 'upgrade-badge' + (extraClass ? ' ' + extraClass : '');
      b.textContent = text;
      ind.appendChild(b);
    };
    if (this.tempUpgrades.speedUpLevels > 0) {
      const v = this.tempUpgrades.speedUpLevels;
      const label = Number.isInteger(v) ? String(v) : v.toFixed(1);
      addBadge(`⚡ x${label}`);
    }
    if (this.tempUpgrades.rerollCharges > 0) addBadge(`🎲 x${this.tempUpgrades.rerollCharges}`);
    if (this.tempUpgrades.shieldCharges > 0) addBadge(`🛡 x${this.tempUpgrades.shieldCharges}`);
    if (this.tempUpgrades.clearRowCharges > 0) addBadge(`➖ x${this.tempUpgrades.clearRowCharges}`);
    if (this.tempUpgrades.clearColumnCharges > 0) addBadge(`➕ x${this.tempUpgrades.clearColumnCharges}`);
    if (this.tempUpgrades.clearAreaCharges > 0) addBadge(`⛰ x${this.tempUpgrades.clearAreaCharges}`);
    if (this.tempUpgrades.scoreMultiplierLines > 0 && this.tempUpgrades.scoreMultiplier > 1) {
      addBadge(`✖ ${this.tempUpgrades.scoreMultiplier} (${this.tempUpgrades.scoreMultiplierLines})`);
    }
    if (this.secondChanceAvailable) addBadge('❤️');
    if (this.permUpgrades.expandedPreview) addBadge('🔭');
    if (this.holdCapacity && this.holdCapacity > 1) addBadge('📥');
    if (this.obstacleScoreMultiplier && this.obstacleScoreMultiplier > 2) addBadge('🧱');
    const speedMs = this.ticksForLevel();
    if (speedMs > 0) {
      const mult = Math.round((BASE_GRAVITY_MS / speedMs) * 10) / 10;
      addBadge(`⏱ ${mult}x`, 'speed-badge');
    }
  }
  applyUpgrade(id) {
    this.recordUpgradeSelection(id);
    if (id === 'speed_up') {
      const cfg = this.speedUpConfig || {};
      const base = typeof cfg.basePerUpgrade === 'number' ? cfg.basePerUpgrade : 1;
      const range = typeof cfg.randomRange === 'number' ? cfg.randomRange : 0;
      const jitter = range > 0 ? (Math.random() * 2 - 1) * range : 0;
      const delta = base + jitter;
      this.tempUpgrades.speedUpLevels = Math.max(0, (this.tempUpgrades.speedUpLevels || 0) + delta);
      achievementsEl.textContent = "Speed Up!";
    } else if (id === 'extra_reroll') {
      this.tempUpgrades.rerollCharges += 1;
      achievementsEl.textContent = "Extra Re-roll!";
      this.triggerUpgradeEffect();
    } else if (id === 'second_chance') {
      this.secondChanceAvailable = true;
      achievementsEl.textContent = "Second Chance ready!";
      this.triggerUpgradeEffect();
    } else if (id === 'expanded_preview') {
      this.permUpgrades.expandedPreview = true;
      achievementsEl.textContent = "+1 Next unlocked!";
      this.triggerUpgradeEffect();
    } else if (id === 'expanded_hold') {
      const prevCapacity = this.holdCapacity || 1;
      if (!this.permUpgrades.expandedHold) this.permUpgrades.expandedHold = true;
      if (prevCapacity < 1 + this.maxExtraHolds) {
        this.holdCapacity = prevCapacity + 1;
        achievementsEl.textContent = "+1 Hold cell unlocked!";
      } else {
        achievementsEl.textContent = "Hold cells already at maximum.";
      }
      this.triggerUpgradeEffect();
    } else if (id === 'piece_removal') {
      const candidates = [...this.currentPool];
      if (!candidates.length) { this.closeUnlockModal(); return; }
      this.startPieceRemovalSelection(candidates);
      return;
    } else if (id === 'obstacle_mode') {
      this.permUpgrades.obstacleMode = true;
      this.obstacleUpgradeLevel = (this.obstacleUpgradeLevel || 0) + 1;
      this.obstacleScoreMultiplier = 2 + this.obstacleUpgradeLevel;
      const baseInterval = 4;
      this.obstaclePieceInterval = Math.max(1, baseInterval - this.obstacleUpgradeLevel);
      achievementsEl.textContent = "Obstacle Focus!";
      showWarningBanner("Obstacles are tougher and worth more points.");
      this.triggerUpgradeEffect();
    } else if (id === 'score_mult') {
      this.tempUpgrades.scoreMultiplier = 2;
      this.tempUpgrades.scoreMultiplierLines += 3;
      achievementsEl.textContent = "Score Multiplier!";
      this.triggerUpgradeEffect();
    } else if (id === 'clear_row') {
      this.tempUpgrades.clearRowCharges += 1;
      achievementsEl.textContent = "Clear Row charge gained!";
      this.updateConsumableButtons();
      this.triggerUpgradeEffect();
    } else if (id === 'clear_column') {
      this.tempUpgrades.clearColumnCharges += 1;
      achievementsEl.textContent = "Clear Column charge gained!";
      this.updateConsumableButtons();
      this.triggerUpgradeEffect();
    } else if (id === 'clear_area') {
      this.tempUpgrades.clearAreaCharges += 1;
      achievementsEl.textContent = "Clear Area charge gained!";
      this.updateConsumableButtons();
      this.triggerUpgradeEffect();
    } else if (id === 'expand_board') {
      const base = BASE_W;
      const maxExtra = MAX_EXTRA_BOARD_COLS;
      const currentWidth = this.board ? this.board.w : W;
      const currentExtra = currentWidth > base ? currentWidth - base : 0;
      if (currentExtra >= maxExtra) {
        achievementsEl.textContent = "Board width already at maximum.";
      } else {
        this.expandBoardWidth();
        achievementsEl.textContent = "Board expanded!";
        this.triggerUpgradeEffect();
      }
      this.updateUpgradeIndicators();
      this.updateObjectivesDisplay();
      this.closeUnlockModal();
      this.state = "playing";
      this.isPaused = false;
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop);
      return;
    }
    this.closeUnlockModal();
    this.updateUpgradeIndicators();
    this.updateConsumableButtons();
    this.state = "playing";
    this.isPaused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  expandBoardWidth() {
    const base = BASE_W;
    const maxExtra = MAX_EXTRA_BOARD_COLS;
    const currentWidth = this.board ? this.board.w : W;
    const currentExtra = currentWidth > base ? currentWidth - base : 0;
    if (currentExtra >= maxExtra) return;
    const newExtra = currentExtra + 1;
    const newW = base + newExtra;
    W = newW;
    if (this.board) {
      const delta = newW - this.board.w;
      if (delta > 0) {
        for (let r = 0; r < this.board.h; r++) {
          const row = this.board.grid[r];
          for (let i = 0; i < delta; i++) {
            row.push(0);
          }
        }
        this.board.w = newW;
      }
    }
    if (boardEl) {
      boardEl.innerHTML = "";
      makeCells(boardEl, H, newW, "cell");
    }
    this.renderer = new Renderer(this.board);
    this.updateBoardDimensions();
    this.renderer.drawBoard();
    if (this.active) {
      this.renderer.drawGhost(this.active);
      this.renderer.drawActive(this.active);
    }
    this.extraBoardColumns = newExtra;
  }

  startPieceRemovalSelection(candidates) {
    const modal = document.getElementById('unlock-overlay');
    const container = document.getElementById('unlock-options');
    if (!modal || !container) return;
    modal.classList.add('piece-removal-mode');
    container.classList.add('piece-removal-mode');
    container.innerHTML = '';
    const title = modal.querySelector('.overlay-title');
    const sub = modal.querySelector('.unlock-subtitle');
    if (title) title.textContent = "Remove Piece";
    if (sub) sub.textContent = "Choose one piece to remove from this run:";
    let selected = null;
    candidates.sort().slice(0, 30).forEach(type => {
      const card = document.createElement('div');
      card.className = 'unlock-card selectable';
      card.title = `Remove ${type} from the pool`;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.setAttribute('aria-pressed', 'false');
      const prev = document.createElement('div');
      prev.className = 'unlock-preview';
      const mini = this.createMiniPiece(type, 6);
      mini.style.position = "absolute";
      mini.style.top = "50%";
      mini.style.left = "50%";
      mini.style.transform = "translate(-50%, -50%)";
      prev.appendChild(mini);
      const label = document.createElement('div');
      label.className = 'unlock-title';
      label.textContent = type;
      card.appendChild(prev);
      card.appendChild(label);
      const selectCard = () => {
        const prevSel = container.querySelector('.unlock-card.selected');
        if (prevSel) {
          prevSel.classList.remove('selected');
          prevSel.setAttribute('aria-pressed', 'false');
        }
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        selected = type;
      };
      card.onclick = selectCard;
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCard();
        }
      };
      container.appendChild(card);
    });
    const confirm = document.createElement('button');
    confirm.className = 'control-btn small-btn';
    confirm.classList.add('piece-removal-confirm');
    confirm.textContent = "Confirm removal";
    confirm.onclick = () => {
      if (!selected) return;
      this.finishPieceRemoval(selected);
    };
    const inner = modal.querySelector('.overlay-inner');
    if (inner) {
      const existingConfirm = inner.querySelector('.piece-removal-confirm');
      if (existingConfirm) existingConfirm.remove();
      inner.appendChild(confirm);
    } else {
      container.appendChild(confirm);
    }
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  finishPieceRemoval(type) {
    this.currentPool = this.currentPool.filter(p => p !== type);
    this.removedPieces.push(type);
    this.updatePoolDisplay();
    achievementsEl.textContent = `Removed ${type}`;
    this.triggerUpgradeEffect();
    this.closeUnlockModal();
    this.updateUpgradeIndicators();
    this.state = "playing";
    this.isPaused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  handlePermanentSelection(type) {
    if (!this.permanentPool.includes(type)) {
      this.permanentPool.push(type);
      this.savePool();
    }
    this.closeUnlockModal();
    this.showGameOverScreen();
  }

  showGameOverScreen() {
    const summary = `Game Over — Score ${this.score} • Lines ${this.lines} • Level ${this.level}`;
    achievementsEl.textContent = summary;
    if (summaryScoreEl) summaryScoreEl.textContent = String(this.score);
    if (summaryLinesEl) summaryLinesEl.textContent = String(this.lines);
    if (summaryLevelEl) summaryLevelEl.textContent = String(this.level);
    if (overlayEl) {
      overlayEl.classList.add("visible");
      overlayEl.setAttribute("aria-hidden", "false");
    }
    if (this.pendingObstacleTimeout) {
      clearTimeout(this.pendingObstacleTimeout);
      this.pendingObstacleTimeout = null;
    }
    clearWarningBanner();
    this.active = null;
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseBtn.textContent = "Pause";
    }
    this.renderer.drawBoard();
    this.updateConsumableButtons();
    this.updateObjectivesDisplay();
  }

  closeUnlockModal() {
    const modal = document.getElementById('unlock-overlay');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('piece-removal-mode');
    }
    const container = document.getElementById('unlock-options');
    if (container) {
      container.classList.remove('piece-removal-mode');
    }
    if (modal) {
      const existingConfirm = modal.querySelector('.piece-removal-confirm');
      if (existingConfirm) existingConfirm.remove();
    }
    // Clear any visual guides and temporary elements
    this.clearVisualGuides();
    // Force complete board redraw to ensure no artifacts remain
    this.renderer.clearAllTemporaryElements();
    this.renderer.drawBoard();
    if (this.active) {
      this.renderer.drawGhost(this.active);
      this.renderer.drawActive(this.active);
    }
    
    // Dispatch custom event for popup closure
    window.dispatchEvent(new CustomEvent('unlockModalClosed'));
  }

  clearVisualGuides() {
    // Clear any temporary visual guide lines or elements
    const guideElements = document.querySelectorAll('.visual-guide, .temp-line, .guide-line');
    guideElements.forEach(el => el.remove());
  }

  scheduleObstacleRow() {
    if (!this.permUpgrades.obstacleMode) return;
    if (this.pendingObstacleTimeout) {
      clearTimeout(this.pendingObstacleTimeout);
      this.pendingObstacleTimeout = null;
    }
    showWarningBanner("Obstacle row incoming.");
    if (this.warningAudioEnabled) {
      playTone(440, 200, 0.08);
    }
    this.pendingObstacleTimeout = setTimeout(() => {
      clearWarningBanner();
      if (this.state === "playing") {
        this.spawnProceduralObstacleRow();
        this.renderer.drawBoard();
      }
      this.pendingObstacleTimeout = null;
    }, 600);
  }

  spawnProceduralObstacleRow() {
    if (!this.board) return;
    const w = this.board.w;
    const pattern = Array(w).fill(0);
    const mode = Math.floor(Math.random() * 3);
    if (mode === 0) {
      const span = Math.max(2, Math.min(4, w));
      const start = Math.max(0, Math.floor(Math.random() * (w - span)));
      for (let c = start; c < start + span; c++) pattern[c] = 1;
    } else if (mode === 1) {
      for (let c = 0; c < w; c++) {
        if (c % 2 === 0) pattern[c] = 1;
      }
    } else {
      for (let c = 0; c < w; c++) {
        if (Math.random() < 0.5) pattern[c] = 1;
      }
    }
    if (!pattern.some(v => v)) {
      const idx = Math.floor(Math.random() * w);
      pattern[idx] = 1;
    }
    if (typeof this.board.addObstacleRowPattern === 'function') {
      this.board.addObstacleRowPattern(pattern);
    } else {
      this.board.addObstacleRow();
    }
    if (boardWrapEl) {
      boardWrapEl.classList.add('obstacle-rise');
      setTimeout(() => {
        boardWrapEl.classList.remove('obstacle-rise');
      }, 260);
    }
  }

  lockPiece() {
    this.board.mergePiece(this.active);
    const scores = {1:100,2:300,3:500,4:800};
    if (this.holdSlots && this.holdSlots.length > 1) {
      const expiredIndices = [];
      for (let i = 1; i < this.holdSlots.length; i++) {
        const slot = this.holdSlots[i];
        if (!slot) continue;
        if (!Number.isFinite(slot.turnsLeft)) continue;
        slot.turnsLeft -= 1;
        if (slot.turnsLeft <= 0) expiredIndices.push(i);
      }
      if (expiredIndices.length) {
        const returnedTypes = [];
        expiredIndices.sort((a, b) => b - a).forEach(idx => {
          const slot = this.holdSlots[idx];
          if (slot && slot.type) returnedTypes.push(slot.type);
          this.holdSlots.splice(idx, 1);
        });
        if (!this.queue) this.queue = [];
        returnedTypes.forEach(type => {
          this.queue.unshift(type);
        });
        if (returnedTypes.length && typeof this.showTemporaryMessage === "function") {
          this.showTemporaryMessage("Held piece returned to queue");
        }
        this.updateHoldDisplay();
      }
    }
    let cleared = this.board.clearLines();
    if (cleared.length === 0) {
      this.combo = -1;
      achievementsEl.textContent = "";
    }
    while (cleared.length) {
      for (let c = 0; c < this.board.w; c++) {
        const stack = [];
        for (let r = 0; r < this.board.h; r++) {
          const v = this.board.grid[r][c];
          if (v) stack.push(v);
        }
        let r = this.board.h - 1;
        while (stack.length) {
          this.board.grid[r][c] = stack.pop();
          r--;
        }
        while (r >= 0) {
          this.board.grid[r][c] = 0;
          r--;
        }
      }
      this.spawnParticles(cleared);
      if (cleared.length > 1) this.showCombo(cleared.length);
      const hadObstacles = Array.isArray(this.board.lastClearedHadObstacles) && this.board.lastClearedHadObstacles.some(Boolean);
      const obstacleLines = Array.isArray(this.board.lastClearedHadObstacles)
        ? this.board.lastClearedHadObstacles.filter(Boolean).length
        : 0;
      const baseAdd = (scores[cleared.length] || 0) * this.level;
      let lineMultiplier = 1;
      if (hadObstacles) {
        lineMultiplier = this.obstacleScoreMultiplier || 2;
      }
      const add = baseAdd * lineMultiplier;
      this.combo++;
      let comboBonus = 0;
      if (this.combo > 0) {
        comboBonus = 50 * this.combo * this.level;
        achievementsEl.textContent = `Combo x${this.combo}`;
      }
      let total = add + comboBonus;
      if (this.tempUpgrades && this.tempUpgrades.scoreMultiplier > 1 && this.tempUpgrades.scoreMultiplierLines > 0) {
        total = Math.floor(total * this.tempUpgrades.scoreMultiplier);
        this.tempUpgrades.scoreMultiplierLines -= cleared.length;
        if (this.tempUpgrades.scoreMultiplierLines <= 0) {
          this.tempUpgrades.scoreMultiplierLines = 0;
          this.tempUpgrades.scoreMultiplier = 1;
        }
      }
      this.score += total;
      this.lines += cleared.length;
      if (this.objectives) {
        const obj = this.objectives;
        obj.progressLines = obj.progressLines + cleared.length > obj.targetLines ? obj.targetLines : obj.progressLines + cleared.length;
        obj.progressScore = obj.progressScore + total > obj.targetScore ? obj.targetScore : obj.progressScore + total;
        if (obstacleLines > 0 && obj.targetObstacles > 0) {
          const nextOb = obj.progressObstacles + obstacleLines;
          obj.progressObstacles = nextOb > obj.targetObstacles ? obj.targetObstacles : nextOb;
        }
        this.updateObjectivesDisplay();
      }
      tweenNumber(scoreEl, this.score);
      tweenNumber(linesEl, this.lines);
      playTone(550, 50, 0.08);
      playTone(660, 50, 0.08);
      if (this.checkObjectivesComplete()) {
        this.handleLevelUp();
        break;
      }
      cleared = this.board.clearLines();
    }
    this.updateUpgradeIndicators();
    if (this.board.grid[0].some(v => v)) {
      if (this.secondChanceAvailable) {
        this.secondChanceAvailable = false;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < this.board.w; c++) {
            this.board.grid[r][c] = 0;
          }
        }
        achievementsEl.textContent = "Second Chance!";
        this.renderer.drawBoard();
        this.active = null;
        this.spawn();
        this.renderer.drawBoard();
        return;
      }
      if (this.tempUpgrades && this.tempUpgrades.shieldCharges > 0) {
        this.tempUpgrades.shieldCharges--;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < this.board.w; c++) {
            this.board.grid[r][c] = 0;
          }
        }
        achievementsEl.textContent = "Shield!";
        this.renderer.drawBoard();
        this.active = null;
        this.spawn();
        this.renderer.drawBoard();
        return;
      }
      if (this.tempUpgrades && this.tempUpgrades.shieldCharges > 0) {
        this.tempUpgrades.shieldCharges--;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < this.board.w; c++) {
            this.board.grid[r][c] = 0;
          }
        }
        achievementsEl.textContent = "Shield!";
        this.renderer.drawBoard();
        this.active = null;
        this.spawn();
        this.renderer.drawBoard();
        this.updateUpgradeIndicators();
        return;
      }
      this.state = "gameover";
      this.isPaused = true;

      const potential = this.runUnlocks.filter(u => !this.permanentPool.includes(u));
      if (potential.length > 0) {
        this.showUnlockModal(potential, true);
        return;
      }

      this.showGameOverScreen();
      return;
    }
    if (this.permUpgrades && this.permUpgrades.obstacleMode) {
      this.piecesSinceObstacle = (this.piecesSinceObstacle || 0) + 1;
      const interval = this.obstaclePieceInterval || 4;
      if (this.piecesSinceObstacle >= interval) {
        this.piecesSinceObstacle = 0;
        this.scheduleObstacleRow();
      }
    }
    this.active = null;
    this.spawn();
    this.renderer.drawBoard();
  }
  hold() {
    if (!this.active || this.state !== "playing") return;

    const now = Date.now();
    if (now - this.lastHoldTime < this.holdCooldownTime) return;

    const maxSlots = this.holdCapacity || 1;
    if (!this.holdSlots) this.holdSlots = [];
    if (this.holdSlots.length >= maxSlots) {
      if (typeof this.showTemporaryMessage === "function") {
        this.showTemporaryMessage("Hold slots full");
      }
      return;
    }

    const index = this.holdSlots.length;
    const baseTurns = index === 0
      ? Infinity
      : (this.extraHoldConfig[index - 1] || this.extraHoldConfig[this.extraHoldConfig.length - 1] || 3);

    this.holdSlots.push({
      type: this.active.type,
      turnsLeft: baseTurns
    });

    this.lastHoldTime = now;
    this.updateHoldDisplay();
    this.active = null;
    this.spawn();
    this.renderer.drawBoard();
  }

  release() {
    if (this.state !== "playing") return;

    const now = Date.now();
    if (now - this.lastHoldTime < this.holdCooldownTime) return;

    if (!this.holdSlots || !this.holdSlots.length) return;

    const primary = this.holdSlots[0];
    const newPiece = new Piece(primary.type);
    if (!this.valid(newPiece, 0, 0, newPiece.rot)) {
      newPiece.x = Math.floor(W / 2);
      newPiece.y = -2;
      newPiece.rot = 0;
      if (!this.valid(newPiece, 0, 0, newPiece.rot)) {
        return;
      }
    }

    if (this.active) {
      const prevType = this.active.type;
      this.active = newPiece;
      primary.type = prevType;
    } else {
      this.active = newPiece;
      this.holdSlots.shift();
    }

    this.lastHoldTime = now;

    this.updateHoldDisplay();
    this.renderer.drawBoard();
    this.renderer.drawGhost(this.active);
    this.renderer.drawActive(this.active);
  }

  updateHoldDisplay() {
    const hasSlots = Array.isArray(this.holdSlots) && this.holdSlots.length > 0;
    const primary = hasSlots ? this.holdSlots[0] : null;
    let helperType = null;
    if (this.holdCapacity && this.holdCapacity > 1 && this.holdSlots && this.holdSlots.length > 1) {
      const timed = this.holdSlots[1];
      if (timed && timed.type) helperType = timed.type;
    }
    this.renderer.drawHold(primary, helperType);
  }

  useClearRow() {
    if (!this.board || !this.tempUpgrades || this.tempUpgrades.clearRowCharges <= 0) return;
    const rows = [];
    for (let r = 0; r < this.board.h; r++) {
      if (this.board.grid[r].some(v => v)) rows.push(r);
    }
    if (!rows.length) return;
    const idx = rows[Math.floor(Math.random() * rows.length)];
    for (let c = 0; c < this.board.w; c++) {
      this.board.grid[idx][c] = 0;
    }
    this.tempUpgrades.clearRowCharges--;
    this.updateConsumableButtons();
    this.updateUpgradeIndicators();
    this.spawnParticles([idx]);
    this.renderer.drawBoard();
    this.showTemporaryMessage("Row cleared");
  }

  useClearColumn() {
    if (!this.board || !this.tempUpgrades || this.tempUpgrades.clearColumnCharges <= 0) return;
    const cols = [];
    for (let c = 0; c < this.board.w; c++) {
      for (let r = 0; r < this.board.h; r++) {
        if (this.board.grid[r][c]) {
          cols.push(c);
          break;
        }
      }
    }
    if (!cols.length) return;
    const idx = cols[Math.floor(Math.random() * cols.length)];
    for (let r = 0; r < this.board.h; r++) {
      this.board.grid[r][idx] = 0;
    }
    this.tempUpgrades.clearColumnCharges--;
    this.updateConsumableButtons();
    this.updateUpgradeIndicators();
    this.renderer.drawBoard();
    this.showTemporaryMessage("Column cleared");
  }

  useClearArea() {
    if (!this.board || !this.tempUpgrades || this.tempUpgrades.clearAreaCharges <= 0) return;
    const occupied = [];
    for (let r = 0; r < this.board.h; r++) {
      for (let c = 0; c < this.board.w; c++) {
        if (this.board.grid[r][c]) occupied.push({ r, c });
      }
    }
    if (!occupied.length) return;
    const center = occupied[Math.floor(Math.random() * occupied.length)];
    const rows = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = center.r + dr;
        const c = center.c + dc;
        if (r >= 0 && r < this.board.h && c >= 0 && c < this.board.w) {
          this.board.grid[r][c] = 0;
          rows.add(r);
        }
      }
    }
    this.tempUpgrades.clearAreaCharges--;
    this.updateConsumableButtons();
    this.updateUpgradeIndicators();
    this.spawnParticles(Array.from(rows));
    this.renderer.drawBoard();
    this.showTemporaryMessage("Area cleared");
  }

  showTemporaryMessage(message, duration = 2000) {
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.className = 'temporary-message';
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, duration);
  }
  spawnParticles(rows) {
    const width = particlesCanvas.width;
    const height = particlesCanvas.height;
    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"), 10) + parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"), 10);
    const rowY = (r) => 14 + r * (cellSize);
    const particles = [];
    for (const r of rows) {
      for (let c = 0; c < W; c++) {
        const x = 14 + c * (cellSize);
        const y = rowY(r);
        for (let k = 0; k < 6; k++) {
          particles.push({
            x: x + Math.random() * cellSize,
            y: y + Math.random() * cellSize,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -Math.random() * 1.6 - 0.4,
            life: 700 + Math.random() * 400,
            color: "#6ce6ff",
          });
        }
      }
    }
    const start = performance.now();
    const draw = (now) => {
      const k = now - start;
      particlesCtx.clearRect(0,0,width,height);
      for (const p of particles) {
        const t = Math.min(1, k / p.life);
        const alpha = 1 - t;
        p.x += p.vx * 2;
        p.y += p.vy * 2 + 0.04 * k / 16;
        particlesCtx.fillStyle = "rgba(108,230,255," + alpha + ")";
        particlesCtx.beginPath();
        particlesCtx.arc(p.x, p.y, 2 + (1 - alpha) * 2, 0, Math.PI*2);
        particlesCtx.fill();
      }
      if (k < 1200) requestAnimationFrame(draw);
      else particlesCtx.clearRect(0,0,width,height);
    };
    requestAnimationFrame(draw);
  }
  triggerUpgradeEffect() {
    const width = particlesCanvas.width;
    const height = particlesCanvas.height;
    const start = performance.now();
    const draw = (now) => {
      const k = now - start;
      particlesCtx.clearRect(0,0,width,height);
      const count = 80;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height * 0.3;
        const t = (k + i * 12) % 800;
        const alpha = 1 - t / 800;
        particlesCtx.fillStyle = "rgba(255,216,0," + alpha + ")";
        particlesCtx.beginPath();
        particlesCtx.arc(x, y - t * 0.08, 2 + (1 - alpha) * 2, 0, Math.PI*2);
        particlesCtx.fill();
      }
      if (k < 900) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
}

const game = new Game();
runGravitySelfTest();

const resetPoolBtn = document.getElementById("reset-pool-btn");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmResetBtn = document.getElementById("confirm-reset-btn");
const cancelResetBtn = document.getElementById("cancel-reset-btn");

if (resetPoolBtn && confirmOverlay) {
  resetPoolBtn.addEventListener("click", () => {
    confirmOverlay.classList.add("visible");
    confirmOverlay.setAttribute("aria-hidden", "false");
    game.isPaused = true;
  });

  if (confirmResetBtn) {
    confirmResetBtn.addEventListener("click", () => {
      game.resetPermanentPool();
      confirmOverlay.classList.remove("visible");
      confirmOverlay.setAttribute("aria-hidden", "true");
      game.isPaused = false;
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", () => {
      confirmOverlay.classList.remove("visible");
      confirmOverlay.setAttribute("aria-hidden", "true");
      game.isPaused = false;
    });
  }
}

if (document.readyState !== "loading") {
  if (pauseBtn) pauseBtn.disabled = true;
} else {
  document.addEventListener("DOMContentLoaded", () => { if (pauseBtn) pauseBtn.disabled = true; });
}
