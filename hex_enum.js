function norm(coords) {
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  return coords.map(([x, y]) => [x - minX, y - minY]);
}

function keyFromCoords(coords) {
  const n = norm(coords).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return n.map(([x, y]) => x + ',' + y).join('|');
}

function allVariants(coords) {
  function variantsOf(c) {
    const out = [];
    let cur = c;
    for (let r = 0; r < 4; r++) {
      let maxX = 0;
      let maxY = 0;
      for (const [x, y] of cur) {
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      const w = maxX + 1;
      out.push(cur);
      cur = cur.map(([x, y]) => [y, w - 1 - x]);
    }
    return out;
  }

  const base = norm(coords);
  let maxX = 0;
  for (const [x] of base) {
    if (x > maxX) maxX = x;
  }
  const w = maxX + 1;
  const refl = base.map(([x, y]) => [w - 1 - x, y]);
  return variantsOf(base).concat(variantsOf(refl));
}

function canonical(coords) {
  const vars = allVariants(coords).map(v => norm(v));
  let best = null;
  for (const v of vars) {
    const k = keyFromCoords(v);
    if (best === null || k < best.k) best = { k, v };
  }
  return best.v;
}

let polys = new Map();
polys.set(keyFromCoords([[0, 0]]), [[0, 0]]);

for (let size = 1; size < 6; size++) {
  const next = new Map();
  for (const poly of polys.values()) {
    const set = new Set(poly.map(([x, y]) => x + ',' + y));
    for (const [x, y] of poly) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = nx + ',' + ny;
        if (!set.has(k)) {
          const c = canonical(poly.concat([[nx, ny]]));
          const ck = keyFromCoords(c);
          if (!next.has(ck)) next.set(ck, c);
        }
      }
    }
  }
  polys = next;
}

console.log('count', polys.size);

const shapes = [];
for (const coords of polys.values()) {
  const n = norm(coords);
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of n) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const w = maxX + 1;
  const h = maxY + 1;
  const grid = Array.from({ length: h }, () => Array(w).fill(0));
  for (const [x, y] of n) {
    grid[y][x] = 1;
  }
  let sx = 0;
  let sy = 0;
  for (const [x, y] of n) {
    sx += x;
    sy += y;
  }
  const cx = sx / n.length;
  const cy = sy / n.length;
  shapes.push({ shape: grid, center: [cx, cy] });
}

console.log(JSON.stringify(shapes, null, 2));

