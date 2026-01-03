"use strict";

const W = 10;
const H = 20;
const LOCK_DELAY_MS = 500;
const BASE_GRAVITY_MS = 1000;
const SOFT_DROP_MS = 40;

const byId = (id) => document.getElementById(id);
const boardEl = byId("board");
const previewEl = byId("preview");
const holdEl = byId("hold");
const scoreEl = byId("score");
const linesEl = byId("lines");
const levelEl = byId("level");
const achievementsEl = byId("achievements");
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
const recalcScale = () => {
  autoScale = computeAutoScale();
  applyScale(autoScale);
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
makeCells(holdEl, 6, 6, "preview-cell");
particlesCanvas.width = boardEl.clientWidth;
particlesCanvas.height = boardEl.clientHeight;
particlesCtx = particlesCanvas.getContext("2d");
const holdWrap = byId("hold-wrap");
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
    for (let r = this.h - 1; r >= 0; r--) {
      if (this.grid[r].every(v => v)) {
        cleared.push(r);
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.w).fill(0));
        r++;
      }
    }
    return cleared;
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
  }
  idx(r, c) { return r * W + c; }
  drawBoard() {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const v = this.board.grid[r][c];
        const el = this.cells[this.idx(r,c)];
        el.className = 'cell';
        if (v) {
          el.style.backgroundColor = PIECES[v].color;
        } else {
          el.style.backgroundColor = '';
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
  drawHold(piece) {
    const cells = Array.from(holdEl.children);
    for (const c of cells) { c.style.backgroundColor = ''; }
    if (!piece) {
      holdEl.style.opacity = "0";
      holdEl.getBoundingClientRect();
      holdEl.style.transition = "opacity 200ms ease";
      holdEl.style.opacity = "1";
      return;
    }
    const type = piece.type;
    const shape = PIECES[type].shape;
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
    holdEl.style.opacity = "0";
    holdEl.getBoundingClientRect();
    holdEl.style.transition = "opacity 200ms ease";
    holdEl.style.opacity = "1";
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
    this.holdPiece = null;
    this.holdAvailable = true;
    this.holdReturnPending = false;
    this.holdReturnTimer = null;
    this.keyBindings = {
      moveLeft: ["ArrowLeft"],
      moveRight: ["ArrowRight"],
      rotateCW: ["ArrowUp"],
      rotateCCW: ["ShiftLeft","ShiftRight"],
      softDrop: ["ArrowDown"],
      hardDrop: ["Space"],
      holdStore: [holdKeySelect ? holdKeySelect.value : "KeyQ"],
      holdRelease: [releaseKeySelect ? releaseKeySelect.value : "KeyE"],
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

    this.loop = this.loop.bind(this);
    this.bindInput();
    this.initDisplay();
    this.updatePoolDisplay();
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
    this.renderer.drawHold(null);
    scoreEl.textContent = "0";
    linesEl.textContent = "0";
    levelEl.textContent = "1";
    achievementsEl.textContent = "";
    if (pauseBtn) pauseBtn.disabled = true;
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
    this.renderer.drawBoard();
    if (this.active) this.renderer.drawActive(this.active);
    requestAnimationFrame(this.loop);
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
    this.updatePoolDisplay();

    this.spawn();
    tweenNumber(scoreEl, this.score);
    tweenNumber(linesEl, this.lines);
    tweenNumber(levelEl, this.level);
    achievementsEl.textContent = "";
    this.holdPiece = null;
    this.holdAvailable = true;
    this.holdReturnPending = false;
    if (this.holdReturnTimer) {
      clearTimeout(this.holdReturnTimer);
      this.holdReturnTimer = null;
    }
    if (holdWrap) holdWrap.classList.remove("cooldown", "active");
    this.renderer.drawHold(null);
    if (overlayEl) {
      overlayEl.classList.remove("visible");
      overlayEl.setAttribute("aria-hidden", "true");
    }
  }
  ticksForLevel() {
    const base = BASE_GRAVITY_MS;
    const accel = Math.max(80, base - (this.level - 1) * 60);
    return accel;
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
  holdStore() {
    if (this.state !== "playing") return;
    if (!this.active) return;
    if (!this.holdAvailable) return;
    const fromHold = this.holdPiece;
    this.holdPiece = this.active;
    this.active = fromHold ? new Piece(fromHold.type) : new Piece(this.pullNext());
    this.holdAvailable = false;
    this.renderer.drawHold(this.holdPiece);
    this.renderer.drawPreview(this.queue[0] || null);
    playTone(220, 120, 0.06);
    if (holdWrap) holdWrap.classList.add("cooldown");
  }
  holdRelease() {
    if (this.state !== "playing") return;
    if (!this.holdPiece) return;
    if (!this.active) return;
    if (this.holdReturnPending) return;
    const fromHold = this.holdPiece;
    const replaced = this.active;
    this.active = fromHold;
    this.active.x = 3;
    this.active.y = -2;
    if (!this.valid(this.active, 0, 0, this.active.rot)) {
      this.active = replaced;
      return;
    }
    this.holdPiece = replaced;
    this.renderer.drawHold(this.holdPiece);
    this.holdReturnPending = true;
    if (holdWrap) holdWrap.classList.add("active");
    setTimeout(() => {
      this.holdReturnPending = false;
      if (holdWrap) holdWrap.classList.remove("active");
    }, 500);
    playTone(440, 140, 0.06);
  }
  returnFromHold() {
    if (this.state !== "playing") return;
    if (!this.holdPiece) return;
    if (this.active) return;
    const fromHold = this.holdPiece;
    const candidate = new Piece(fromHold.type);
    candidate.x = 3;
    candidate.y = -2;
    if (!this.valid(candidate, 0, 0, candidate.rot)) {
      return;
    }
    this.active = candidate;
    this.holdPiece = null;
    this.renderer.drawHold(null);
    if (holdWrap) {
      holdWrap.classList.add("active");
      setTimeout(() => { holdWrap.classList.remove("active"); }, 500);
    }
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
      else if (match("holdStore")) { e.preventDefault(); this.holdStore(); }
      else if (match("holdRelease")) { e.preventDefault(); this.holdRelease(); }
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
      } else if (this.state === "paused") {
        this.state = "playing";
        this.isPaused = false;
        pauseBtn.setAttribute("aria-pressed","false");
        pauseBtn.textContent = "Pause";
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
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
    if (holdKeySelect) {
      holdKeySelect.addEventListener("change", () => {
        this.keyBindings.holdStore = [holdKeySelect.value];
      });
    }
    if (releaseKeySelect) {
      releaseKeySelect.addEventListener("change", () => {
        this.keyBindings.holdRelease = [releaseKeySelect.value];
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
      else if (z === "hold") {
        const now = performance.now();
        const holdChecker = () => {
          if (!swipeStart) return;
          if (performance.now() - swipeStart.t >= 400) { this.hold(); swipeStart = null; }
        };
        setTimeout(holdChecker, 420);
      }
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

    const options = this.generateUnlockOptions(3);
    if (options.length === 0) return;

    this.state = "unlocking";
    this.isPaused = true;
    this.showUnlockModal(options);
  }

  showUnlockModal(options, isPermanent = false) {
    const modal = document.getElementById('unlock-overlay');
    const container = document.getElementById('unlock-options');
    if (!modal || !container) return;

    const oldBtn = modal.querySelector('.reroll-btn');
    if (oldBtn) oldBtn.remove();

    container.innerHTML = '';
    const title = document.querySelector('#unlock-overlay .overlay-title');
    const sub = document.querySelector('#unlock-overlay .unlock-subtitle');

    if (isPermanent) {
      title.textContent = "Run Complete!";
      sub.textContent = "Choose one piece to KEEP permanently:";
    } else {
      title.textContent = "Unlock New Piece";
      sub.textContent = "Choose one to add to your current run:";
    }

    options.forEach(type => {
      const card = document.createElement('div');
      card.className = 'unlock-card';
      card.onclick = () => isPermanent ? this.handlePermanentSelection(type) : this.handleUnlockSelection(type);

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

    if (!isPermanent && !this.rerollUsed) {
      const btn = document.createElement('button');
      btn.className = 'reroll-btn';
      btn.textContent = 'Re-roll';
      btn.onclick = () => this.handleReroll();
      container.parentElement.appendChild(btn);
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  handleReroll() {
    this.rerollUsed = true;
    this.unlock(true);
  }

  resetPermanentPool() {
    this.permanentPool = [...STANDARD_PIECES];
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
    this.active = null;
    if (this.holdReturnTimer) {
      clearTimeout(this.holdReturnTimer);
      this.holdReturnTimer = null;
    }
    this.holdReturnPending = false;
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseBtn.textContent = "Pause";
    }
    this.renderer.drawBoard();
  }

  closeUnlockModal() {
    const modal = document.getElementById('unlock-overlay');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  lockPiece() {
    this.board.mergePiece(this.active);
    const cleared = this.board.clearLines();
    if (cleared.length) {
      this.spawnParticles(cleared);
      if (cleared.length > 1) this.showCombo(cleared.length);
      const scores = {1:100,2:300,3:500,4:800};
      const add = (scores[cleared.length] || 0) * this.level;
      this.score += add;
      this.combo++;
      if (this.combo > 0) {
        const comboBonus = 50 * this.combo * this.level;
        this.score += comboBonus;
        achievementsEl.textContent = `Combo x${this.combo}`;
      }
      this.lines += cleared.length;
      this.linesSinceUnlock += cleared.length;
      const newLevel = 1 + Math.floor(this.lines / 10);
      if (newLevel > this.level) {
        this.level = newLevel;
        tweenNumber(levelEl, this.level);
        achievementsEl.textContent = "Level Up!";
      }
      tweenNumber(scoreEl, this.score);
      tweenNumber(linesEl, this.lines);
      playTone(550, 50, 0.08);
      playTone(660, 50, 0.08);
      if (this.linesSinceUnlock >= this.unlockThreshold) {
        this.unlock();
      }
    } else {
      this.combo = -1;
      achievementsEl.textContent = "";
    }
    if (this.board.grid[0].some(v => v)) {
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
    this.active = null;
    if (!this.holdReturnPending) {
      this.spawn();
    }
    this.holdAvailable = true;
    if (holdWrap) holdWrap.classList.remove("cooldown","active");
    this.renderer.drawBoard();
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
        this.lockTimer = 0;
        this.lockPiece();
        return;
      }
    }
    while (this.dropTimer >= speed) {
      this.dropTimer -= speed;
      if (!this.move(0,1)) {
        break;
      }
    }
    this.renderer.drawBoard();
    this.renderer.drawActive(this.active);
  }
  loop(t) {
    if (this.state !== "playing") return;
    if (this.isPaused) return;
    const dt = t - this.lastTime;
    this.lastTime = t;
    this.update(dt);
    requestAnimationFrame(this.loop);
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
}

const game = new Game();

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
const params = new URLSearchParams(location.search);
if (params.get("test") === "1") {
  const run = () => {
    const g = new Game();
    g.start();
    g.holdStore();
    const a = !!g.holdPiece && g.holdAvailable === false;
    const storedFromStore = g.holdPiece;
    const activeAfterStore = g.active;
    g.holdRelease();
    const b = g.holdPiece === activeAfterStore && g.active === storedFromStore && g.holdReturnPending === true && g.holdAvailable === false;
    g.active = null;
    for (let r = 0; r <= 1; r++) { for (let ccol = 3; ccol <= 5; ccol++) { g.board.set(r, ccol, "x"); } }
    g.returnFromHold();
    const c1 = !g.active && !!g.holdPiece;
    for (let r = 0; r <= 1; r++) { for (let ccol = 3; ccol <= 5; ccol++) { g.board.set(r, ccol, 0); } }
    g.returnFromHold();
    const c2 = !!g.active && g.holdPiece === null;
    g.hardDrop();
    const d = g.holdAvailable === true;
    achievementsEl.textContent = (a && b && c1 && c2 && d) ? "Tests Passed" : "Tests Failed";
  };
  if (document.readyState !== "loading") run(); else document.addEventListener("DOMContentLoaded", run);
}
