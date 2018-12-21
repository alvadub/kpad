loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);

host.defineController('Generic', 'kPad', '1.0', 'F3CFFC62-4B9E-4703-91EC-6741E3419572');
host.defineMidiPorts(1, 0);

const kPad = {
  state: {},
};

// FIXME: this can be generated?
const CTRL_ACTIONS = {
  f072657475726ef7: function () { kPad.transport.play(); },
  f06261636b7370616365f7: function () { kPad.transport.stop(); },
};

function log(msg) {
  host.showPopupNotification('kPad - ' + msg);
  println(msg);
}

function init() {
  host.getMidiInPort(0).setMidiCallback(onMidi);
  host.getMidiInPort(0).setSysexCallback(onSysex);

  generic = host.getMidiInPort(0).createNoteInput('', '??????');
  generic.setShouldConsumeEvents(false);

  kPad.transport = host.createTransport();
}

function onMidi(status, data1, data2) {
  println(status + ',' + data1 + ',' + data2);
}

function onSysex(data) {
  if (data.indexOf('f07b') === 0 && data.lastIndexOf('7df7') === data.length - 4) {
    const chars = data.split('');
    const couples = [];

    for (let i = 2; i < chars.length - 2; i += 2) {
      couples.push(String.fromCharCode(parseInt('0x' + chars[i] + chars[i + 1])));
    }

    var data;

    try {
      data = JSON.parse(couples.join(''));
    } catch (e) {}

    Object.keys(data).forEach(function (key) {
      kPad.state[key] = data[key];
    });

    log('state synced');
    return;
  }

  if (CTRL_ACTIONS[data]) {
    CTRL_ACTIONS[data]();
  } else {
    println(data);
  }
}

function exit()
{
}