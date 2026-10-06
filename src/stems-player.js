import LooperNode from "./looper-node.js";

const DEFAULT_ANALYSIS_BUFFER_SIZE = 256;
const DEFAULT_FADE_TIME_SECONDS = 0.1;
const DEFAULT_PARAMETER_RAMP_TIME_SECONDS = 0.02;
const DEFAULT_TAPE_STOP_TIME_SECONDS = 1.0;
const DEFAULT_TAPE_START_TIME_SECONDS = 0.6;

export class StemsPlayer {
    constructor(context, {
        stems = [],
        outputLevel = 0.75,
        analysisBufferSize = DEFAULT_ANALYSIS_BUFFER_SIZE,
        fadeTime = DEFAULT_FADE_TIME_SECONDS,
        parameterRampTime = DEFAULT_PARAMETER_RAMP_TIME_SECONDS,
        tapeStopTime = DEFAULT_TAPE_STOP_TIME_SECONDS,
        tapeStartTime = DEFAULT_TAPE_START_TIME_SECONDS,
    } = {}) {
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = 0;

        this.outputLevel = outputLevel;
        this.fadeTime = fadeTime;
        this.parameterRampTime = parameterRampTime;
        this.tapeStopTime = tapeStopTime;
        this.tapeStartTime = tapeStartTime;
        this.isPlaying = false;
        this.relativePlaybackRate = 1;
        this.analysisBufferSize = analysisBufferSize;
        this.analysisBuffer = new Uint8Array(analysisBufferSize);

        this.stems = [];
        this.players = [];
        this.analyserNodes = [];
        this.basePlaybackRates = [];

        stems.forEach((stem) => this.addStem(stem));
    }

    addStem({
                buffer,
                gain = 1,
                muted = false,
                playbackRate = 1,
                loop = true,
                loopStart = 0,
                loopEnd = buffer?.duration,
            }) {
        if (!buffer) {
            throw new Error("Cannot add a stem without an AudioBuffer.");
        }

        const stem = {
            buffer,
            gain,
            muted,
            playbackRate,
            loop,
            loopStart,
            loopEnd,
        };

        this.stems.push(stem);
        this.basePlaybackRates.push(playbackRate);

        return this._createPlayerForStem(stem);
    }

    _createPlayerForStem(stem) {
        const player = new LooperNode(this.context, {
            gainRampTime: this.parameterRampTime,
            playbackRateRampTime: this.parameterRampTime,
        });
        player.buffer = stem.buffer;
        player.loop = stem.loop;
        player.loopStart = stem.loopStart;
        player.loopEnd = stem.loopEnd;
        player.playbackRate = stem.playbackRate * this.relativePlaybackRate;
        player.gain = stem.gain;
        player.muted = stem.muted;

        const analyser = this.context.createAnalyser();
        analyser.fftSize = this.analysisBufferSize;

        player.connect(analyser);
        player.connect(this.output);

        this.players.push(player);
        this.analyserNodes.push(analyser);

        return player;
    }

    _disconnectPlayers() {
        for (const player of this.players) {
            try {
                player.disconnect();
            } catch {
                // Ignore nodes that are already disconnected.
            }
        }
    }

    _stopPlayers(when) {
        for (const player of this.players) {
            try {
                player.stop(when);
            } catch {
                // Ignore nodes that were never started or have already stopped.
            }
        }
    }

    _rebuildPlayers() {
        this._disconnectPlayers();

        this.players = [];
        this.analyserNodes = [];

        this.stems.forEach((stem) => this._createPlayerForStem(stem));
    }

    connect(destination, ...args) {
        this.output.connect(destination, ...args);
        return destination;
    }

    disconnect(...args) {
        this.output.disconnect(...args);
    }

    play({
             tapeStart = false,
         } = {}) {
        if (this.isPlaying) {
            return;
        }

        for (const player of this.players) {
            player.start();

            if (tapeStart) {
                player.rampPlaybackRateTo(0, 0);
                player.resume({ rampTime: this.tapeStartTime });
            }
        }

        this.isPlaying = true;
        this.fadeTo(this.outputLevel, tapeStart ? this.tapeStartTime : this.fadeTime);
    }

    pause({
              tapeStop = false,
          } = {}) {
        if (!this.isPlaying) {
            return;
        }

        const rampTime = tapeStop ? this.tapeStopTime : this.parameterRampTime;

        for (const player of this.players) {
            player.pause({ rampTime });
        }

        this.isPlaying = false;
        this.fadeTo(0, tapeStop ? this.tapeStopTime : this.fadeTime);
    }

    toggle(options = {}) {
        if (this.isPlaying) {
            this.pause(options);
        } else {
            this.play(options);
        }

        return this.isPlaying;
    }

    stop() {
        const now = this.context.currentTime;
        this._stopPlayers(now);
        this._rebuildPlayers();

        this.isPlaying = false;
        this.output.gain.value = 0;
    }

    fadeTo(gain, rampTime = this.fadeTime) {
        const now = this.context.currentTime;
        this.output.gain.cancelScheduledValues(now);
        this.output.gain.setValueAtTime(this.output.gain.value, now);
        this.output.gain.linearRampToValueAtTime(gain, now + rampTime);
    }

    setOutputLevel(level) {
        this.outputLevel = level;

        if (this.isPlaying) {
            this.fadeTo(level, this.parameterRampTime);
        }
    }

    setRelativePlaybackRate(rate) {
        this.relativePlaybackRate = rate;

        for (let i = 0; i < this.players.length; i++) {
            this.players[i].playbackRate = this.basePlaybackRates[i] * rate;
        }
    }

    setStemMuted(index, muted) {
        const player = this.players[index];

        if (!player) {
            throw new RangeError(`No stem exists at index ${index}.`);
        }

        player.muted = muted;
        this.stems[index].muted = muted;
    }

    setStemGain(index, gain) {
        const player = this.players[index];

        if (!player) {
            throw new RangeError(`No stem exists at index ${index}.`);
        }

        player.gain = gain;
        this.stems[index].gain = gain;
    }

    getStemAmplitude(index) {
        const analyser = this.analyserNodes[index];

        if (!analyser) {
            return 0;
        }

        analyser.getByteTimeDomainData(this.analysisBuffer);

        let sumSquares = 0;

        for (let i = 0; i < this.analysisBuffer.length; i++) {
            const centered = (this.analysisBuffer[i] - 128) / 128;
            sumSquares += centered * centered;
        }

        return Math.sqrt(sumSquares / this.analysisBuffer.length);
    }

    getPlaybackPosition(index = 0) {
        return this.players[index]?.playbackPosition ?? 0;
    }

    get duration() {
        return this.players.reduce((longest, player) => {
            return Math.max(longest, player.duration);
        }, 0);
    }
}