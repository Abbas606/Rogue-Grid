"use strict";

const byId = (id) => document.getElementById(id);

const boardEl = byId("board");
const previewEl = byId("preview");
const holdEl = byId("hold");
const scoreEl = byId("score");
const linesEl = byId("lines");
const levelEl = byId("level");
const startPauseBtn = byId("start-pause-btn");
const topRestartBtn = byId("top-restart-btn");
const overlayEl = byId("overlay");
const restartBtn = byId("restart-btn");

const Board = CORE.Board;
const Piece = class extends CORE.Piece {
  constructor(type) {
    super(type, PIECES);
  }
};

const Renderer = class extends CORE.Renderer {
  constructor(board) {
    super(board, boardEl, PIECES);
  }
  drawPreview(type) {
    super.drawPreview(type, previewEl);
  }
  drawHold(type) {
    super.drawPreview(type, holdEl);
  }
};

class Game {
  constructor() {
    this.board = new Board(CORE.BASE_W, CORE.H);
    this.renderer = new Renderer(this.board);
    this.queue = [];
    this.active = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.state = "ready";
    this.isPaused = false;
    this.dropTimer = 0;
    this.lastTime = performance.now();
    
    this.permanentPool = this.loadPool();
    this.currentPool = [...this.permanentPool];
    
    this.holdPiece = null;
    this.holdUsed = false;

    this.tempUpgrades = {
        clearRowCharges: 0,
        clearColumnCharges: 0,
        clearAreaCharges: 0,
        speedUpLevels: 0
    };
    this.gravityCharges = 0;

    this.bindControls();
    this.initBoard();
    this.reset();
    
    this.loop = this.loop.bind(this);
  }

