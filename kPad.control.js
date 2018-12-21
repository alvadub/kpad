loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);

host.defineController('Generic', 'kPad', '1.0', 'F3CFFC62-4B9E-4703-91EC-6741E3419572');
host.defineMidiPorts(1, 0);

const LOWEST_CC = 1;
const HIGHEST_CC = 119;

// FIXME: this can be generated?
const CTRL_ACTIONS = {
  f072657475726ef7: function () { transport.play(); },
  f06261636b7370616365f7: function () { transport.stop(); },
};

function init() {
   host.getMidiInPort(0).setMidiCallback(onMidi);
   host.getMidiInPort(0).setSysexCallback(onSysex);

   generic = host.getMidiInPort(0).createNoteInput('', '??????');
   generic.setShouldConsumeEvents(false);

   transport = host.createTransport();
}

function onMidi(status, data1, data2) {
  println(status + ',' + data1 + ',' + data2);
}

function onSysex(data) {
  if (CTRL_ACTIONS[data]) {
    CTRL_ACTIONS[data]();
  } else {
    println(data);
  }
}

function exit()
{
}
