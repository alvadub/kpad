const keypress = require('keypress');
const easymidi = require('easymidi');

// FIXME: how implement other virtual-controls like faders or such?
// FIXME: how to draw on the CLI the current UI layout?
// FIXME: split into smaller modules

////// PADS
//
//    1 2 3 4 5 6 7 8 9 0 (1-10)
//    Q W E R T Y U I O P (11-20)
//    A S D F G H J K L Ñ (21-30)
//    Z X C V B N M , . - (31-40)
// ^
//  `--type sequence + ENTER to on/off
//
//    Z X C V B N M , . - (arrangement timeline)
//
////// KEYBOARD
//
//   2 3   5 6 7   9 0
//  Q W E R T Y U I O P
//
//     S D   G H J   L Ñ
// <> Z X C V B N M , . -
// ^
//  `--down/up octaves

const MODES = [
  ['K', 'KBD'],
  ['P', 'PADS'],
  ['V', 'VOLUME'],
  ['1', 'SEND1'],
  ['2', 'SEND2'],
];

const TYPES = [
  ['Mute', data1 => data1 < 16],
  ['Solo', data1 => data1 < 32 && data1 >= 16],
  ['Send1', data1 => data1 < 48 && data1 >= 32],
  ['Send2', data1 => data1 < 64 && data1 >= 48],
  ['Volume', data1 => data1 < 80 && data1 >= 64],
  ['CC', data1 => data1 >= 80],
];

function getType(msg) {
  const { controller, value } = msg;

  for (let i = 0; i < TYPES.length; i += 1) {
    if (TYPES[i][1](controller)) {
      return [TYPES[i][0], controller - (i * 16), value];
    }
  }

  return [undefined, controller, value]
}

