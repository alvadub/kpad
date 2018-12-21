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
//  `--left/right presets ()
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

const NOTES = {
  z: { note: 41, pitch: 1, name: 'C' },
  s: { note: 42, pitch: 1, name: 'C♯/D♭' },
  x: { note: 43, pitch: 1, name: 'D' },
  d: { note: 44, pitch: 1, name: 'D♯/E♭' },
  c: { note: 45, pitch: 1, name: 'E' },
  v: { note: 46, pitch: 1, name: 'F' },
  g: { note: 47, pitch: 1, name: 'F♯/G♭' },
  b: { note: 48, pitch: 1, name: 'G' },
  h: { note: 49, pitch: 1, name: 'G♯/A♭' },
  n: { note: 50, pitch: 1, name: 'A' },
  j: { note: 51, pitch: 1, name: 'A♯/B♭' },
  m: { note: 52, pitch: 1, name: 'B' },
};

const ACTIONS = [
  (ch, key, ctrl) => key.name === 'escape' && ctrl.stop(),
  (ch, key, ctrl) => key.name === 'space' && ctrl.play(),
  (ch, key, ctrl) => key.name === 'tab' && ctrl.toggle(),
];

class Controller {
  constructor() {
    this._interval = 100;
    this._timers = {};
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

    process.stdin.on('keypress', (ch, key) => {
      if (key) {
        if (key.ctrl && key.name === 'c') {
          process.stdin.pause();
          process.exit();
        } else {
          let done;

          ACTIONS.some(cb => {
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
      }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  render(value) {
    process.stdout.write(`\r${this._mode}${value ? `\u001b[30;43m${value}\u001b[0m` : ''}\x1b[K`);
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

  stop() {
    console.log('STOP');
    return true;
  }

  play() {
    console.log('PLAY/PAUSE');
    return true;
  }

  push() {
    console.log('MAPPINGS');
    return true;
  }

  send(ch) {
    this.render(ch.name);

    this.out.send('noteon', {
      note: ch.note,
      velocity: 127,
      channel: 0
    });

    clearTimeout(this._timers[ch.name]);
    this._timers[ch.name] = setTimeout(() => {
      clearTimeout(this._timers[ch.name]);
      this.render();

      this.out.send('noteoff', {
        note: ch.note,
        velocity: 127,
        channel: 0
      });
    }, this._interval);

    return true;
  }
}

const ctrl = new Controller();

ctrl.render();
