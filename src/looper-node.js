// The code below is based on PlaybackPositionNode:
// https://github.com/kurtsmurf/whirly/blob/master/src/PlaybackPositionNode.js
// with additional modifications from this thread:
// https://github.com/WebAudio/web-audio-api/issues/2397#issuecomment-459514360
//
// It extends AudioBufferSourceNode with a `playbackPosition` property
// to provide accurate tracking of playback position.

const DEFAULT_GAIN_RAMP_TIME_SECONDS = 0.02;
const DEFAULT_PLAYBACK_RATE_RAMP_TIME_SECONDS = 0.03;

export default class LooperNode {
    constructor(context, {
        gainRampTime = DEFAULT_GAIN_RAMP_TIME_SECONDS,
        playbackRateRampTime = DEFAULT_PLAYBACK_RATE_RAMP_TIME_SECONDS,
    } = {}) {
        this.context = context;

        // initialize component audio nodes
        this._bufferSource = new AudioBufferSourceNode(context);
        this._gainNode = new GainNode(context);
        this._splitter = new ChannelSplitterNode(context);
        this._out = new ChannelMergerNode(context);
        this._sampleHolder = new Float32Array(1);
        this._playbackRate = 1.0;
        this._gain = 1.0;
        this._paused = false;
        this._muted = false;
        this._gainRampTime = gainRampTime;
        this._playbackRateRampTime = playbackRateRampTime;
        this._started = false;
    }

    // get current progress between 0 and 1
    get playbackPosition() {
        this._analyser?.getFloatTimeDomainData(this._sampleHolder);
        return this._sampleHolder[0];
    }

    // get current progress through the active loop region between 0 and 1
    get loopPlaybackPosition() {
        const rawPosition = this.playbackPosition;
        const rawSeconds = rawPosition * this.duration;
        const loopStart = this.loopStart;
        const loopEnd = this.loopEnd || this.duration;
        const loopDuration = loopEnd - loopStart;

        if (!Number.isFinite(loopDuration) || loopDuration <= 0) {
            return 0;
        }

        const loopPosition = (rawSeconds - loopStart) / loopDuration;

        return ((loopPosition % 1) + 1) % 1;
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
        this.rampPlaybackRateTo(newRate * !this._paused, this._playbackRateRampTime);
    }

    rampPlaybackRateTo(newRate, rampTime = this._playbackRateRampTime) {
        const now = this.context.currentTime;
        const playbackRate = this._bufferSource.playbackRate;

        playbackRate.cancelScheduledValues(now);
        playbackRate.setValueAtTime(playbackRate.value, now);
        playbackRate.linearRampToValueAtTime(newRate, now + rampTime);
    }

    get gain() {
        return this._gain;
    }

    set gain(newGain) {
        this._gain = newGain;
        this.rampOutputGainTo(newGain * !this.muted, this._gainRampTime);
    }

    rampOutputGainTo(newGain, rampTime = this._gainRampTime) {
        const now = this.context.currentTime;
        const gain = this._gainNode.gain;

        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(newGain, now + rampTime);
    }

    get muted() {
        return this._muted;
    }

    set muted(shouldMute) {
        this._muted = shouldMute;
        this.rampOutputGainTo(this.gain * !this.muted, this._gainRampTime);
    }

    start(...args) {
        if (this._paused) {
            this._paused = false;
            this.rampPlaybackRateTo(this.playbackRate, this._playbackRateRampTime);
        } else if (!this._started) {
            this._started = true;
            this._bufferSource.start(...args);
        }
    }

    pause({
              rampTime = this._playbackRateRampTime,
          } = {}) {
        this._paused = true;
        this.rampPlaybackRateTo(0, rampTime);
    }

    resume({
               rampTime = this._playbackRateRampTime,
           } = {}) {
        this._paused = false;
        this.rampPlaybackRateTo(this.playbackRate, rampTime);
    }

    stop(...args) {
        this._bufferSource.stop(...args);
    }

    connect(...args) {
        this._gainNode.connect(...args);
    }

    disconnect(...args) {
        this._gainNode.disconnect(...args);
    }
}
