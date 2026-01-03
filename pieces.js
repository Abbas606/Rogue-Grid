
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
  'H8': { color: '#1E90FF', shape: [[1,1,1,1],[0,0,1,1]], center: [2, 1] },
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
    color: '#FFD700', // Gold
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    center: [1, 1]
  },
  'H15': { color: '#F5FFFA', shape: [[1,1,1,1],[0,1,0,1]], center: [2, 1] },
  'H16': {
    color: '#F0FFFF',
    shape: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 1]
    ],
    center: [1.5, 1.5]
  },
  'H17': { color: '#F5F5DC', shape: [[1,1,1,1],[1,0,0,0],[1,0,0,0]], center: [1.5, 1.5] },
  'H18': { color: '#FFF5EE', shape: [[1,1,1,0],[1,0,1,0]], center: [1.5, 0.5] },
  'H19': { color: '#F5F5F5', shape: [[1,1,0,0],[0,1,1,1],[0,0,1,0]], center: [1.5, 1.5] },
  'H20': { color: '#FFFAF0', shape: [[1,1,1,1],[0,0,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H21': { color: '#F8F8FF', shape: [[1,1,1,0],[0,0,1,1],[0,0,1,0]], center: [1.5, 1.5] },
  'H22': { color: '#FDFAF0', shape: [[1,1,0,0],[0,1,1,0],[0,1,1,0]], center: [1.5, 1.5] },
  'H23': { color: '#FAFAD2', shape: [[1,1,0,0],[0,1,1,1],[0,0,0,1]], center: [1.5, 1.5] },
  'H24': { color: '#D3D3D3', shape: [[1,1,1,0],[0,1,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H25': { color: '#90EE90', shape: [[1,1,1,1],[0,0,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H26': { color: '#ADD8E6', shape: [[1,1,0,0],[0,1,1,0],[0,0,1,1]], center: [1.5, 1.5] },
  'H27': { color: '#FFB6C1', shape: [[0,1,0,0],[1,1,1,1],[0,1,0,0]], center: [1.5, 0.5] },
  'H28': { color: '#FFA07A', shape: [[0,1,0,0],[1,1,1,0],[0,0,1,1]], center: [1.5, 1.5] },
  H29: {
    shape: [[0, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 0]],
    color: '#20B2AA',
    center: [1.5, 1.5]
  },
  'H30': { color: '#87CEFA', shape: [[1,1,0,0],[0,1,1,1],[0,1,0,0]], center: [1.5, 1.5] },
  'H31': { color: '#778899', shape: [[1,1,0,0],[1,1,1,0],[0,0,1,0]], center: [1.5, 1.5] },
  'H32': { color: '#B0C4DE', shape: [[0,1,0,0],[1,1,1,0],[1,0,1,0]], center: [1.5, 1.5] },
  H33: {
    shape: [[0, 1, 0], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
    color: '#FFFFE0',
    center: [1.5, 1.5]
  },
  'H34': { color: '#32CD32', shape: [[1,1,1,0],[0,0,1,1],[0,0,0,1]], center: [1.5, 1.5] },
  'H35': { color: '#FAF0E6', shape: [[1,1,1],[1,1,0],[1,0,0]], center: [1, 1] }
};
