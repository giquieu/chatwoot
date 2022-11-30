/**
 * Created by intelWorx on 27/10/2015.
 */
(function() {
  // eslint-disable-next-line no-undef
  importScripts('/packs/lame.min.js');

  let mp3Encoder;
  let maxSamples = 1152;
  let samplesMono;
  let config;
  let dataBuffer;

  let clearBuffer = function() {
    dataBuffer = [];
  };

  let appendToBuffer = function(mp3Buf) {
    dataBuffer.push(new Int8Array(mp3Buf));
  };

  let init = function(prefConfig) {
    config = prefConfig || { debug: true };
    // eslint-disable-next-line no-undef
    mp3Encoder = new lamejs.Mp3Encoder(
      1,
      config.sampleRate || 44100,
      config.bitRate || 128
    );
    clearBuffer();
  };

  let floatTo16BitPCM = function floatTo16BitPCM(input, output) {
    // var offset = 0;
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  };

  let convertBuffer = function(arrayBuffer) {
    let data = new Float32Array(arrayBuffer);
    let out = new Int16Array(arrayBuffer.length);
    floatTo16BitPCM(data, out);
    return out;
  };

  let encode = function(arrayBuffer) {
    samplesMono = convertBuffer(arrayBuffer);
    let remaining = samplesMono.length;
    for (let i = 0; remaining >= 0; i += maxSamples) {
      let left = samplesMono.subarray(i, i + maxSamples);
      let mp3buf = mp3Encoder.encodeBuffer(left);
      appendToBuffer(mp3buf);
      remaining -= maxSamples;
    }
  };

  let finish = function() {
    appendToBuffer(mp3Encoder.flush());
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      cmd: 'end',
      buf: dataBuffer,
    });
    clearBuffer(); // free up memory
  };

  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function(e) {
    // eslint-disable-next-line default-case
    switch (e.data.cmd) {
      case 'init':
        init(e.data.config);
        break;

      case 'encode':
        encode(e.data.buf);
        break;

      case 'finish':
        finish();
        break;
    }
  };
})();
