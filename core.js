"use strict";

const CORE = {
  BASE_W: 10,
  H: 20,
  LOCK_DELAY_MS: 500,
  BASE_GRAVITY_MS: 1000,
  SPEEDUP_BASE_INCREMENT: 1,
  SPEEDUP_RANDOM_RANGE: 0.25,
  SPEEDUP_MIN_MS: 120,

  computeGravity: (level, speedUpLevels) => {
    const base = CORE.BASE_GRAVITY_MS;
    const lv = Math.max(1, level | 0);
    const su = Math.max(0, speedUpLevels || 0);
    const levelFactor = Math.pow(0.9, lv - 1);
    const upgradeBase = 0.85;
    const upgradeFactor = Math.pow(upgradeBase, su);
    const ms = base * levelFactor * upgradeFactor;
    const clamped = Math.max(CORE.SPEEDUP_MIN_MS, Math.floor(ms));
    return clamped;
  },

  SRS_JLSTZ_RIGHT: {
    "0>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    "1>2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    "2>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    "3>0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  },
  SRS_JLSTZ_LEFT: {
    "0>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    "3>2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    "2>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    "1>0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  },
  SRS_I_RIGHT: {
    "0>1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    "1>2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    "2>3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    "3>0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  },
  SRS_I_LEFT: {
    "0>3": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    "3>2": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    "2>1": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    "1>0": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  },

  UPGRADE_DEFS: [
    { id: 'speed_up', name: 'Speed Up', type: 'temp', weight: 3, icon: '⚡', desc: 'Increase core speed up rate each level' },
    { id: 'extra_reroll', name: 'Extra Re-roll', type: 'temp', weight: 2, icon: '🎲', desc: '+1 reroll next choice' },
    { id: 'second_chance', name: 'Second Chance', type: 'temp', weight: 1, icon: '❤️', desc: 'Survive game over once' },
    { id: 'score_mult', name: 'Score Multiplier', type: 'temp', weight: 2, icon: '✖', desc: 'Double score for a few clears' },
    { id: 'clear_row', name: 'Clear Row', type: 'temp', weight: 1, icon: '➖', desc: 'Gain a consumable that clears a random row' },
    { id: 'clear_column', name: 'Clear Column', type: 'temp', weight: 1, icon: '➕', desc: 'Gain a consumable that clears a random column' },
    { id: 'clear_area', name: 'Clear Area', type: 'temp', weight: 1, icon: '⛰', desc: 'Gain a consumable that clears a 3x3 area' },
    { id: 'expanded_preview', name: '+1 Next', type: 'perm', weight: 2, icon: '🔭', desc: 'Show +1 next piece (stackable)' },
    { id: 'expand_board', name: '+1 Board', type: 'perm', weight: 1, icon: '⬌', desc: 'Add one column to the board (max +5)' },
    { id: 'piece_removal', name: 'Remove Piece', type: 'perm', weight: 2, icon: '🗑️', desc: 'Remove a piece type' },
    { id: 'obstacle_mode', name: 'Obstacle Focus', type: 'perm', weight: 1, icon: '🧱', desc: 'Stronger obstacles that give more points' },
    { id: 'gravity_cost_down', name: 'Gravity Opt', type: 'perm', weight: 2, icon: '📉', desc: 'Reduces Gravity power-up cost by 1' },
  ],

  pickWeighted: (items, count) => {
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
  },

  bagRandom: (source, piecesDef) => {
    const pool = [...(source || Object.keys(piecesDef))];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }
};

CORE.Board = class {
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
        const hadOb = this.grid[r].some(v => this.isObstacleCell(v));
        cleared.push(r);
        clearedHadObstacles.push(hadOb);
        for (let c = 0; c < this.w; c++) {
          this.grid[r][c] = 0;
        }
      }
    }
    this.lastClearedHadObstacles = clearedHadObstacles;
    return cleared;
  }
  applyGravity() {
    for (let c = 0; c < this.w; c++) {
      let writePtr = this.h - 1;
      for (let readPtr = this.h - 1; readPtr >= 0; readPtr--) {
        const val = this.grid[readPtr][c];
        if (this.isObstacleCell(val)) {
          writePtr = readPtr - 1; 
          continue;
        }
        if (val !== 0) {
          if (writePtr > readPtr) {
            this.grid[writePtr][c] = val;
            this.grid[readPtr][c] = 0;
          }
          writePtr--;
        }
      }
    }
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

  clearRandomRow() {
    const filledRows = [];
    for (let r = 0; r < this.h; r++) {
      if (this.grid[r].some(v => v !== 0)) filledRows.push(r);
    }
    if (filledRows.length === 0) return;
    const r = filledRows[Math.floor(Math.random() * filledRows.length)];
    this.grid.splice(r, 1);
    this.grid.unshift(Array(this.w).fill(0));
  }

  clearRandomColumn() {
    const c = Math.floor(Math.random() * this.w);
    for (let r = 0; r < this.h; r++) {
      this.grid[r][c] = 0;
    }
  }

  clearRandomArea() {
    const r = Math.floor(Math.random() * (this.h - 3));
    const c = Math.floor(Math.random() * (this.w - 3));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.grid[r + i][c + j] = 0;
      }
    }
  }

  checkCollision(piece, dx = 0, dy = 0, rot = piece.rotation) {
    for (const [bx, by] of piece.blocks(rot)) {
      const r = piece.y + by + dy;
      const c = piece.x + bx + dx;
      if (c < 0 || c >= this.w || r >= this.h) return true;
      if (r >= 0 && this.grid[r][c]) return true;
    }
    return false;
  }
};

