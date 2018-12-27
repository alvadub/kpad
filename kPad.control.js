loadAPI(2);
host.setShouldFailOnDeprecatedUse(true);
host.defineController('Generic', 'kPad', '1.0', 'F3CFFC62-4B9E-4703-91EC-6741E3419572');
host.defineMidiPorts(1, 1);

const kPad = {};

const CC_CHANNEL = 186;
const CC_LENGTH = 16;
const CC_MAX = 40;

const CC_MUTE = 0;
const CC_SOLO = 16;
const CC_SEND1 = 32;
const CC_SEND2 = 48;
const CC_VOLUME = 65;
const CC_CONTROL = 81;
const CC_PLAYBACK = 121;
const CC_TRANSPORT = 122;

function sendHex(value) {
  const encoded = value.split('').map(function(chunk) {
    return chunk.charCodeAt().toString(16);
  });

  sendSysex('f0' + encoded.join('') + 'f7');
}

function sendState(source, offset) {
  source.addValueObserver(function (value) {
    sendMidi(CC_CHANNEL, offset, Math.floor(value * 127));
  });
}

function isOn(data2) { return data2 > 64; }
function isMute(data1) { return data1 >= CC_MUTE && data1 < (CC_MUTE + CC_LENGTH); }
function isSolo(data1) { return data1 >= CC_SOLO && data1 < (CC_SOLO + CC_LENGTH); }
function isSend1(data1) { return data1 >= CC_SEND1 && data1 < (CC_SEND1 + CC_LENGTH); }
function isSend2(data1) { return data1 >= CC_SEND2 && data1 < (CC_SEND2 + CC_LENGTH); }
function isVolume(data1) { return data1 >= CC_VOLUME && data1 < (CC_VOLUME + CC_LENGTH); }
function isCC(data1) { return data1 >= CC_CONTROL && data1 < (CC_CONTROL + CC_MAX); }

function init() {
  host.getMidiInPort(0).setMidiCallback(onMidi);
  host.getMidiInPort(0).setSysexCallback(onSysex);
  host.getMidiInPort(0).createNoteInput('', '??????').setShouldConsumeEvents(false);

  kPad.transport = host.createTransport();
  kPad.trackBank = host.createTrackBank(CC_LENGTH, 2, 0);
  kPad.cursorTrack = host.createCursorTrack(2, CC_LENGTH);
  // kPad.userControls = host.createUserControls(40);

  // 0-127 = 16 tracks
  // 80 mute/solo/send/volume
  // 40 user-cc
  // 7  transport/etc

  for (let i = 0; i < CC_LENGTH; i += 1) {
    sendState(kPad.trackBank.getChannel(i).getMute(), i + CC_MUTE);
    sendState(kPad.trackBank.getChannel(i).getSolo(), i + CC_SOLO);
    sendState(kPad.trackBank.getChannel(i).getSend(0).value(), i + CC_SEND1);
    sendState(kPad.trackBank.getChannel(i).getSend(1).value(), i + CC_SEND2);
    sendState(kPad.trackBank.getChannel(i).getVolume().value(), i + CC_VOLUME);
  }

  // FIXME: CC-observers are missing
  // FIXME: track-selection is missing

  for (let k = 0; k < CC_LENGTH; k += 1) {
    kPad.trackBank.getChannel(k).name().addValueObserver(8, '', function (value) {
      sendHex('L' + k + ' ' + value);
    });
  }

  kPad.transport.isPlaying().addValueObserver(function (value) {
    sendMidi(CC_CHANNEL, CC_PLAYBACK, value ? 127 : 0);
  });
}

function onMidi(status, data1, data2) {
  println(status + ',' + data1 + ',' + data2);

  if (status === CC_CHANNEL) {
    if (isMute(data1)) { kPad.trackBank.getChannel(data1 - CC_MUTE).getMute().set(data2 !== 127) }
    if (isSolo(data1)) { kPad.trackBank.getChannel(data1 - CC_SOLO).getSolo().set(data2 !== 127); }
    if (isSend1(data1)) { kPad.trackBank.getChannel(data1 - CC_SEND1).getSend(0).set(data2, 128); }
    if (isSend2(data1)) { kPad.trackBank.getChannel(data1 - CC_SEND2).getSend(1).set(data2, 128); }
    if (isVolume(data1)) { kPad.trackBank.getChannel(data1 - CC_VOLUME).getVolume().set(data2, 128); }
    if (isCC(data1)) { kPad.userControls.getControl(data1 - CC_CONTROL).set(data2); }
    if (data1 === CC_PLAYBACK) {
      if (isOn(data2)) { kPad.transport.play(); }
      else { kPad.transport.stop(); }
    }
    if (data1 === CC_TRANSPORT) {
      if (isOn(data2)) { kPad.cursorTrack.selectNext(); }
      else { kPad.cursorTrack.selectPrevious(); }
    }
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