// FIXME: read/write state and load/save from/to biwtwig? :V
const MAPPINGS = [
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

////// OCTAVES
//
// 1.  5-16
// 2. 17-28
// 3. 29-40
// 4. 41-52
// 5. 53-64
// 6. 65-76
// 7. 77-88
// 8. 89-100

const NOTES = {
  ////// LOWER NOTES
  'Z': { note: 5, name: 'C' },
  'S': { note: 6, name: 'C♯/D♭' },
  'X': { note: 7, name: 'D' },
  'D': { note: 8, name: 'D♯/E♭' },
  'C': { note: 9, name: 'E' },
  'V': { note: 10, name: 'F' },
  'G': { note: 11, name: 'F♯/G♭' },
  'B': { note: 12, name: 'G' },
  'H': { note: 13, name: 'G♯/A♭' },
  'N': { note: 14, name: 'A' },
  'J': { note: 15, name: 'A♯/B♭' },
  'M': { note: 16, name: 'B' },
  ',': { note: 17, name: 'C' },
  'L': { note: 18, name: 'C♯/D♭' },
  '.': { note: 19, name: 'D' },
  'Ñ': { note: 20, name: 'D♯/E♭' },
  '-': { note: 21, name: 'E' },

  ////// HIGHER NOTES
  'Q': { note: 17, name: 'C' },
  'W': { note: 18, name: 'D' },
  '2': { note: 19, name: 'C♯/D♭' },
  '3': { note: 20, name: 'D♯/E♭' },
  'E': { note: 21, name: 'E' },
  'R': { note: 22, name: 'F' },
  '5': { note: 23, name: 'F♯/G♭' },
  'T': { note: 24, name: 'G' },
  '6': { note: 25, name: 'G♯/A♭' },
  'Y': { note: 26, name: 'A' },
  '7': { note: 27, name: 'A♯/B♭' },
  'U': { note: 28, name: 'B' },
  'I': { note: 29, name: 'C' },
  '9': { note: 30, name: 'C♯/D♭' },
  'O': { note: 31, name: 'D' },
  '0': { note: 32, name: 'D♯/E♭' },
  'P': { note: 33, name: 'E' },
};

const ACTIONS = [
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

class Controller {
  constructor() {
    this._connected = false;
    this._channel = 10;

    // feedback
    this._pressed = {};
    this._enabled = {};

    // offsets
    this._active = 1;
    this._octave = 3;

    // modes
    this._offset = 0;
    this._mode = 'K';

    // volume
    this._master = 90;
    this._state = {};

    const deviceName = 'kPAD I';

    if (process.platform === 'win32') {
      const outputs = easymidi.getOutputs();

      outputs.some(name => {
        if (name.toLowerCase().indexOf(deviceName.toLowerCase()) > -1) {
          this.out = new easymidi.Output(name);
          this.in = new easymidi.Input(name);
          return true;
        }
        return false;
      });
    } else {
      this.out = new easymidi.Output(deviceName, true);
      this.in = new easymidi.Input(deviceName, true);
    }

    this.in.on('sysex', msg => {
      const [key, ...value] = msg.bytes.slice(1, msg.bytes.length - 1).map(function (x) {
        return String.fromCharCode(x);
      }).join('').split(' ');

      const index = parseInt(key.substr(1), 10);

      if (!this._connected) {
        this._connected = Date.now();
      }

      if (key.charAt() === 'L') {
        this.set('Name', index, value.join(' '));
        this.update();
      }
    });

    this.in.on('cc', msg => {
      if (msg.controller === 120) {
        this._playing = msg.value > 64;
      } else {
        this.set(...getType(msg));
      }

      this.update();
    });

    keypress(process.stdin);

    process.stdin.on('keypress', (ch, key) => {
      if (key && key.ctrl && key.name === 'c') {
        this.clear();

        process.stdin.pause();
        process.exit();
      } else {
        const fixedKey = (key && key.name) || ch;
        const char = fixedKey.toUpperCase();

        let done;

        ACTIONS.some(cb => {
          done = cb(ch, key, this);
          return done;
        });

        this.tap(char);

        if (done !== true && this._mode === 'K' && NOTES[char]) {
          this.sendMidi(NOTES[char], key && key.shift);
        }
      }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  ln(value, suffix) {
    process.stdout.write(`\r${value}\x1b[K${suffix || ''}`);
  }

  log(msg) {
    this._message = msg;
    this.render();
    clearTimeout(this._notify);
    this._notify = setTimeout(() => {
      this._message = '';
      this.render();
    }, 500);
  }

  spad(type, value, offset) {
    const padding = Array.from({ length: offset - String(value).length }).join(' ');

    if (type > 0) {
      return `${value}${padding}`;
    }

    if (type < 0) {
      return `${padding}${value}`;
    }

    const left = padding.substr(0, Math.floor(padding.length / 2));
    const right = padding.substr(Math.floor(padding.length / 2));

    return `${left}${value}${right}`;
  }

  dsel(length) {
    return Array.from({ length }).map((_, k) => {
      return this._mode !== 'K' && this._active - 1 === k ? '↑' : ' ';
    }).join(' ');
  }

  dpads(length, empty, cb) {
    return Array.from({ length }).map((_, k) => {
      return (cb && cb(k)) || this.format(empty || '░', 2);
    }).join(' ');
  }

  dfadr(length, cb) {
    return Array.from({ length }).map((_, k) => {
      return (cb && cb(k)) || this.format('░', 2);
    }).join(' ');
  }

  dchars(values, glue) {
    return values.split('').map(x => {
      if (this._mode === 'K' && /[148AFK]/.test(x)) return ' ';
      return !this._pressed[x] ? this.format(x, 2) : x;
    }).join(glue || '');
  }

  format(value, code) {
    return `\u001b[${code}m${value}\u001b[0m`;
  }

  render(value) {
    const suffix = this._offset ? `\x1B[${this._offset}C` : '';
    const label = this.spad(-1, this.format(MODES[this._offset][1], 2), 23);

    let symbol = '⏏';
    let length = 9;

    if (this._connected) {
      symbol = `❚${this._playing ? '►' : '❚'}`;
      length -= 1;
    }

    value = value
      ? this.format(this.spad(0, value, length), '30;43')
      : this.spad(0, '', length);

    const status = this.format(`${symbol} ESC`, this._pressed.ESCAPE ? 1 : 2);
    const octave = this.format(`${this._octave}♪`, this._mode !== 'K' ? 2 : 1);
    const master = this.format(`${this.spad(-1, Math.round((this._master / 127) * 100), 4)}%`, this._mode !== 'K' ? 2 : 1);

    const name = this._state.Name
      ? this.format(this._state.Name[this._active - 1], this._mode === 'K' ? 2 : 1)
      : '';

    const info = `  ${status} ${value} ${octave} ${master}  ${name}`;

    this.ln(MODES.map((x, k) => (this._offset !== k ? this.format(x[0], 2) : x[0])).join('') + label + info, '\n');

    const getLevel = (type, mode) => x => {
      if (this.get(type, x)) {
        const value = ' ▁▂▃▄▅▆▇████'.substr(Math.floor(((this.get(type, x) / 127) * 100) / 10), 1);

        if (this._mode !== mode) return this.format(value, 2);

        return value;
      }
    };

    const getValue = x => {
      if (this._connected) {
        if (this.get('Solo', x) > 64) return this.format(this._mode === 'P' ? '◆' : '◇', 33);
        if (!(this.get('Mute', x) > 64)) return this.format(this._mode === 'P' ? '◆' : '◇', 32);
      }
    };

    const getState = offset => x => {
      const index = (offset + x) - 80;
      const char = MAPPINGS.map(x => x[0])[index];

      if (this._enabled[char]) {
        if (this._mode === 'K') return this.format('▒', 34);
        return this.format(char, 34);
      }
    };

    const pads = this.format('P', this._mode === 'P' ? 1 : 2);
    const send1 = this.format('1', this._mode === '1' ? 1 : 2);
    const send2 = this.format('2', this._mode === '2' ? 1 : 2);
    const volume = this.format('V', this._mode === 'V' ? 1 : 2);

    // FIXME: try to render one line at-once only?
    this.ln(`${this.dpads(10, '░', getState(80))}  ${this.dchars('1234567890', ' ')}     ${this.dfadr(16, getLevel('Send2', '2'))} ${send2}`, '\n');
    this.ln(`${this.dpads(10, '░', getState(90))}   ${this.dchars('QWERTYUIOP', ' ')}    ${this.dfadr(16, getLevel('Send1', '1'))} ${send1}`, '\n');
    this.ln(`${this.dpads(10, '░', getState(100))}    ${this.dchars('ASDFGHJKLÑ', ' ')}   ${this.dfadr(16, getLevel('Volume', 'V'))} ${volume}`, '\n');
    this.ln(`${this.dpads(10, '░', getState(110))}     ${this.dchars('ZXCVBNM,.-', ' ')}  ${this.dpads(16, '◇', getValue)} ${pads}`, '\n');
    this.ln(`${this.format(this.spad(1, this._message || '', 45), 1)} ${this.dsel(16)}`, `\x1B[5A\r${suffix}`);

    return true;
  }

  update(ms, clear) {
    clearTimeout(this._render);
    this._render = setTimeout(() => {
      if (clear) clear();
      this.render();
    }, ms || 50);
  }

  clear() {
    for (let i = 0; i < 5; i += 1) this.ln('', '\n');
    this.ln('', '\x1B[5A\r');
  }

  set(name, index, value) {
    if (!this._state[name]) {
      this._state[name] = [];
    }

    if (name !== 'Name') {
      this.log(`${name} #${index + 1} ${Math.round((value / 127) * 100)}%`);
    }

    this._state[name][index] = value;
  }

  get(name, index) {
    return this._state[name]
      ? this._state[name][index]
      : undefined;
  }

  play() {
    this.log(this._playing ? 'PAUSE' : 'PLAY');
    return this.sendCC(120, 127);
  }

  stop() {
    if (this._playing) this.log('STOP');
    return this.sendCC(120, 0);
  }

  add() {
    if (this._mode !== 'K') this.send('Mute', this._active - 1, 0);
    return true;
  }

  drop() {
    if (this._mode !== 'K') this.send('Solo', this._active - 1, 0);
    return true;
  }

  mode(shift) {
    if (shift) {
      this._offset = Math.max(0, this._offset - 1);
    } else {
      this._offset = Math.min(4, this._offset + 1);
    }

    this._mode = MODES[this._offset][0];
    this.render();
    return true;
  }

  sync() {
    this.log('Sync in progres...');
    // FIXME: send CC values?
    return true;
  }

  tap(ch, shift) {
    if (this._mode !== 'K' && MAPPINGS.some(x => x[0] === ch)) {
      this._enabled[ch] = !this._enabled[ch];
    }

    this._pressed[ch] = true;
    this.render();

    setTimeout(() => {
      this._pressed[ch] = false;
      this.render();
    }, 50);

    return true;
  }

  up(shift) {
    const offset = shift ? 10 : 1;

    if (this._mode === 'K') {
      this._master = Math.min(127, (this._master || 0) + offset);
    } else {
      if (this._mode === 'V') this.send('Volume', this._active - 1, offset);
      if (this._mode === '1') this.send('Send1', this._active - 1, offset);
      if (this._mode === '2') this.send('Send2', this._active - 1, offset);
    }
    return true;
  }

  down(shift) {
    const offset = shift ? 10 : 1;

    if (this._mode === 'K') {
      this._master = Math.max(0, (this._master || 0) - offset);
    } else {
      if (this._mode === 'V') this.send('Volume', this._active - 1, -offset);
      if (this._mode === '1') this.send('Send1', this._active - 1, -offset);
      if (this._mode === '2') this.send('Send2', this._active - 1, -offset);
    }
    return true;
  }

  left(shift) {
    if (shift) {
      this.sendCC(121, 0);
    } else if (this._mode !== 'K') {
      this._active = Math.max(1, this._active - 1);
      this.render();
    } else {
      this._octave = Math.max(1, this._octave - 1);
      this.render();
    }
    return true;
  }

  right(shift) {
    if (shift) {
      this.sendCC(121, 127);
    } else if (this._mode !== 'K') {
      this._active = Math.min(16, this._active + 1);
      this.render();
    } else {
      this._octave = Math.min(8, this._octave + 1);
      this.render();
    }
    return true;
  }

  send(type, index, offset) {
    const current = this.get(type, index);
    const fixedValue = Math.max(0, Math.min(127, (current || 0) + offset));
    const key = TYPES.findIndex(x => x[0] === type);

    this.set(type, index, fixedValue);
    this.out.send('cc', {
      controller: (key * 16) + index,
      channel: this._channel,
      value: fixedValue,
    });
    return true;
  }

  // FIXME:  #1 vol ~51% (186,64,64) + noteon causes bug
  sendCC(controller, value) {
    this.out.send('cc', {
      channel: this._channel,
      controller,
      value,
    });
    return true;
  }

  // FIXME: try supporting keydown/keyup with https://github.com/wilix-team/iohook for real pressure?
  sendMidi(ch, accent) {
    this.render(ch.name);

    const fixedNote = ch.note + (12 * (this._octave - 1));
    const fixedAccent = this._master + (this._master / 100 * 20);

    this.out.send('noteon', {
      note: fixedNote,
      velocity: Math.min(127, accent ? fixedAccent : this._master),
      channel: this._channel,
    });

    setTimeout(() => {
      this.out.send('noteoff', {
        velocity: 0,
        note: fixedNote,
        channel: this._channel,
      });
      this.render();
    }, 120);
    return true;
  }

  sendSysex(value) {
    const code = value.split('').map(x => x.charCodeAt());

    if (code.length === 1) {
      code.unshift('\0');
    }

    this.out.send('sysex', [240, ...code, 247]);
    return true;
  }
}

module.exports = Controller;
