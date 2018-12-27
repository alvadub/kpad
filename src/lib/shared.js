const CC_LENGTH = 16;
const CC_MAX = 40;

const CC_MUTE = 0;
const CC_SOLO = 16;
const CC_SEND1 = 32;
const CC_SEND2 = 48;

// FIXME: MIDI(186,64,64) + noteon causes bug
const CC_VOLUME = 65;
const CC_CONTROL = 81;
const CC_PLAYBACK = 121;
const CC_TRANSPORT = 122;

export default {
  CC_LENGTH,
  CC_MAX,
  CC_MUTE,
  CC_SOLO,
  CC_SEND1,
  CC_SEND2,
  CC_VOLUME,
  CC_CONTROL,
  CC_PLAYBACK,
  CC_TRANSPORT,
};
