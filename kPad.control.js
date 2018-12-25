loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);
host.defineController('Generic', 'kPad', '1.0', 'F3CFFC62-4B9E-4703-91EC-6741E3419572');
host.defineMidiPorts(1, 1);

const kPad = {};

function log(msg) {
  host.showPopupNotification('kPad - ' + msg);
  println(msg);
}

function sendHex(value) {
  const encoded = value.split('').map(function(chunk) {
    return chunk.charCodeAt().toString(16);
  });

  sendSysex('f0' + encoded.join('') + 'f7');
}

function sendState(source, offset) {
  source.addValueObserver(function (value) {
    const level = Math.floor(value * 127);

    sendMidi(186, offset, level);
  });
}

function isCC(data1) { return data1 >= 80 && data1 < 120; }
function isMute(data1) { return data1 < 16; }
function isSolo(data1) { return data1 < 32 && data1 >= 16; }
function isSend1(data1) { return data1 < 48 && data1 >= 32; }
function isSend2(data1) { return data1 < 64 && data1 >= 48; }
function isVolume(data1) { return data1 < 80 && data1 >= 64; }

function init() {
  host.getMidiInPort(0).setMidiCallback(onMidi);
  host.getMidiInPort(0).setSysexCallback(onSysex);
  host.getMidiInPort(0).createNoteInput('', '??????').setShouldConsumeEvents(false);

  kPad.transport = host.createTransport();
  kPad.trackBank = host.createTrackBank(16, 2, 8);
  kPad.cursorTrack = host.createCursorTrack(2, 16);
  // kPad.userControls = host.createUserControls(40);

  // 0-127 = 16 tracks
  // 80 mute/solo/send/volume
  // 40 user-cc
  // 7  transport/etc

  for (let i = 0; i < 16; i += 1) {
    sendState(kPad.trackBank.getChannel(i).getMute(), i);
    sendState(kPad.trackBank.getChannel(i).getSolo(), i + 16);
    sendState(kPad.trackBank.getChannel(i).getSend(0).value(), i + 32);
    sendState(kPad.trackBank.getChannel(i).getSend(1).value(), i + 48);
    sendState(kPad.trackBank.getChannel(i).getVolume().value(), i + 64);
  }

  // FIXME: CC-observers are missing
  // FIXME: track-selection is missing

  for (let k = 0; k < 16; k += 1) {
    kPad.trackBank.getChannel(k).name().addValueObserver(8, '', function (value) {
      sendHex('L' + k + ' ' + value);
    });
  }

  kPad.transport.isPlaying().addValueObserver(function (value) {
    sendMidi(186, 120, value ? 127 : 0);
  });
}

function onMidi(status, data1, data2) {
  if (status === 186) {
    if (isMute(data1)) { kPad.trackBank.getChannel(data1).getMute().set(data2 !== 127) }
    if (isSolo(data1)) { kPad.trackBank.getChannel(data1 - 16).getSolo().set(data2 !== 127); }
    if (isSend1(data1)) { kPad.trackBank.getChannel(data1 - 32).getSend(0).set(data2, 128); }
    if (isSend2(data1)) { kPad.trackBank.getChannel(data1 - 48).getSend(1).set(data2, 128); }
    if (isVolume(data1)) { kPad.trackBank.getChannel(data1 - 64).getVolume().set(data2, 128); }
    if (isCC(data1)) { kPad.userControls.getControl(j).set(data2); }
    if (data1 === 120) {
      if (data2 > 64) { kPad.transport.play(); }
      else { kPad.transport.stop(); }
    }
    if (data1 === 121) {
      if (data2 > 64) { kPad.cursorTrack.selectNext(); }
      else { kPad.cursorTrack.selectPrevious(); }
    }
  } else {
    println(status + ',' + data1 + ',' + data2);
  }
}

// FIXME: try sysex to receive repl-like commands?
function onSysex(data) {
  const chars = data.split('');
  const pairs = [];

  for (let i = 2; i < chars.length - 2; i += 2) {
    pairs.push(String.fromCharCode(parseInt('0x' + chars[i] + chars[i + 1])));
  }

  println(pairs.join(''));
}

function exit()
{
}
