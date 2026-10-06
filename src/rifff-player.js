import { loadAudioBuffers } from "./loader.js";
import { getAudioUrls, getSlotForLoop } from "./rifff.js";
import { StemsPlayer } from "./stems-player.js";

export class RifffPlayer extends StemsPlayer {
    static async fromSharedRifff(context, sharedRifff, options = {}) {
        const audioUrls = getAudioUrls(sharedRifff);
        const audioBuffers = await loadAudioBuffers(audioUrls);

        return new RifffPlayer(context, sharedRifff, audioBuffers, options);
    }

    constructor(context, sharedRifff, audioBuffers, options = {}) {
        const stems = RifffPlayer.createStemsFromRifff(sharedRifff, audioBuffers);

        super(context, {
            ...options,
            stems,
        });

        this.sharedRifff = sharedRifff;
        this.rifff = sharedRifff.rifff;
        this.loops = sharedRifff.loops;
    }

    static createStemsFromRifff(sharedRifff, audioBuffers) {
        const rifff = sharedRifff.rifff;
        const rifffBps = rifff.state.bps;

        return sharedRifff.loops.map((loop, index) => {
            const slot = getSlotForLoop(rifff, loop);
            const buffer = audioBuffers[index];

            return {
                buffer,
                gain: slot?.gain ?? 1,
                muted: !(slot?.on ?? true),
                playbackRate: loop.bps / rifffBps,
                loopEnd: loop.length / loop.sampleRate,
            };
        });
    }

    get title() {
        return this.sharedRifff.title;
    }

    get creators() {
        return this.sharedRifff.creators;
    }

    get layerColours() {
        return this.rifff.layerColours;
    }

    get waveform() {
        return this.rifff.peakData;
    }
}
