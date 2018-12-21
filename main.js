const keypress = require('keypress');
const easymidi = require('easymidi');

////// PADS
//
//    q w e r t y u i o p (1-10)
//    a s d f g h j k l ñ (11-20)
// ^
//  `--type sequence + ENTER to on/off
//
// <> z x c v b n m , . - (arrangement timeline)
// ^
//  `--left/right presets
//
////// KEYBOARD
//
//      s d   g h j
// <> z x c v b n m
// ^
//  `--down/up octaves

const MAPPINGS = {
  'q': null, 'w': null, 'e': null, 'r': null, 't': null, 'y': null, 'u': null, 'i': null, 'o': null, 'p': null,
  'a': null, 's': null, 'd': null, 'f': null, 'g': null, 'h': null, 'j': null, 'k': null, 'l': null, 'ñ': null,
  'z': null, 'x': null, 'c': null, 'v': null, 'b': null, 'n': null, 'm': null, ',': null, '.': null, '-': null,
};

const PRESETS = [];

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
  z: { note: 5, pitch: 1, name: 'C' },
  s: { note: 6, pitch: 1, name: 'C♯/D♭' },
  x: { note: 7, pitch: 1, name: 'D' },
  d: { note: 8, pitch: 1, name: 'D♯/E♭' },
  c: { note: 9, pitch: 1, name: 'E' },
  v: { note: 10, pitch: 1, name: 'F' },
  g: { note: 11, pitch: 1, name: 'F♯/G♭' },
  b: { note: 12, pitch: 1, name: 'G' },
  h: { note: 13, pitch: 1, name: 'G♯/A♭' },
  n: { note: 14, pitch: 1, name: 'A' },
  j: { note: 15, pitch: 1, name: 'A♯/B♭' },
  m: { note: 16, pitch: 1, name: 'B' },
};

class Controller {
  constructor() {
    this._interval = 100;
    this._timers = {};
    this._octave = 3;
    this._preset = 1;
    this._mode = 'KBD';

    const deviceName = `NodeJS ${process.version}`;

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

    keypress(process.stdin);

    const actions = [
      (ch, key) => key && key.name === 'escape' && this.stop(),
      (ch, key) => key && key.name === 'space' && this.play(),
      (ch, key) => key && key.name === 'tab' && this.toggle(),
      ch => ch === '<' && this._mode === 'KBD' && this.down(),
      ch => ch === '>' && this._mode === 'KBD' && this.up(),
      ch => ch === '<' && this._mode === 'PAD' && this.left(),
      ch => ch === '>' && this._mode === 'PAD' && this.right(),
    ];

    process.stdin.on('keypress', (ch, key) => {
      if (key && key.ctrl && key.name === 'c') {
        this.ln(this.format('OFF', 2), '\n');
        process.stdin.pause();
        process.exit();
      } else {
        let done;

        actions.some(cb => {
          done = cb(ch, key, this);
          return done;
        });

        if (done !== true) {
          if (this._mode === 'PAD' && MAPPINGS[ch]) {
            done = this.push(MAPPINGS[ch]);
          }

          if (this._mode === 'KBD' && NOTES[ch]) {
            done = this.send(NOTES[ch]);
          }

          if (done !== true) {
            console.log(ch, key);
          }
        }
      }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
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

    this.ln(`${this.format(this._mode, 4)}${this.pad(offset)}${label}`);
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

  up() {
    this._octave = Math.min(8, this._octave + 1);
    this.render();
    return true;
  }

  down() {
    this._octave = Math.max(1, this._octave - 1);
    this.render();
    return true;
  }

  left() {
    this._preset = Math.max(1, this._preset - 1);
    this.render();
    return true;
  }

  right() {
    this._preset = Math.min(10, this._preset + 1);
    this.render();
    return true;
  }

  stop() {
    this.out.send('sysex', [240, 127, 127, 6, 1, 247]);
    return true;
  }

  play() {
    this.out.send('sysex', [240, 127, 127, 6, 2, 247]);
    return true;
  }

  push() {
    console.log('MAPPINGS');
    return true;
  }

  // FIXME: try supporting keydown/keyup with https://github.com/wilix-team/iohook for real pressure?
  send(ch) {
    this.render(ch.name);

    const fixedNote = ch.note + (12 * (this._octave - 1));

    this.out.send('noteon', {
      note: fixedNote,
      velocity: 90,
      channel: 0
    });

    clearTimeout(this._timers[ch.name]);
    this._timers[ch.name] = setTimeout(() => {
      clearTimeout(this._timers[ch.name]);
      this.render();

      this.out.send('noteoff', {
        note: fixedNote,
        velocity: 90,
        channel: 0
      });
    }, this._interval);

    return true;
  }
}

const ctrl = new Controller();

ctrl.render();
