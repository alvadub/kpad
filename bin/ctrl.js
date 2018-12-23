const keypress = require('keypress');
const easymidi = require('easymidi');

// FIXME: how implement other virtual-controls like faders or such?
// FIXME: how to draw on the CLI the current UI layout?
// FIXME: split into smaller modules

////// PADS
//
//    1 2 3 4 5 6 7 8 9 0 (1-10)
//    Q W E R T Y U I O P (11-20)
//    A S D F G H J K L Ñ (21-20)
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

// FIXME: read/write state and load/save from/to biwtwig? :V
const MAPPINGS = {
  '1': { index: 1, action: null },
  '2': { index: 2, action: null },
  '3': { index: 3, action: null },
  '4': { index: 4, action: null },
  '5': { index: 5, action: null },
  '6': { index: 6, action: null },
  '7': { index: 7, action: null },
  '8': { index: 8, action: null },
  '9': { index: 9, action: null },
  '0': { index: 10, action: null },
  'Q': { index: 11, action: null },
  'W': { index: 12, action: null },
  'E': { index: 13, action: null },
  'R': { index: 14, action: null },
  'T': { index: 15, action: null },
  'Y': { index: 16, action: null },
  'U': { index: 17, action: null },
  'I': { index: 18, action: null },
  'O': { index: 19, action: null },
  'P': { index: 20, action: null },
  'A': { index: 21, action: null },
  'S': { index: 22, action: null },
  'D': { index: 23, action: null },
  'F': { index: 24, action: null },
  'G': { index: 25, action: null },
  'H': { index: 26, action: null },
  'J': { index: 27, action: null },
  'K': { index: 28, action: null },
  'L': { index: 29, action: null },
  'Ñ': { index: 30, action: null },
  'Z': { index: 31, action: null },
  'X': { index: 32, action: null },
  'C': { index: 33, action: null },
  'V': { index: 34, action: null },
  'B': { index: 35, action: null },
  'N': { index: 36, action: null },
  'M': { index: 37, action: null },
  ',': { index: 38, action: null },
  '.': { index: 39, action: null },
  '-': { index: 40, action: null },
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
  (ch, key, ctrl) => key && key.name === 'tab' && ctrl.toggle(),
  (ch, key, ctrl) => key && key.name === 'escape' && ctrl.reset(),
  (ch, key, ctrl) => ch === '<' && ctrl._mode === 'KBD' && ctrl.dec(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode === 'KBD' && ctrl.inc(),
  (ch, key, ctrl) => ch === '<' && ctrl._mode === 'PAD' && ctrl.prev(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode === 'PAD' && ctrl.next(),
];

class Controller {
  constructor() {
    this._interval = 100;
    this._channel = 10;

    this._octave = 3;
    this._preset = 1;
    this._mode = 'KBD';

    // for sending CC values
    this._states = {};

    // effects
    this._active = 0;

    // master is 0-offset
    this._volume = [90];
    this._levels = [];

    const deviceName = 'kPAD I';

    if (process.platform === 'win32') {
      const outputs = easymidi.getOutputs();

      outputs.some(name => {
        if (name.toLowerCase().indexOf(deviceName.toLowerCase()) > -1) {
          this.out = new easymidi.Output(name);
          return true;
        }
        return false;
      });
    } else {
      this.out = new easymidi.Output(deviceName, true);
    }

    this.out.send('sysex', [240, 173, 245, 1, 17, 2, 247]);

    keypress(process.stdin);

    process.stdin.on('keypress', (ch, key) => {
      if (key && key.ctrl && key.name === 'c') {
        this.ln(this.format('OFF', 2), '\n');
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

          if (this._mode === 'KBD' && NOTES[char]) {
            done = this.sendMidi(NOTES[char], key && key.shift);
          }

          if (this._mode === 'PAD' && MAPPINGS[char]) {
            done = this.sendCC(MAPPINGS[char]);
          }

          if (done !== true) {
            this.tap(ch, key);
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

  pad(value, offset) {
    return `00${value}`.substr(offset ? offset * -1 : -3);
  }

  format(value, code) {
    return `\u001b[${code}m${value}\u001b[0m`;
  }

  render(value) {
    const label = value ? this.format(value, '30;43') : '';
    const offset = this._mode === 'KBD' ? this._octave : this._preset;
    const general = !this._active ? this.format(this.pad(this._volume[0]), 4) : this.pad(this._volume[0]);

    this.ln(`#${this._mode}${this.pad(offset, 2)} ${general} ${Array.from({ length: 10 }).map((_, x) => {
      const current = this[this._mode === 'KBD' ? '_volume' : '_levels'][x + 1] || 0;

      let level = this.pad(current);

      if (current > 85) {
        level = this.format(level, 31);
      } else if (current > 42) {
        level = this.format(level, 33);
      } else {
        level = this.format(level, 32);
      }

      if (this._active === (x + 1)) {
        return this.format(level, 4);
      }

      return level;
    }).join(' ')}`, '\n');

    if (this._mode !== 'PAD') {
      this.ln(label, '\x1B[1A\r');
      return;
    }

    this.ln('1234567890 QWERTYUIOP ASDFGHJKLÑ ZXCVBNM,.-'.split('').map(char => {
      if (char !== ' ') {
        if (MAPPINGS[char] && this._states[MAPPINGS[char].index]) {
          return this.format(char, 4);
        }

        return this.format(char, 2);
      }

      return char;
    }).join(''), '\x1B[1A\r');
  }

  toggle() {
    if (this._mode === 'KBD') {
      this._mode = 'PAD';
    } else {
      this._mode = 'KBD';
    }
    this.render();
    return true;
  }

  sync() {
    clearTimeout(this._saving);
    this._saving = setTimeout(() => {
      clearTimeout(this._saving);

      this.send(JSON.stringify({
        some: 'state' + new Date().toISOString(),
      }));
    }, 1000);
    return true;
  }

  tap(ch, key) {
    const value = key ? key.name : ch;

    this.send((key && key.shift) ? value.toUpperCase() : value);
    return true;
  }

  up(shift) {
    const prop = this._mode === 'KBD' ? '_volume' : '_levels';
    const offset = shift ? 10 : 1;

    this[prop][this._active] = Math.min(127, (this[prop][this._active] || 0) + offset);
    this.render();
    return true;
  }

  down(shift) {
    const prop = this._mode === 'KBD' ? '_volume' : '_levels';
    const offset = shift ? 10 : 1;

    this[prop][this._active] = Math.max(0, (this[prop][this._active] || 0) - offset);
    this.render();
    return true;
  }

  left(shift) {
    if (shift) {
      // FIXME
    } else {
      this._active = Math.max(0, this._active - 1);
    }
    this.render();
    return true;
  }

  right(shift) {
    if (shift) {
      // FIXME
    } else {
      this._active = Math.min(10, this._active + 1);
    }
    this.render();
    return true;
  }

  inc() {
    this._octave = Math.min(8, this._octave + 1);
    this.render();
    return true;
  }

  dec() {
    this._octave = Math.max(1, this._octave - 1);
    this.render();
    return true;
  }

  prev() {
    this._preset = Math.max(1, this._preset - 1);
    this.render();
    return true;
  }

  next() {
    this._preset = Math.min(10, this._preset + 1);
    this.render();
    return true;
  }

  reset() {
    if (this._active) {
      this[this._mode === 'KBD' ? '_volume' : '_levels'][this._active] = 0;
    }

    this.render();
    return true;
  }

  send(value) {
    const code = value.split('').map(x => x.charCodeAt());

    if (code.length === 1) {
      code.unshift('\0');
    }

    const hex = code.map(x => x.toString(16)).join('');

    this.log(value, `f0${hex}f7`);
    this.out.send('sysex', [240, ...code, 247]);

    return true;
  }

  sendCC(ch) {
    this._states[ch.index] = !this._states[ch.index];

    this.out.send('cc', {
      value: this._states[ch.index] ? 127 : 0,
      controller: ch.index,
      channel: this._channel,
    });

    this.render();
    return true;
  }

  // FIXME: try supporting keydown/keyup with https://github.com/wilix-team/iohook for real pressure?
  sendMidi(ch, accent) {
    this.render(ch.name);

    const fixedNote = ch.note + (12 * (this._octave - 1));
    const fixedAccent = this._volume[0] + (this._volume[0] / 100 * 20);

    this.out.send('noteon', {
      note: fixedNote,
      velocity: Math.min(127, accent ? fixedAccent : this._volume[0]),
      channel: this._channel,
    });

    setTimeout(() => {
      this.render();
      this.out.send('noteoff', {
        note: fixedNote,
        velocity: this._volume[0],
        channel: this._channel,
      });
    }, this._interval);

    return true;
  }
}

module.exports = Controller;
