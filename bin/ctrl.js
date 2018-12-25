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
// <> Z X C V B N M , . - (arrangement timeline)
// ^
//  `--left/right presets
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
  ['1', 'SEND1'],
  ['2', 'SEND2'],
  ['V', 'VOLUME'],
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
const MAPPINGS = {
  '1': { index: 1 },
  '2': { index: 2 },
  '3': { index: 3 },
  '4': { index: 4 },
  '5': { index: 5 },
  '6': { index: 6 },
  '7': { index: 7 },
  '8': { index: 8 },
  '9': { index: 9 },
  '0': { index: 10 },
  'Q': { index: 11 },
  'W': { index: 12 },
  'E': { index: 13 },
  'R': { index: 14 },
  'T': { index: 15 },
  'Y': { index: 16 },
  'U': { index: 17 },
  'I': { index: 18 },
  'O': { index: 19 },
  'P': { index: 20 },
  'A': { index: 21 },
  'S': { index: 22 },
  'D': { index: 23 },
  'F': { index: 24 },
  'G': { index: 25 },
  'H': { index: 26 },
  'J': { index: 27 },
  'K': { index: 28 },
  'L': { index: 29 },
  'Ñ': { index: 30 },
  'Z': { index: 31 },
  'X': { index: 32 },
  'C': { index: 33 },
  'V': { index: 34 },
  'B': { index: 35 },
  'N': { index: 36 },
  'M': { index: 37 },
  ',': { index: 38 },
  '.': { index: 39 },
  '-': { index: 40 },
};

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
  'W': { note: 18, name: 'C♯/D♭' },
  '2': { note: 19, name: 'D' },
  '3': { note: 20, name: 'D♯/E♭' },
  'E': { note: 21, name: 'E' },
  'R': { note: 22, name: 'F' },
  '5': { note: 23, name: 'F♯/G♭' },
  'T': { note: 24, name: 'G' },
  '6': { note: 25, name: 'G♯/A♭' },
  'Y': { note: 26, name: 'A' },
  '7': { note: 27, name: 'A♯/B♭' },
  'U': { note: 28, name: 'C' },
  'I': { note: 29, name: 'C♯/D♭' },
  '9': { note: 30, name: 'D' },
  'O': { note: 31, name: 'D♯/E♭' },
  '0': { note: 32, name: 'E' },
  'P': { note: 33, name: 'F' },
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
  (ch, key, ctrl) => ch === '<' && ctrl._mode === 'K' && ctrl.dec(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode === 'K' && ctrl.inc(),
  (ch, key, ctrl) => ch === '<' && ctrl._mode !== 'K' && ctrl.prev(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode !== 'K' && ctrl.next(),
];

class Controller {
  constructor() {
    this._connected = false;
    this._channel = 10;
    this._pressed = {};

    this._active = 1;
    this._octave = 3;

    this._preset = 1; // for multiple CCs?
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
      const [type, index, value] = getType(msg);

      this.set(type, index, value);
      this.update();
    });

    keypress(process.stdin);

    process.stdin.on('keypress', (ch, key) => {
      if (key && key.ctrl && key.name === 'c') {
        this.clear();

        process.stdin.pause();
        process.exit();
      } else {
        let done;

        ACTIONS.some(cb => {
          done = cb(ch, key, this);
          return done;
        });

        if (done !== true) {
          const fixedKey = (key && key.name) || ch;
          const char = fixedKey.toUpperCase();

          this.tap(char);

          if (this._mode === 'K' && NOTES[char]) {
            this.sendMidi(NOTES[char], key && key.shift);
          }
        }
      }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  log(...msg) {
    this.ln(msg.join(' '), '\n');
  }

  ln(value, suffix) {
    process.stdout.write(`\r${value}\x1b[K${suffix || ''}`);
  }

  spad(type, value, offset) {
    const padding = Array.from({ length: offset - value.length }).join(' ');

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

  npad(value, offset) {
    return `00${value}`.substr(offset ? offset * -1 : -3);
  }

  dsel(length) {
    return Array.from({ length }).map((_, k) => {
      return this._active - 1 === k ? '↑' : ' ';
    }).join(' ');
  }

  dpads(length, cb) {
    return Array.from({ length }).map((_, k) => {
      // 31 red
      // 32 green
      // 33 yellow
      // 34 blue
      // 35 violet
      // 36 cyan
      // 37 silver
      return (cb && cb(k)) || this.format('▓', 2);
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
    const preset = this.format(`#${this._preset}`, this._mode === 'K' ? 2 : 1);
    const octave = this.format(`${this._octave}♪`, this._mode !== 'K' ? 2 : 1);

    const info = `  ${status} ${value} ${octave} ${this.format('/', 2)} ${preset}  ${this.format('TEST', 2)}`;

    this.ln(MODES.map((x, k) => (this._offset !== k ? this.format(x[0], 2) : x[0])).join('') + label + info, '\n');

    const getLevel = type => x => {
      if (this.get(type, x)) {
        return ' ▁▂▃▄▅▆▇████'.substr(Math.floor(((this.get(type, x) / 127) * 100) / 10), 1);
      }
    };

    const getValue = x => {
      if (this.get('Solo', x)) return this.format('▓', 33);
      if (!this.get('Mute', x)) return this.format('▓', 32);
    };

    const send1 = this.format('1', this._mode === '1' ? 1 : 2);
    const send2 = this.format('2', this._mode === '2' ? 1 : 2);
    const volume = this.format('V', this._mode === 'V' ? 1 : 2);

    // FIXME: try to render one line at-once only?
    this.ln(`${this.dpads(10)}  ${this.dchars('1234567890', ' ')}     ${this.dfadr(16, getLevel('Send1'))} ${send1}`, '\n');
    this.ln(`${this.dpads(10)}   ${this.dchars('QWERTYUIOP', ' ')}    ${this.dfadr(16, getLevel('Send2'))} ${send2}`, '\n');
    this.ln(`${this.dpads(10)}    ${this.dchars('ASDFGHJKLÑ', ' ')}   ${this.dfadr(16, getLevel('Volume'))} ${volume}`, '\n');
    this.ln(`${this.dpads(10)}  ${this.dchars('<>')} ${this.dchars('ZXCVBNM,.-', ' ')}  ${this.dpads(16, getValue)}`, '\n');
    this.ln(`\x1B[44C ${this.dsel(16)}`, `\x1B[5A\r${suffix}`);

    return true;
  }

  update() {
    clearTimeout(this._render);
    this._render = setTimeout(() => {
      clearTimeout(this._render);
      this.render();
    }, 50);
  }

  clear() {
    for (let i = 0; i < 5; i += 1) this.ln('', '\n');
    this.ln('', '\x1B[5A\r');
  }

  set(name, index, value) {
    if (!this._state[name]) {
      this._state[name] = [];
    }

    this._state[name][index] = value;
  }

  get(name, index) {
    return this._state[name]
      ? this._state[name][index]
      : undefined;
  }

  play() {
    return this.sendCC(120, 127);
  }

  stop() {
    return this.sendCC(120, 0);
  }

  add() {
    // if (this._active) {
    //   // return turn on/off solo from buffer, while backspace resets everything?
    //   const offset = this._buffer.indexOf(this._active);

    //   if (offset === -1) {
    //     this._buffer.push(this._active);
    //   } else {
    //     this._buffer.splice(offset, 1);
    //   }
    //   this.render();
    // }
    // return true;
  }

  drop() {
    // if (this._active) {
    //   // FIXME: disable all solos at once!
    //   // this._buffer.forEach(x => {
    //   // });
    //   this._buffer = [];
    //   this.render();
    // }
    // return true;
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

  // sync() {
  //   clearTimeout(this._saving);
  //   this._saving = setTimeout(() => {
  //     clearTimeout(this._saving);

  //     this.send(JSON.stringify({
  //       some: 'state' + new Date().toISOString(),
  //     }));
  //   }, 1000);
  //   return true;
  // }

  tap(ch, shift) {
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

    if (!this._active) {
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

    if (!this._active) {
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
    } else {
      this._active = Math.max(1, this._active - 1);
    }
    return this.render();
  }

  right(shift) {
    if (shift) {
      this.sendCC(121, 127);
    } else {
      this._active = Math.min(16, this._active + 1);
    }
    return this.render();
  }

  inc() {
    this._octave = Math.min(8, this._octave + 1);
  }

  dec() {
    this._octave = Math.max(1, this._octave - 1);
  }

  prev() {
    this._preset = Math.max(1, this._preset - 1);
  }

  next() {
    this._preset = Math.min(2, this._preset + 1);
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
        note: fixedNote,
        velocity: this._master,
        channel: this._channel,
      });
      this.render();
    }, 120);
    return true;
  }
}

module.exports = Controller;
