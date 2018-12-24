loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);
host.defineController('Generic', 'kPad', '1.0', 'F3CFFC62-4B9E-4703-91EC-6741E3419572');
host.defineMidiPorts(1, 1);

const kPad = {
  // state: {},
};

// FIXME: this can be generated?
const CTRL_ACTIONS = {
  f0657363617065f7: function () { this.transport.stop(); },
  f07370616365f7: function () { this.transport.play(); },
  f070726576f7: function () { this.cursorTrack.selectPrevious(); },
  f06e657874f7: function () { this.cursorTrack.selectNext(); },
};

function log(msg) {
  host.showPopupNotification('kPad - ' + msg);
  println(msg);
}

function init() {
  host.getMidiInPort(0).setMidiCallback(onMidi);
  host.getMidiInPort(0).setSysexCallback(onSysex);
  host.getMidiInPort(0).createNoteInput('', '??????').setShouldConsumeEvents(false);

  kPad.transport = host.createTransport();
  kPad.trackBank = host.createTrackBank(16, 2, 8);
  kPad.cursorTrack = host.createCursorTrack(2, 16);

  for (let i = 0; i < 10; i += 1) {
    kPad.trackBank.getChannel(i).getMute().addValueObserver(function (value) {
      sendMidi(186, i, value);
    });

    kPad.trackBank.getChannel(i).getSolo().addValueObserver(function (value) {
      sendMidi(186, i + 10, value);
    });

    // kPad.trackBank.getChannel(i).getSend(0).addValueObserver(function (value) {
    //   sendMidi(186, i + 20, value);
    // });
  }
}

function onMidi(status, data1, data2) {
  if (status === 186) {
    if (data1 <= 10) {
      kPad.trackBank.getChannel(data1 - 1).getMute().set(!(data2 > 0));
    } else {
      println('CC: ' + data1 + ', ' + data2);
    }
  } else {
    println(status + ',' + data1 + ',' + data2);
  }
}

function onSysex(data) {
  // if (data.indexOf('f07b') === 0 && data.lastIndexOf('7df7') === data.length - 4) {
  //   const chars = data.split('');
  //   const couples = [];

  //   for (let i = 2; i < chars.length - 2; i += 2) {
  //     couples.push(String.fromCharCode(parseInt('0x' + chars[i] + chars[i + 1])));
  //   }

  //   var data;

  //   try {
  //     data = JSON.parse(couples.join(''));
  //   } catch (e) {}

  //   Object.keys(data).forEach(function (key) {
  //     kPad.state[key] = data[key];
  //   });

  //   log('state synced');
  //   return;
  // }

  if (CTRL_ACTIONS[data]) {
    CTRL_ACTIONS[data].call(kPad);
  } else {
    println(data);
  }
}

function exit()
{
}
