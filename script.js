"use strict";

const W = 10;
const H = 20;
const LOCK_DELAY_MS = 500;
const BASE_GRAVITY_MS = 1000;
const SOFT_DROP_MS = 40;
const COLORS = { i: "i", o: "o", t: "t", s: "s", z: "z", j: "j", l: "l" };

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
const particlesCanvas = byId("particles");
let particlesCtx;
const scaleRoot = byId("scale-root");
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
  container.innerHTML = "";
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
makeCells(previewEl, 4, 4, "preview-cell");
makeCells(holdEl, 4, 4, "preview-cell");
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

const orientations = {
  i: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  o: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  t: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  j: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[0,2]],
  ],
  l: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
  s: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
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

const bagRandom = () => {
  const pool = ["i","o","t","s","z","j","l"];
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
      }
    }
    for (const r of cleared) {
      this.grid.splice(r, 1);
      this.grid.unshift(Array(this.w).fill(0));
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
  }
  shape() { return orientations[this.type][this.rot]; }
  blocks(rot = this.rot, x = this.x, y = this.y) {
    return orientations[this.type][rot].map(([dx,dy]) => [dx,dy]);
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
        el.className = "cell" + (v ? " " + COLORS[v] : "");
      }
    }
  }
  drawActive(piece) {
    for (const i of this.prevActiveIdx) {
      this.cells[i].classList.remove("active");
    }
    this.prevActiveIdx.length = 0;
    for (const [dx,dy] of piece.shape()) {
      const r = piece.y + dy, c = piece.x + dx;
      if (r >= 0 && r < H && c >= 0 && c < W) {
        const i = this.idx(r,c);
        this.cells[i].classList.add("active", COLORS[piece.type]);
        this.prevActiveIdx.push(i);
      }
    }
  }
  drawPreview(type) {
    const cells = Array.from(previewEl.children);
    for (const c of cells) c.className = "preview-cell";
    if (!type) return;
    const shape = orientations[type][0];
    for (const [dx,dy] of shape) {
      const r = dy, c = dx;
      const i = r * 4 + c;
      cells[i].className = "preview-cell " + COLORS[type];
    }
    previewEl.style.opacity = "0";
    previewEl.getBoundingClientRect();
    previewEl.style.transition = "opacity 200ms ease";
    previewEl.style.opacity = "1";
    if (previewWrap) { previewWrap.classList.add("active"); setTimeout(()=>previewWrap.classList.remove("active"), 220); }
  }
  drawHold(piece) {
    const cells = Array.from(holdEl.children);
    for (const c of cells) c.className = "preview-cell";
    if (!piece) {
      holdEl.style.opacity = "0";
      holdEl.getBoundingClientRect();
      holdEl.style.transition = "opacity 200ms ease";
      holdEl.style.opacity = "1";
      return;
    }
    const type = piece.type;
    const rot = piece.rot || 0;
    const shape = orientations[type][rot];
    for (const [dx,dy] of shape) {
      const r = dy, c = dx;
      const i = r * 4 + c;
      cells[i].className = "preview-cell " + COLORS[type];
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
    this.bufferPiece = null;
    this.pendingAutoDrop = false;
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
    this.loop = this.loop.bind(this);
    this.bindInput();
    this.initDisplay();
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
  pullNext() {
    if (this.queue.length === 0) this.queue = bagRandom();
    return this.queue.shift();
  }
  spawn() {
    const type = this.pullNext();
    this.active = new Piece(type);
    if (!this.valid(this.active, 0, 0, this.active.rot)) {
      this.state = "gameover";
      achievementsEl.textContent = "Game Over";
      if (pauseBtn) { pauseBtn.setAttribute("aria-pressed","false"); pauseBtn.textContent = "Pause"; }
      return;
    }
    if (this.queue.length === 0) this.queue = bagRandom();
    this.renderer.drawPreview(this.queue[0]);
  }
  reset() {
    this.board = new Board(W,H);
    this.renderer = new Renderer(this.board);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.queue.length = 0;
    this.spawn();
    tweenNumber(scoreEl, this.score);
    tweenNumber(linesEl, this.lines);
    tweenNumber(levelEl, this.level);
    achievementsEl.textContent = "";
    this.holdPiece = null;
    this.holdAvailable = true;
    this.bufferPiece = null;
    this.pendingAutoDrop = false;
    if (holdWrap) holdWrap.classList.remove("cooldown","active");
    this.renderer.drawHold(null);
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
    for (const [kx, ky] of kicks) {
      if (this.valid(this.active, kx, ky, to)) {
        this.active.x += kx;
        this.active.y += ky;
        this.active.rot = to;
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
  holdStore() {
    if (this.state !== "playing") return;
    if (!this.active) return;
    if (!this.holdAvailable) return;
    this.holdPiece = this.active;
    this.active = new Piece(this.pullNext());
    this.holdAvailable = false;
    if (holdWrap) { holdWrap.classList.add("cooldown","active"); setTimeout(()=>{ holdWrap.classList.remove("active"); }, 220); }
    this.renderer.drawHold(this.holdPiece);
    this.renderer.drawPreview(this.queue[0]);
    playTone(220, 120, 0.06);
  }
  holdRelease() {
    if (this.state !== "playing") return;
    if (!this.holdPiece) return;
    if (!this.active) return;
    if (!this.holdAvailable) return;
    this.bufferPiece = this.active;
    this.active = this.holdPiece;
    this.active.x = 3; this.active.y = -2;
    this.holdPiece = null;
    this.renderer.drawHold(null);
    this.pendingAutoDrop = true;
    this.holdAvailable = false;
    if (holdWrap) { holdWrap.classList.add("cooldown","active"); setTimeout(()=>{ holdWrap.classList.remove("active"); }, 220); }
    playTone(440, 140, 0.06);
    achievementsEl.textContent = "Hold Release";
  }
  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (this.state !== "playing") return;
      if (this.isPaused) return;
      if (e.code === "ArrowLeft") { e.preventDefault(); this.move(-1,0); }
      else if (e.code === "ArrowRight") { e.preventDefault(); this.move(1,0); }
      else if (e.code === "ArrowUp") { e.preventDefault(); this.rotate(1); }
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); this.rotate(-1); }
      else if (e.code === "ArrowDown") { e.preventDefault(); this.softDropping = true; }
      else if (e.code === "Space") { e.preventDefault(); this.hardDrop(); }
      else if (e.code === "KeyQ") { e.preventDefault(); this.holdStore(); }
      else if (e.code === "KeyE") { e.preventDefault(); this.holdRelease(); }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowDown") this.softDropping = false;
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
  lockPiece() {
    this.board.mergePiece(this.active);
    const cleared = this.board.clearLines();
    if (cleared.length) {
      this.spawnParticles(cleared);
      const scores = {1:100,2:300,3:500,4:800};
      const add = scores[cleared.length] || 0;
      this.score += add * Math.max(1, this.combo + 1);
      this.combo = this.combo >= 0 ? this.combo + 1 : 0;
      this.lines += cleared.length;
      const prevLevel = this.level;
      this.level = 1 + Math.floor(this.lines / 10);
      tweenNumber(scoreEl, this.score);
      tweenNumber(linesEl, this.lines);
      if (this.level !== prevLevel) {
        tweenNumber(levelEl, this.level);
        achievementsEl.textContent = "Level " + this.level;
      } else if (cleared.length === 4) {
        achievementsEl.textContent = "Tetris!";
      } else achievementsEl.textContent = "";
    } else {
      this.combo = -1;
    }
    if (this.board.grid[0].some(v => v)) {
      this.state = "gameover";
      this.isPaused = true;
      const summary = `Game Over — Score ${this.score} • Lines ${this.lines} • Level ${this.level}`;
      achievementsEl.textContent = summary;
      this.active = null;
      if (pauseBtn) { pauseBtn.setAttribute("aria-pressed","false"); pauseBtn.textContent = "Pause"; }
      this.renderer.drawBoard();
      return;
    }
    this.active = null;
    if (this.bufferPiece) {
      this.active = this.bufferPiece;
      this.bufferPiece = null;
      this.pendingAutoDrop = true;
    } else {
      this.spawn();
    }
    this.holdAvailable = true;
    if (holdWrap) holdWrap.classList.remove("cooldown");
    this.renderer.drawBoard();
  }
  update(dt) {
    if (this.state !== "playing") return;
    if (this.isPaused) return;
    if (this.pendingAutoDrop) {
      this.pendingAutoDrop = false;
      this.hardDrop();
      return;
    }
    const speed = this.softDropping ? SOFT_DROP_MS : this.ticksForLevel();
    this.dropTimer += dt;
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
    g.holdRelease();
    const b = g.pendingAutoDrop === true && g.bufferPiece !== null && g.active && g.active.rot === g.active.rot;
    g.update(1000);
    const c = g.bufferPiece === null && g.pendingAutoDrop === false;
    const d = g.holdAvailable === true;
    g.holdStore();
    const e = g.holdAvailable === false;
    g.hardDrop();
    const f = g.holdAvailable === true;
    achievementsEl.textContent = (a && b && c && d && e && f) ? "Tests Passed" : "Tests Failed";
  };
  if (document.readyState !== "loading") run(); else document.addEventListener("DOMContentLoaded", run);
}