  loadPool() {
    try {
      const saved = localStorage.getItem('rogueTris_pool');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
      }
    } catch(e) {}
    const all = Object.keys(PIECES);
    const initial = CORE.bagRandom(all, PIECES).slice(0, 10);
    localStorage.setItem('rogueTris_pool', JSON.stringify(initial));
    return initial;
  }

  initBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < CORE.H * CORE.BASE_W; i++) {
      const d = document.createElement("div");
      d.className = "cell";
      boardEl.appendChild(d);
    }
    
    // Create preview and hold cells
    [previewEl, holdEl].forEach(el => {
      if (!el) return;
      el.innerHTML = '';
      for (let i = 0; i < 36; i++) {
        const d = document.createElement("div");
        d.className = "preview-cell";
        el.appendChild(d);
      }
    });
  }

  reset() {
    this.board = new Board(CORE.BASE_W, CORE.H);
    this.renderer = new Renderer(this.board);
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.queue = [];
    this.active = null;
    this.holdPiece = null;
    this.holdUsed = false;
    this.tempUpgrades = {
        clearRowCharges: 0,
        clearColumnCharges: 0,
        clearAreaCharges: 0,
        speedUpLevels: 0
    };
    this.gravityCharges = 0;
    this.currentPool = [...this.permanentPool];
    this.updateStats();
    this.renderer.drawBoard();
    this.renderer.drawPreview(null);
    this.renderer.drawHold(null);
    byId("gameover-unlocks").style.display = "none";
  }

  updateConsumables() {
    byId("clear-row-count").textContent = this.tempUpgrades.clearRowCharges;
    byId("clear-column-count").textContent = this.tempUpgrades.clearColumnCharges;
    byId("clear-area-count").textContent = this.tempUpgrades.clearAreaCharges;
    byId("gravity-charges").textContent = this.gravityCharges;
    
    byId("clear-row-btn").disabled = this.tempUpgrades.clearRowCharges <= 0;
    byId("clear-column-btn").disabled = this.tempUpgrades.clearColumnCharges <= 0;
    byId("clear-area-btn").disabled = this.tempUpgrades.clearAreaCharges <= 0;
    byId("gravity-btn").disabled = this.gravityCharges < 10;
  }

  useClearRow() {
    if (this.tempUpgrades.clearRowCharges > 0) {
      this.tempUpgrades.clearRowCharges--;
      this.board.clearRandomRow();
      this.updateConsumables();
      this.renderer.drawBoard();
    }
  }

  useClearColumn() {
    if (this.tempUpgrades.clearColumnCharges > 0) {
      this.tempUpgrades.clearColumnCharges--;
      this.board.clearRandomColumn();
      this.updateConsumables();
      this.renderer.drawBoard();
    }
  }

  useClearArea() {
    if (this.tempUpgrades.clearAreaCharges > 0) {
      this.tempUpgrades.clearAreaCharges--;
      this.board.clearRandomArea();
      this.updateConsumables();
      this.renderer.drawBoard();
    }
  }

  useGravity() {
    if (this.gravityCharges >= 10) {
      this.gravityCharges -= 10;
      this.board.applyGravity();
      this.updateConsumables();
      this.renderer.drawBoard();
    }
  }

  start() {
    if (this.state === "playing") return;
    this.state = "playing";
    this.spawn();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
    startPauseBtn.textContent = "Pause";
    topRestartBtn.style.display = "block";
  }

  pause() {
    this.isPaused = !this.isPaused;
    startPauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
  }

  spawn() {
    if (this.queue.length < 3) {
      this.queue.push(...CORE.bagRandom(this.currentPool, PIECES));
    }
    const type = this.queue.shift();
    this.active = new Piece(type);
    this.active.x = Math.floor((this.board.w - this.active.w) / 2);
    this.active.y = 0;
    
    // Check spawn collision
    if (this.board.checkCollision(this.active)) {
      this.gameOver();
    }
    
    this.renderer.drawPreview(this.queue[0]);
    this.holdUsed = false;
  }

  gameOver() {
    this.state = "gameover";
    overlayEl.setAttribute("aria-hidden", "false");
    byId("summary").innerHTML = `
        <div class="stat"><span class="label">Score:</span> ${this.score}</div>
        <div class="stat"><span class="label">Lines:</span> ${this.lines}</div>
        <div class="stat"><span class="label">Level:</span> ${this.level}</div>
    `;
    
    // Check for permanent unlock if score is decent
    if (this.score > 100) {
        this.showPermanentUnlock();
    }
  }

  showPermanentUnlock() {
    const unlockSec = byId("gameover-unlocks");
    const optionsEl = byId("gameover-unlock-options");
    unlockSec.style.display = "block";
    optionsEl.innerHTML = '';

    const all = Object.keys(PIECES);
    const locked = all.filter(p => !this.permanentPool.includes(p));
    const choices = CORE.bagRandom(locked, PIECES).slice(0, 3);

    choices.forEach(type => {
        const card = document.createElement("div");
        card.className = "unlock-card";
        card.innerHTML = `<div>${type}</div>`;
        card.onclick = () => {
            this.permanentPool.push(type);
            localStorage.setItem('rogueTris_pool', JSON.stringify(this.permanentPool));
            restartBtn.click();
        };
        optionsEl.appendChild(card);
    });
  }

  loop(time) {
    if (this.state !== "playing" || this.isPaused) return;
    const dt = time - this.lastTime;
    this.lastTime = time;

    this.dropTimer += dt;
    const gravity = CORE.computeGravity(this.level, this.tempUpgrades.speedUpLevels);
    
    if (this.dropTimer > gravity) {
      this.dropTimer = 0;
      this.move(0, 1);
    }

    this.renderer.drawBoard();
    if (this.active) {
      this.renderer.drawGhost(this.active);
      this.renderer.drawActive(this.active);
    }
    requestAnimationFrame(this.loop);
  }

  move(dx, dy) {
    if (!this.active) return false;
    this.active.x += dx;
    this.active.y += dy;
    if (this.board.checkCollision(this.active)) {
      this.active.x -= dx;
      this.active.y -= dy;
      if (dy > 0) this.lock();
      return false;
    }
    return true;
  }

  rotate() {
    if (!this.active) return;
    const oldRot = this.active.rotation;
    this.active.rotation = (this.active.rotation + 1) % 4;
    
    // Simple wall kick
    const kicks = [0, 1, -1, 2, -2];
    let success = false;
    for (let dx of kicks) {
      this.active.x += dx;
      if (!this.board.checkCollision(this.active)) {
        success = true;
        break;
      }
      this.active.x -= dx;
    }
    
    if (!success) this.active.rotation = oldRot;
  }

  unlock() {
    this.state = "unlocking";
    const optionsEl = byId("unlock-options");
    optionsEl.innerHTML = '';
    
    const choices = CORE.pickWeighted(CORE.UPGRADE_DEFS, 3);
    choices.forEach(choice => {
      const card = document.createElement("div");
      card.className = "unlock-card";
      card.innerHTML = `
        <div style="font-size:1.5rem">${choice.icon}</div>
        <div style="font-weight:bold">${choice.name}</div>
        <div style="font-size:0.7rem; color:var(--muted)">${choice.desc}</div>
      `;
      card.onclick = () => {
        this.applyUpgrade(choice);
        byId("unlock-overlay").setAttribute("aria-hidden", "true");
        this.state = "playing";
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
      };
      optionsEl.appendChild(card);
    });
    
    // Also offer a new piece
    const all = Object.keys(PIECES);
    const newPieces = all.filter(p => !this.currentPool.includes(p));
    if (newPieces.length > 0) {
        const pType = newPieces[Math.floor(Math.random() * newPieces.length)];
        const card = document.createElement("div");
        card.className = "unlock-card";
        card.innerHTML = `
            <div style="font-weight:bold">New Piece: ${pType}</div>
            <div style="font-size:0.7rem; color:var(--muted)">Add to your run</div>
        `;
        card.onclick = () => {
            this.currentPool.push(pType);
            byId("unlock-overlay").setAttribute("aria-hidden", "true");
            this.state = "playing";
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop);
        };
        optionsEl.appendChild(card);
    }

    byId("unlock-overlay").setAttribute("aria-hidden", "false");
  }

  applyUpgrade(upgrade) {
    switch(upgrade.id) {
        case 'clear_row': this.tempUpgrades.clearRowCharges++; break;
        case 'clear_column': this.tempUpgrades.clearColumnCharges++; break;
        case 'clear_area': this.tempUpgrades.clearAreaCharges++; break;
        case 'speed_up': this.tempUpgrades.speedUpLevels++; break;
        case 'gravity_cost_down': this.gravityCharges += 5; break;
    }
    this.updateStats();
  }

  lock() {
    this.board.mergePiece(this.active);
    const cleared = this.board.clearLines();
    if (cleared > 0) {
      this.lines += cleared;
      this.score += [0, 100, 300, 500, 800, 1200, 2000][cleared] || (cleared * 500);
      this.gravityCharges += cleared;
      
      if (this.lines >= this.level * 10) {
        this.level++;
        this.unlock();
      }
      this.updateStats();
    }
    this.spawn();
  }

  hold() {
    if (this.holdUsed) return;
    const currentType = this.active.type;
    if (this.holdPiece) {
      const nextType = this.holdPiece;
      this.holdPiece = currentType;
      this.active = new Piece(nextType);
      this.active.x = Math.floor((this.board.w - this.active.w) / 2);
      this.active.y = 0;
    } else {
      this.holdPiece = currentType;
      this.spawn();
    }
    this.holdUsed = true;
    this.renderer.drawHold(this.holdPiece);
  }

  updateStats() {
    scoreEl.textContent = this.score;
    linesEl.textContent = this.lines;
    levelEl.textContent = this.level;
    this.updateConsumables();
  }

  bindControls() {
    byId("btn-left").onclick = () => this.move(-1, 0);
    byId("btn-right").onclick = () => this.move(1, 0);
    byId("btn-rotate").onclick = () => this.rotate();
    byId("btn-soft").onclick = () => this.move(0, 1);
    byId("btn-hard").onclick = () => {
      while(this.move(0, 1));
    };
    byId("btn-hold").onclick = () => this.hold();
    
    byId("clear-row-btn").onclick = () => this.useClearRow();
    byId("clear-column-btn").onclick = () => this.useClearColumn();
    byId("clear-area-btn").onclick = () => this.useClearArea();
    byId("gravity-btn").onclick = () => this.useGravity();

    startPauseBtn.onclick = () => {
      if (this.state === "ready") this.start();
      else this.pause();
    };
    
    topRestartBtn.onclick = () => {
        if (confirm("Restart game?")) {
            this.reset();
            this.state = "ready";
            startPauseBtn.textContent = "Start";
            topRestartBtn.style.display = "none";
        }
    };

    restartBtn.onclick = () => {
      overlayEl.setAttribute("aria-hidden", "true");
      this.reset();
      this.state = "playing";
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop);
    };
  }
}

const game = new Game();
