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
//     S D   G H J
// <> Z X C V B N M
// ^
//  `--down/up octaves

// FIXME: read/write state and load/save from/to biwtwig? :V

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
  'Z': { note: 5, pitch: 1, name: 'C' },
  'S': { note: 6, pitch: 1, name: 'C♯/D♭' },
  'X': { note: 7, pitch: 1, name: 'D' },
  'D': { note: 8, pitch: 1, name: 'D♯/E♭' },
  'C': { note: 9, pitch: 1, name: 'E' },
  'V': { note: 10, pitch: 1, name: 'F' },
  'G': { note: 11, pitch: 1, name: 'F♯/G♭' },
  'B': { note: 12, pitch: 1, name: 'G' },
  'H': { note: 13, pitch: 1, name: 'G♯/A♭' },
  'N': { note: 14, pitch: 1, name: 'A' },
  'J': { note: 15, pitch: 1, name: 'A♯/B♭' },
  'M': { note: 16, pitch: 1, name: 'B' },
  ',': { note: 17, pitch: 1, name: 'C' },
  'L': { note: 18, pitch: 1, name: 'C♯/D♭' },
  '.': { note: 19, pitch: 1, name: 'D' },
  'Ñ': { note: 20, pitch: 1, name: 'D♯/E♭' },
  '-': { note: 21, pitch: 1, name: 'E' },

  ////// HIGHER NOTES
  'Q': { note: 17, pitch: 1, name: 'C' },
  'W': { note: 18, pitch: 1, name: 'C♯/D♭' },
  '2': { note: 19, pitch: 1, name: 'D' },
  '3': { note: 20, pitch: 1, name: 'D♯/E♭' },
  'E': { note: 21, pitch: 1, name: 'E' },
  'R': { note: 22, pitch: 1, name: 'F' },
  '5': { note: 23, pitch: 1, name: 'F♯/G♭' },
  'T': { note: 24, pitch: 1, name: 'G' },
  '6': { note: 25, pitch: 1, name: 'G♯/A♭' },
  'Y': { note: 26, pitch: 1, name: 'A' },
  '7': { note: 27, pitch: 1, name: 'A♯/B♭' },
  'U': { note: 28, pitch: 1, name: 'C' },
  'I': { note: 29, pitch: 1, name: 'C♯/D♭' },
  '9': { note: 30, pitch: 1, name: 'D' },
  'O': { note: 31, pitch: 1, name: 'D♯/E♭' },
  '0': { note: 32, pitch: 1, name: 'E' },
  'P': { note: 33, pitch: 1, name: 'F' },
};

const ACTIONS = [
  // FIXME: see if these can be sent also as sysex... or not
  (ch, key, ctrl) => key && key.name === 's' && (key.ctrl || key.meta) && ctrl.sync(),
  (ch, key, ctrl) => key && key.name === 'up' && ctrl.up(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'down' && ctrl.down(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'left' && ctrl.left(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'right' && ctrl.right(key && key.shift),
  (ch, key, ctrl) => key && key.name === 'escape' && ctrl.toggle(),
  (ch, key, ctrl) => ch === '<' && ctrl._mode === 'KBD' && ctrl.dec(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode === 'KBD' && ctrl.inc(),
  (ch, key, ctrl) => ch === '<' && ctrl._mode === 'PAD' && ctrl.prev(),
  (ch, key, ctrl) => ch === '>' && ctrl._mode === 'PAD' && ctrl.next(),
];

class Controller {
  constructor() {
    this._interval = 100;
    this._buffer = [];
    this._timers = {};
    this._octave = 3;
    this._preset = 1;
    this._channel = 0;
    this._mode = 'KBD';

    // volume
    this._master = 90;

    // effects
    this._active = 0;
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

  pad(value) {
    return `00${value}`.substr(-2);
  }

  format(value, code) {
    return `\u001b[${code}m${value}\u001b[0m`;
  }

  render(value) {
    const label = value ? this.format(value, '30;43') : '';
    const offset = this._mode === 'KBD' ? this._octave : this._preset;
    const current = this._levels[this._active] || 0;

    // FIXME: use colors for these values? e.g. red/orange/yellow/green?
    const levelInfo = this.format(`${this._master}:${this._active}/${current}`, 2);

    this.ln(`#${this._channel} ${this.format(this._mode, 4)}${this.pad(offset)} ${levelInfo} ${label}`);
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
  }

  tap(ch, key) {
    const value = key ? key.name : ch;

    this.send((key && key.shift) ? value.toUpperCase() : value);
  }

  up(shift) {
    const step = shift ? 10 : 1;

    if (this._active) {
      this._levels[this._active] = Math.min(127, (this._levels[this._active] || 0) + step);
    } else {
      this._master = Math.min(127, this._master + step);
    }
    this.render();
    return true;
  }

  down(shift) {
    const step = shift ? 10 : 1;

    if (this._active) {
      this._levels[this._active] = Math.max(0, (this._levels[this._active] || 0) - step);
    } else {
      this._master = Math.max(0, this._master - step);
    }
    this.render();
    return true;
  }

  left(shift) {
    if (shift) {
      this._channel = Math.max(0, this._channel - 1);
    } else {
      this._active = Math.max(0, this._active - 1);
    }
    this.render();
    return true;
  }

  right(shift) {
    if (shift) {
      this._channel = Math.min(10, this._channel + 1);
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

    clearTimeout(this._timers[ch.name]);
    this._timers[ch.name] = setTimeout(() => {
      clearTimeout(this._timers[ch.name]);
      this.render();

      this.out.send('noteoff', {
        note: fixedNote,
        velocity: this._master,
        channel: this._channel,
      });
    }, this._interval);

    return true;
  }
}

module.exports = Controller;
