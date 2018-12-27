export const CC_CHANNEL = 186;
export const CC_LENGTH = 16;
export const CC_MAX = 40;

export const CC_MUTE = 0;
export const CC_SOLO = 16;
export const CC_SEND1 = 32;
export const CC_SEND2 = 48;

// FIXME: MIDI(186,64,64) + noteon causes bug
export const CC_VOLUME = 65;
export const CC_CONTROL = 81;
export const CC_PLAYBACK = 121;
export const CC_TRANSPORT = 122;

export const MODES = [
  ['K', 'KBD'],
  ['P', 'PADS'],
  ['V', 'VOLUME'],
  ['1', 'SEND1'],
  ['2', 'SEND2'],
];

export const TYPES = [
  ['Mute', CC_MUTE],
  ['Solo', CC_SOLO],
  ['Send1', CC_SEND1],
  ['Send2', CC_SEND2],
  ['Volume', CC_VOLUME],
  ['CC', CC_CONTROL],
];

export function isIn(data1, offset, maxLength) {
  return data1 >= offset && data1 < (offset + maxLength);
}

export function getType(msg) {
  const { controller, value } = msg;

  for (let i = 0; i < TYPES.length; i += 1) {
    const type = TYPES[i][0];
    const offset = TYPES[i][1];

    if (isIn(controller, offset, type === 'CC' ? CC_MAX : CC_LENGTH)) {
      return [type, controller - offset, value];
    }
  }

  return [undefined, controller, value];
}

// FIXME: read/write state and load/save from/to biwtwig? :V
export const MAPPINGS = [
  ['1', { index: 1 }],
  ['2', { index: 2 }],
  ['3', { index: 3 }],
  ['4', { index: 4 }],
  ['5', { index: 5 }],
  ['6', { index: 6 }],
  ['7', { index: 7 }],
  ['8', { index: 8 }],
  ['9', { index: 9 }],
  ['0', { index: 10 }],
  ['Q', { index: 11 }],
  ['W', { index: 12 }],
  ['E', { index: 13 }],
  ['R', { index: 14 }],
  ['T', { index: 15 }],
  ['Y', { index: 16 }],
  ['U', { index: 17 }],
  ['I', { index: 18 }],
  ['O', { index: 19 }],
  ['P', { index: 20 }],
  ['A', { index: 21 }],
  ['S', { index: 22 }],
  ['D', { index: 23 }],
  ['F', { index: 24 }],
  ['G', { index: 25 }],
  ['H', { index: 26 }],
  ['J', { index: 27 }],
  ['K', { index: 28 }],
  ['L', { index: 29 }],
  ['Ñ', { index: 30 }],
  ['Z', { index: 31 }],
  ['X', { index: 32 }],
  ['C', { index: 33 }],
  ['V', { index: 34 }],
  ['B', { index: 35 }],
  ['N', { index: 36 }],
  ['M', { index: 37 }],
  [',', { index: 38 }],
  ['.', { index: 39 }],
  ['-', { index: 40 }],
];

export const NOTES = {
  Z: { note: 5, name: 'C' },
  S: { note: 6, name: 'C♯/D♭' },
  X: { note: 7, name: 'D' },
  D: { note: 8, name: 'D♯/E♭' },
  C: { note: 9, name: 'E' },
  V: { note: 10, name: 'F' },
  G: { note: 11, name: 'F♯/G♭' },
  B: { note: 12, name: 'G' },
  H: { note: 13, name: 'G♯/A♭' },
  N: { note: 14, name: 'A' },
  J: { note: 15, name: 'A♯/B♭' },
  M: { note: 16, name: 'B' },
  ',': { note: 17, name: 'C' },
  L: { note: 18, name: 'C♯/D♭' },
  '.': { note: 19, name: 'D' },
  Ñ: { note: 20, name: 'D♯/E♭' },
  '-': { note: 21, name: 'E' },
  Q: { note: 17, name: 'C' },
  W: { note: 18, name: 'D' },
  2: { note: 19, name: 'C♯/D♭' },
  3: { note: 20, name: 'D♯/E♭' },
  E: { note: 21, name: 'E' },
  R: { note: 22, name: 'F' },
  5: { note: 23, name: 'F♯/G♭' },
  T: { note: 24, name: 'G' },
  6: { note: 25, name: 'G♯/A♭' },
  Y: { note: 26, name: 'A' },
  7: { note: 27, name: 'A♯/B♭' },
  U: { note: 28, name: 'B' },
  I: { note: 29, name: 'C' },
  9: { note: 30, name: 'C♯/D♭' },
  O: { note: 31, name: 'D' },
  0: { note: 32, name: 'D♯/E♭' },
  P: { note: 33, name: 'E' },
};

export const ACTIONS = [
  // FIXME: see if these can be sent also as sysex... or not
  (ch, key, ctrl) => key && key.name === 's' && (key.ctrl || key.meta) && ctrl.sync(),
  (ch, key, ctrl) => key && key.name === 'up' && ctrl.up(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'down' && ctrl.down(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'left' && ctrl.left(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'right' && ctrl.right(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'tab' && ctrl.mode(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'space' && ctrl.play(),
  (ch, key, ctrl) => key && key.name === 'escape' && ctrl.stop(),
  (ch, key, ctrl) => key && key.name === 'return' && ctrl.add(),
  (ch, key, ctrl) => key && key.name === 'backspace' && ctrl.drop(),
];

export function print(value, suffix) {
  process.stdout.write(`\r${value}\x1b[K${suffix || ''}`);
}

export function clr() {
  for (let i = 0; i < 5; i += 1) print('', '\n');
  print('', '\x1B[5A\r');
}

export function format(value, code) {
  return `\u001b[${code}m${value}\u001b[0m`;
}

export function padding(type, value, offset) {
  const blank = Array.from({ length: offset - String(value).length }).join(' ');

  if (type > 0) {
    return `${value}${blank}`;
  }

  if (type < 0) {
    return `${blank}${value}`;
  }

  const left = blank.substr(0, Math.floor(blank.length / 2));
  const right = blank.substr(Math.floor(blank.length / 2));

  return `${left}${value}${right}`;
}

export function dsel(length, offset, enabled) {
  return Array.from({ length }).map((_, k) => {
    return enabled && offset === k ? '↑' : ' ';
  }).join(' ');
}

export function dpads(length, empty, cb) {
  return Array.from({ length }).map((_, k) => {
    return (cb && cb(k)) || format(empty || '░', 2);
  }).join(' ');
}

export function dfadr(length, cb) {
  return Array.from({ length }).map((_, k) => {
    return (cb && cb(k)) || format('░', 2);
  }).join(' ');
}

export function dchars(values, glue, keys, st) {
  return values.split('').map(x => {
    if (keys && /[148AFK]/.test(x)) return ' ';
    return !st[x] ? format(x, 2) : x;
  }).join(glue || '');
}