CORE.Piece = class {
  constructor(type, piecesDef) {
    this.type = type;
    this.piecesDef = piecesDef;
    this.rot = 0;
    this.x = 3;
    this.y = -2;
    const def = piecesDef[this.type];
    this.cx = def.center ? def.center[0] : Math.floor(def.shape[0].length / 2);
    this.cy = def.center ? def.center[1] : Math.floor(def.shape.length / 2);
  }
  shape() { return this.piecesDef[this.type].shape; }
  blocks(rot = this.rot, x = this.x, y = this.y) {
    let shape = this.shape();
    for (let i = 0; i < rot; i++) {
      shape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
    }
    return shape.map((row, r) => row.map((val, c) => val ? [c, r] : null)).flat().filter(Boolean);
  }
};

CORE.Renderer = class {
  constructor(board, boardEl, piecesDef) {
    this.board = board;
    this.boardEl = boardEl;
    this.piecesDef = piecesDef;
    this.cells = Array.from(boardEl.children);
    this.prevActiveIdx = [];
    this.prevGhostIdx = [];
  }
  idx(r, c) { return r * this.board.w + c; }
  validGhost(piece, dx, dy, rot = piece.rot, x = piece.x, y = piece.y) {
    for (const [bx,by] of piece.blocks(rot, x, y)) {
      const r = y + by + dy;
      const c = x + bx + dx;
      if (c < 0 || c >= this.board.w || r >= CORE.H) return false;
      if (r >= 0 && this.board.get(r, c)) return false;
    }
    return true;
  }
  drawBoard() {
    for (let r = 0; r < CORE.H; r++) {
      for (let c = 0; c < this.board.w; c++) {
        const v = this.board.grid[r][c];
        const el = this.cells[this.idx(r,c)];
        if (!el) continue;
        el.className = 'cell';
        el.style.opacity = '';
        if (v) {
          if (v === 'OB2' || v === 'OB1') {
            el.classList.add('obstacle-cell');
            el.style.backgroundColor = v === 'OB2' ? '#6b7280' : '#9ca3af';
          } else {
            el.style.backgroundColor = this.piecesDef[v].color;
          }
        } else {
          el.style.backgroundColor = '';
        }
      }
    }
  }
  drawGhost(piece) {
    for (const i of this.prevGhostIdx) {
      if (this.cells[i]) {
        this.cells[i].style.opacity = '';
        this.cells[i].classList.remove("ghost");
      }
    }
    this.prevGhostIdx.length = 0;
    if (!piece) return;
    let gy = piece.y;
    while (this.validGhost(piece, 0, 1, piece.rot, piece.x, gy)) {
      gy++;
    }
    const color = this.piecesDef[piece.type].color;
    for (const [dx,dy] of piece.blocks(piece.rot, piece.x, gy)) {
      const r = gy + dy, c = piece.x + dx;
      if (r >= 0 && r < CORE.H && c >= 0 && c < this.board.w) {
        if (!this.board.grid[r][c]) {
          const i = this.idx(r,c);
          if (this.cells[i]) {
            this.cells[i].style.backgroundColor = color;
            this.cells[i].style.opacity = '0.28';
            this.cells[i].classList.add("ghost");
            this.prevGhostIdx.push(i);
          }
        }
      }
    }
  }
  drawActive(piece) {
    for (const i of this.prevActiveIdx) {
      if (this.cells[i]) this.cells[i].classList.remove("active");
    }
    this.prevActiveIdx.length = 0;
    const color = this.piecesDef[piece.type].color;
    for (const [dx,dy] of piece.blocks()) {
      const r = piece.y + dy, c = piece.x + dx;
      if (r >= 0 && r < CORE.H && c >= 0 && c < this.board.w) {
        const i = this.idx(r,c);
        if (this.cells[i]) {
          this.cells[i].classList.add("active");
          this.cells[i].style.backgroundColor = color;
          this.prevActiveIdx.push(i);
        }
      }
    }
  }
  clearAllTemporaryElements() {
    for (const i of this.prevGhostIdx) {
      if (this.cells[i]) {
        this.cells[i].style.opacity = '';
        this.cells[i].classList.remove("ghost");
      }
    }
    this.prevGhostIdx.length = 0;
    for (const i of this.prevActiveIdx) {
      if (this.cells[i]) this.cells[i].classList.remove("active");
    }
    this.prevActiveIdx.length = 0;
    for (let r = 0; r < CORE.H; r++) {
      for (let c = 0; c < this.board.w; c++) {
        const i = this.idx(r, c);
        const el = this.cells[i];
        if (el && !el.classList.contains('cell')) {
          el.className = 'cell';
        }
      }
    }
  }
  drawPreview(type, previewEl) {
    if (!previewEl) return;
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
    const piece = new CORE.Piece(type, this.piecesDef);
    const shape = piece.shape();
    const color = this.piecesDef[type].color;
    const w = shape[0].length;
    const h = shape.length;
    const startX = Math.floor((6 - w) / 2);
    const startY = Math.floor((6 - h) / 2);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const idx = (startY + r) * 6 + (startX + c);
          if (cells[idx]) cells[idx].style.backgroundColor = color;
        }
      }
    }
    previewEl.style.opacity = "0";
    previewEl.getBoundingClientRect();
    previewEl.style.transition = "opacity 200ms ease";
    previewEl.style.opacity = "1";
  }
};

window.CORE = CORE;
