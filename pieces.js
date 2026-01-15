
const PIECES = {
  // Monomino
  'M': {
    color: '#FF0000', // Red
    shape: [[1]],
    center: [0.5, 0.5]
  },

  // Domino
  'D': {
    color: '#00FF00', // Green
    shape: [[1, 1]],
    center: [0.5, 0.5]
  },

  // Trominoes
  'I3': {
    color: '#0000FF', // Blue
    shape: [[1, 1, 1]],
    center: [1, 0]
  },
  'L3': {
    color: '#FFFF00', // Yellow
    shape: [
      [1, 0],
      [1, 1]
    ],
    center: [0.5, 0.5]
  },

  // Tetrominoes (existing)
  'I': {
    color: 'cyan',
    shape: [[1, 1, 1, 1]],
    center: [1.5, 0.5]
  },
  'O': {
    color: 'yellow',
    shape: [
      [1, 1],
      [1, 1]
    ],
    center: [1, 1]
  },
  'T': {
    color: 'purple',
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    center: [1, 1]
  },
  'S': {
    color: 'green',
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    center: [1, 1]
  },
  'Z': {
    color: 'red',
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    center: [1, 1]
  },
  'J': {
    color: 'blue',
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    center: [1, 1]
  },
  'L': {
    color: 'orange',
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    center: [1, 1]
  },

  // Pentominoes
  'F': {
    color: '#FF00FF', // Magenta
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 1, 0]
    ],
    center: [1, 1]
  },
  'I5': {
    color: '#00FFFF', // Cyan
    shape: [[1, 1, 1, 1, 1]],
    center: [2.5, 0.5]
  },
  'L5': {
    color: '#FFA500', // Orange
    shape: [
      [1, 0, 0, 0],
      [1, 1, 1, 1]
    ],
    center: [1.5, 0.5]
  },
  'P': {
    color: '#800080', // Purple
    shape: [
      [1, 1],
      [1, 1],
      [1, 0]
    ],
    center: [1, 1]
  },
  'T5': {
    color: '#FFC0CB', // Pink
    shape: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0]
    ],
    center: [1, 1]
  },
  'U': {
    color: '#A52A2A', // Brown
    shape: [
      [1, 0, 1],
      [1, 1, 1]
    ],
    center: [1, 1]
  },
  'V': {
    color: '#808080', // Grey
    shape: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1]
    ],
    center: [1, 1]
  },
  'W': {
    color: '#FFFFFF', // White
    shape: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 1]
    ],
    center: [1, 1]
  },
  'X': {
    color: '#000000', // Black
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    center: [1, 1]
  },
  'Y': {
    color: '#FFD700', // Gold
    shape: [
      [0, 1, 0, 0],
      [1, 1, 1, 1]
    ],
    center: [1.5, 0.5]
  },
  'Z5': {
    color: '#D2691E', // Chocolate
    shape: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ],
    center: [1, 1]
  },

  // Hexominoes
  'H1': { color: '#7FFFD4', shape: [[1,1,1,1,1,1]], center: [2.5, 0.5] },
  'H2': { color: '#6495ED', shape: [[1,1,1,1,1],[1,0,0,0,0]], center: [2, 1] },
  'H3': { color: '#DC143C', shape: [[1,1,1,1,1],[0,1,0,0,0]], center: [2, 1] },
  'H4': { color: '#FF8C00', shape: [[1,1,1,1,1],[0,0,1,0,0]], center: [2, 1] },
  'H5': { color: '#98FB98', shape: [[1,1,1,1,0],[0,0,0,1,1]], center: [2, 1] },
  'H6': { color: '#B0C4DE', shape: [[1,1,1,1],[1,1,0,0]], center: [2, 1] },
  'H7': { color: '#FF00FF', shape: [[1,1,1,1],[0,1,1,0]], center: [2, 1] },
  'H8': { color: '#1E90FF', shape: [[1,1,0],[0,1,0],[0,1,1],[0,0,1]], center: [1.5, 1.5] },
  'H9': { color: '#ADFF2F', shape: [[1,1,1,0],[0,1,1,1]], center: [1.5, 0.5] },
  'H10': { color: '#F0E68C', shape: [[1,1,1],[1,1,1]], center: [1, 1] },
  'H11': { color: '#E6E6FA', shape: [[1,1,0,0],[0,1,1,0],[0,0,1,1]], center: [1.5, 1.5] },
  'H12': {
    color: '#FFF0F5',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
      [0, 0, 1]
    ],
    center: [1.5, 1.5]
  },
  'H13': { color: '#CD5C5C', shape: [[1,1,1,1],[1,0,1,0]], center: [2, 1] },
  'H14': {
    color: '#FFD700',
    shape: [
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0]
    ],
    center: [1.5, 1.0]
  },
  'H15': { color: '#F5FFFA', shape: [[1,1,1,0],[1,0,0,0],[1,0,1,0]], center: [1.5, 1.0] },
  'H16': {
    color: '#F0FFFF',
    shape: [
      [1, 1, 0],
      [1, 0, 0],
      [1, 1, 1]
    ],
    center: [1.5, 1.0]
  },
  'H17': { color: '#F5F5DC', shape: [[1,1,1,1],[1,0,0,0],[1,0,0,0]], center: [1.5, 1.5] },
  'H18': { color: '#FFF5EE', shape: [[1,1,1,0],[1,1,0,0],[0,1,0,0]], center: [1.5, 1] },
  'H19': { color: '#F5F5F5', shape: [[1,1,0,0],[0,1,1,1],[0,0,1,0]], center: [1.5, 1.5] },
  'H20': { color: '#FFFAF0', shape: [[1,1,1,1],[0,0,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H21': { color: '#F8F8FF', shape: [[1,1,1,0],[0,0,1,1],[0,0,1,0]], center: [1.5, 1.5] },
  'H22': { color: '#FDFAF0', shape: [[1,1,0,0],[0,1,1,0],[0,1,1,0]], center: [1.5, 1.5] },
  'H23': { color: '#FAFAD2', shape: [[1,1,0,0],[0,1,1,1],[0,0,0,1]], center: [1.5, 1.5] },
  'H24': { color: '#D3D3D3', shape: [[1,1,1,0],[0,1,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H25': { color: '#90EE90', shape: [[1,1,1,0],[1,0,1,0],[0,0,1,0]], center: [1.5, 1.0] },
  'H26': { color: '#ADD8E6', shape: [[1,1,1],[1,0,0],[1,1,0]], center: [1.5, 1.5] },
  'H27': { color: '#FFB6C1', shape: [[0,1,0,0],[1,1,1,1],[0,1,0,0]], center: [1.5, 0.5] },
  'H28': { color: '#FFA07A', shape: [[0,1,0,0],[1,1,1,0],[1,1,0,0]], center: [1.5, 1.0] },
  H29: {
    shape: [[0, 1, 0], [1, 1, 1], [1, 0, 0], [1, 0, 0]],
    color: '#20B2AA',
    center: [1.5, 1.5]
  },
  'H30': { color: '#87CEFA', shape: [[1,1,0,0],[0,1,1,1],[0,1,0,0]], center: [1.5, 1.5] },
  'H31': { color: '#778899', shape: [[1,1,0,0],[1,1,0,0],[0,1,1,0]], center: [1.5, 1.0] },
  'H32': { color: '#B0C4DE', shape: [[0,1,0,0],[1,1,1,0],[1,0,1,0]], center: [1.5, 1.5] },
  H33: {
    shape: [[0, 1, 0], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
    color: '#FFFFE0',
    center: [1.5, 1.5]
  },
  'H34': { color: '#32CD32', shape: [[1,1,1,0],[0,0,1,0],[0,1,1,0]], center: [1.5, 1.0] },
  'H35': { color: '#FAF0E6', shape: [[1,1,1],[0,1,0],[1,1,0]], center: [1.0, 1.0] }
};

(function validatePieces() {
  if (typeof console === 'undefined') return;

  function coordsFromShape(shape) {
    const coords = [];
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c]) coords.push([r, c]);
      }
    }
    return coords;
  }

  function normalize(coords) {
    let minR = Infinity;
    let minC = Infinity;
    for (const [r, c] of coords) {
      if (r < minR) minR = r;
      if (c < minC) minC = c;
    }
    return coords.map(([r, c]) => [r - minR, c - minC]);
  }

  function canonicalKey(shape) {
    const base = normalize(coordsFromShape(shape));
    if (!base.length) return '';

    function normAndKey(points) {
      const norm = normalize(points);
      norm.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
      return norm.map(([r, c]) => r + ':' + c).join('|');
    }

    function allVariants(coords) {
      const variants = [];

      function rotations(points) {
        const out = [];
        let current = points;
        for (let i = 0; i < 4; i++) {
          let maxR = 0;
          let maxC = 0;
          for (const [r, c] of current) {
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
          }
          const h = maxR + 1;
          const w = maxC + 1;
          out.push(current);
          current = current.map(([r, c]) => [c, h - 1 - r]);
        }
        return out;
      }

      const baseNorm = normalize(coords);
      let maxR = 0;
      let maxC = 0;
      for (const [r, c] of baseNorm) {
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      }
      const w = maxC + 1;

      const reflected = baseNorm.map(([r, c]) => [r, w - 1 - c]);

      const sets = rotations(baseNorm).concat(rotations(reflected));
      for (const s of sets) {
        variants.push(normAndKey(s));
      }
      return variants;
    }

    const keys = allVariants(base);
    keys.sort();
    return keys[0];
  }

  function hexNorm(coords) {
    let minX = Infinity;
    let minY = Infinity;
    for (const [x, y] of coords) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
    return coords.map(([x, y]) => [x - minX, y - minY]);
  }

  function hexKeyFromCoords(coords) {
    const n = hexNorm(coords).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    return n.map(([x, y]) => x + ',' + y).join('|');
  }

  function hexAllVariants(coords) {
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

    const base = hexNorm(coords);
    let maxX = 0;
    for (const [x] of base) {
      if (x > maxX) maxX = x;
    }
    const w = maxX + 1;
    const refl = base.map(([x, y]) => [w - 1 - x, y]);
    return variantsOf(base).concat(variantsOf(refl));
  }

  function hexCanonical(coords) {
    const vars = hexAllVariants(coords).map(v => hexNorm(v));
    let best = null;
    for (const v of vars) {
      const k = hexKeyFromCoords(v);
      if (best === null || k < best.k) best = { k, v };
    }
    return best.v;
  }

  function generateHexominoShapes() {
    let polys = new Map();
    polys.set(hexKeyFromCoords([[0, 0]]), [[0, 0]]);

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
              const c = hexCanonical(poly.concat([[nx, ny]]));
              const ck = hexKeyFromCoords(c);
              if (!next.has(ck)) next.set(ck, c);
            }
          }
        }
      }
      polys = next;
    }

    const shapes = [];
    for (const coords of polys.values()) {
      const n = hexNorm(coords);
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
    return shapes;
  }

  const hexShapes = generateHexominoShapes();
  const hexNames = Object.keys(PIECES).filter(n => /^H\d+$/.test(n)).sort((a, b) => {
    const na = parseInt(a.slice(1), 10);
    const nb = parseInt(b.slice(1), 10);
    return na - nb;
  });

  if (hexShapes.length === hexNames.length) {
    for (let i = 0; i < hexNames.length; i++) {
      const name = hexNames[i];
      const def = PIECES[name];
      def.shape = hexShapes[i].shape;
      def.center = hexShapes[i].center;
    }
  }

  function isConnected(coords) {
    if (!coords.length) return false;
    const set = new Set(coords.map(([r, c]) => r + ',' + c));
    const [sr, sc] = coords[0];
    const queue = [[sr, sc]];
    const visited = new Set([sr + ',' + sc]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const key = nr + ',' + nc;
        if (set.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    return visited.size === coords.length;
  }

  const areaGroups = {};
  const dupMap = {};
  const connectivityIssues = [];

  for (const name in PIECES) {
    const shape = PIECES[name].shape;
    const coords = coordsFromShape(shape);
    const area = coords.length;
    if (!areaGroups[area]) areaGroups[area] = [];
    areaGroups[area].push(name);

    if (!isConnected(coords)) {
      connectivityIssues.push(name);
    }

    const key = canonicalKey(shape);
    if (!dupMap[key]) dupMap[key] = [];
    dupMap[key].push(name);
  }

  const duplicates = Object.values(dupMap).filter(names => names.length > 1);

  if (duplicates.length) {
    console.warn('Polyomino duplicates found:', duplicates);
  } else {
    console.log('Polyomino validation: no duplicate shapes detected.');
  }

  if (connectivityIssues.length) {
    console.warn('Polyomino connectivity issues:', connectivityIssues);
  }

  console.log('Polyomino counts by area:', areaGroups);
})();
