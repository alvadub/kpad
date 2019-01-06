import {
  CC_CONTROL,
  CC_PLAYBACK,
  CC_TRANSPORT,
  NOTES,
  MODES,
  TYPES,
  ACTIONS,
  MAPPINGS,
  getType,
  print,
  clr,
  format,
  padding,
  dpads,
  dfadr,
  dsel,
  dchars,
} from './lib/shared';

class Controller {
  constructor({ keypress, easymidi }) {
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
      const [key, ...value] = msg.bytes.slice(1, msg.bytes.length - 1).map(x => {
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
      if (msg.controller === CC_PLAYBACK) {
        this._playing = msg.value > 64;
      } else {
        this.set(...getType(msg));
      }

      this.update();
    });

    keypress(process.stdin);

    process.stdin.on('keypress', (ch, key) => {
      if (key && key.ctrl && key.name === 'c') {
        clr();

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

    // FIXME: memoize render helpers
    this.getLevel = (type, mode) => x => {
      if (this.get(type, x)) {
        const ch = ' ▁▂▃▄▅▆▇████'.substr(Math.floor(((this.get(type, x) / 127) * 100) / 10), 1);

        if (this._mode !== mode) return format(ch, 2);

        return ch;
      }
    };

    this.getValue = x => {
      if (this._connected) {
        if (this.get('Solo', x) > 64) return format(this._mode === 'P' ? '◆' : '◇', 33);
        if (!(this.get('Mute', x) > 64)) return format(this._mode === 'P' ? '◆' : '◇', 32);
      }
    };

    this.getState = offset => x => {
      const char = MAPPINGS.map(v => v[0])[(offset + x) - 80];
      if (this._enabled[char]) return format('▒', 34);
    };

    this.getPressed = chars => dchars(chars, ' ', this._mode === 'K', this._pressed);
    this.getFader = (key, group, selected) => `${dfadr(16, this.getLevel(key, group))} ${selected}`;
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

  render(value) {
    const suffix = this._offset ? `\x1B[${this._offset}C` : '';
    const label = padding(-1, format(MODES[this._offset][1], 2), 23);

    let symbol = '⏏';
    let length = 9;

    if (this._connected) {
      symbol = `❚${this._playing ? '►' : '❚'}`;
      length -= 1;
    }

    value = value
      ? format(padding(0, value, length), '30;43')
      : padding(0, '', length);

    const status = format(`${symbol} ESC`, this._pressed.ESCAPE ? 1 : 2);
    const octave = format(`${this._octave}♪`, this._mode !== 'K' ? 2 : 1);
    const master = format(`${padding(-1, Math.round((this._master / 127) * 100), 4)}%`, this._mode !== 'K' ? 2 : 1);

    const name = this._state.Name
      ? format(this._state.Name[this._active - 1], this._mode === 'K' ? 2 : 1)
      : '';

    const info = `  ${status} ${value} ${octave} ${master}  ${name}`;

    print(MODES.map((x, k) => (this._offset !== k ? format(x[0], 2) : x[0])).join('') + label + info, '\n');

    const pads = format('P', this._mode === 'P' ? 1 : 2);
    const send1 = format('1', this._mode === '1' ? 1 : 2);
    const send2 = format('2', this._mode === '2' ? 1 : 2);
    const volume = format('V', this._mode === 'V' ? 1 : 2);

    // FIXME: try to render one line at-once only?
    print(`${dpads(10, '░', this.getState(80))}  ${this.getPressed('1234567890')}     ${this.getFader('Send2', '2', send2)}`, '\n');
    print(`${dpads(10, '░', this.getState(90))}   ${this.getPressed('QWERTYUIOP')}    ${this.getFader('Send1', '1', send1)}`, '\n');
    print(`${dpads(10, '░', this.getState(100))}    ${this.getPressed('ASDFGHJKLÑ')}   ${this.getFader('Volume', 'V', volume)}`, '\n');
    print(`${dpads(10, '░', this.getState(110))}   ${this.getPressed('<ZXCVBNM,.-')}  ${dpads(16, '◇', this.getValue)} ${pads}`, '\n');
    print(`${format(padding(1, this._message || '', 45), 1)} ${dsel(16, this._active - 1, this._mode !== 'K')}`, `\x1B[5A\r${suffix}`);

    return true;
  }

  update(ms, clear) {
    clearTimeout(this._render);
    this._render = setTimeout(() => {
      if (clear) clear();
      this.render();
    }, ms || 50);
  }

  set(name, index, value) {
    if (!this._state[name]) {
      this._state[name] = [];
    }

    if (name !== 'Name') {
      if (name === 'Mute' || name === 'Solo') {
        this.log(`${name} #${index + 1} ${value > 64 ? 'ON' : 'OFF'}`);
      } else {
        this.log(`${name} #${index + 1} ${Math.round((value / 127) * 100)}%`);
      }
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
    this.sendCC(CC_PLAYBACK, 127);
    return true;
  }

  stop() {
    if (this._playing) this.log('STOP');
    this.sendCC(CC_PLAYBACK, 0);
    return true;
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

  tap(ch) {
    const found = MAPPINGS.find(x => x[0] === ch);

    if (this._mode !== 'K' && found) {
      this.sendCC((CC_CONTROL + found[1].index) - 1, this._enabled[ch] ? 127 : 0);
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
      this.sendCC(CC_TRANSPORT, 0);
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
      this.sendCC(CC_TRANSPORT, 127);
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

    this.set(type, index, fixedValue);
    this.sendCC(TYPES.find(x => x[0] === type)[1] + index, fixedValue);

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
