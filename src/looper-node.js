// The code below is based on PlaybackPositionNode:
// https://github.com/kurtsmurf/whirly/blob/master/src/PlaybackPositionNode.js
// with additional modifications from this thread:
// https://github.com/WebAudio/web-audio-api/issues/2397#issuecomment-459514360
//
// It extends AudioBufferSourceNode with a `playbackPosition` property
// to provide accurate tracking of playback position.

export default class LooperNode {
    constructor(context) {
        this.context = context;

        // initialize component audio nodes
        this._bufferSource = new AudioBufferSourceNode(context);
        this._gainNode = new GainNode(context);
        this._splitter = new ChannelSplitterNode(context);
        this._out = new ChannelMergerNode(context);
        this._sampleHolder = new Float32Array(1);
        this._playbackRate = 1.0;
        this._paused = false;
        this._muted = false;
    }

    // get current progress between 0 and 1
    get playbackPosition() {
        this._analyser?.getFloatTimeDomainData(this._sampleHolder);
        return this._sampleHolder[0];
    }

    get duration() {
        return this._bufferSource.buffer.duration;
    }

    set buffer(audioBuffer) {
        // create a new AudioBuffer of the same length as param with one extra channel
        const buffer = new AudioBuffer({
            length: audioBuffer.length,
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels + 1,
        });

        // copy data from the audioBuffer arg to our new AudioBuffer
        for (let index = 0; index < audioBuffer.numberOfChannels; index++) {
            buffer.copyToChannel(audioBuffer.getChannelData(index), index);
        }

        // fill up the position channel with numbers from 0 to 1
        // most performant implementation to create the big array is via "for"
        // https://stackoverflow.com/a/53029824
        const length = audioBuffer.length;
        const timeDataArray = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            timeDataArray[i] = i / length;
        }
        buffer.copyToChannel(timeDataArray, audioBuffer.numberOfChannels);

        // assign the buffer to buffer source
        this._bufferSource.buffer = buffer;

        // split the channels
        this._bufferSource.connect(this._splitter);

        // connect all the audio channels to the line out
        for (let index = 0; index < audioBuffer.numberOfChannels; index++) {
            this._splitter.connect(this._out, index, index);
        }

        // connect the position channel to an analyzer so we can extract position data
        this._analyser = new AnalyserNode(this.context);
        this._splitter.connect(this._analyser, audioBuffer.numberOfChannels);

        // Connect output to gain node
        this._out.connect(this._gainNode);
    }

    // forward component node properties

    get loop() {
        return this._bufferSource.loop;
    }

    set loop(val) {
        this._bufferSource.loop = val;
    }

    get loopStart() {
        return this._bufferSource.loopStart;
    }

    set loopStart(loopStartSeconds) {
        this._bufferSource.loopStart = loopStartSeconds;
    }

    get loopEnd() {
        return this._bufferSource.loopEnd;
    }

    set loopEnd(loopEndSeconds) {
        this._bufferSource.loopEnd = loopEndSeconds;
    }

    get playbackRate() {
        return this._playbackRate;
    }

    set playbackRate(newRate) {
        this._playbackRate = newRate;
        const adjustedRate = newRate * !this._paused;
        this._bufferSource.playbackRate.value = adjustedRate;
    }

    get gain() {
        return this._gain;
    }

    set gain(newGain) {
        this._gain = newGain;
        this._gainNode.gain.value = newGain * !this.muted;
    }

    get muted() {
        return this._muted;
    }

    set muted(shouldMute) {
        this._muted = shouldMute;
        this.gain = this.gain;
    }

    start(...args) {
        if (this._paused) {
            this._paused = false;
            this.playbackRate = this.playbackRate;
        } else {
            this._bufferSource.start(...args);
        }
    }

    pause() {
        this._paused = true;
        this.playbackRate = this.playbackRate;
    }

    stop(...args) {
        this._bufferSource.stop(...args);
    }

    connect(...args) {
        this._gainNode.connect(...args);
    }
}
