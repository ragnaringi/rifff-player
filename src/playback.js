import { audioContext, loadAudioFiles } from "../src/loader.js";
import { getAudioUrls, getSlotForLoop } from "../src/rifff.js";

const summingNode = audioContext.createGain();
summingNode.connect(audioContext.destination);
summingNode.gain.value = 0;

export { audioContext, summingNode };
export let sharedRifff = undefined;
export let isPlaying = false;
export let loopPlayers = [];
export let analyserNodes = [];
const analysisBufferSize = 256;
const timeDomainData = new Uint8Array(analysisBufferSize);
let relativePlaybackRate = 1.0;
let basePlaybackRates = [];
export let outputLevel = 0.75;

export const setCurrentRifff = (rifff) => {
    sharedRifff = rifff;
    return rifff;
};

export const connectPlayers = (players) => {
    loopPlayers = players;
    return players.map((player) => {
        player.connect(summingNode);
        return player;
    });
};

export const initialisePlayers = (players) => {
    const rifff = sharedRifff.rifff;

    const rifffBps = rifff.state.bps;

    for (const player of players) {
        const index = players.indexOf(player);

        // Set base bpm
        const loop = sharedRifff.loops[index];
        const loopSpeed = loop.bps / rifffBps;
        player.playbackRate = loopSpeed;
        player.loopEnd = loop.length / loop.sampleRate;
        basePlaybackRates.push(loopSpeed);

        // Set gain
        const slot = getSlotForLoop(rifff, loop);
        player.gain = slot.gain;
        player.muted = !slot.on;

        // Create analyser for rms output
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = analysisBufferSize;
        player.connect(analyser);
        analyserNodes.push(analyser);
    }

    return connectPlayers(players);
};

export const fetchAudio = async (sharedRifff) => {
    const fileUrls = getAudioUrls(sharedRifff);
    return loadAudioFiles(fileUrls);
};

export const setRelativePlaybackRate = (rate) => {
    relativePlaybackRate = rate;
    for (let i = 0; i < loopPlayers.length; i++) {
        loopPlayers[i].playbackRate = basePlaybackRates[i] * rate;
    }
};

export const startAll = (players) => {
    for (const player of players) {
        player.start();
    }
};

export const pauseAll = (players) => {
    for (const player of players) {
        player.pause();
    }
};

export const togglePlayback = () => {
    if (!isPlaying) {
        startAll(loopPlayers);
    } else {
        pauseAll(loopPlayers);
    }
    isPlaying = !isPlaying;

    const gain = isPlaying ? outputLevel : 0.0;
    summingNode.gain.value = outputLevel - gain;
    summingNode.gain.linearRampToValueAtTime(
        gain,
        audioContext.currentTime + 0.1
    );
};

export const setOutputLevel = (newLevel) => {
    outputLevel = newLevel;
    if (isPlaying) {
        summingNode.gain.value = newLevel;
    }
};

export const getLoopAmplitude = (index) => {
    const analyser = analyserNodes[index];
    analyser.getByteTimeDomainData(timeDomainData);

    let sumSquares = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        const centered = (timeDomainData[i] - 128) / 128; // convert to [-1, 1]
        sumSquares += centered * centered;
    }

    return Math.sqrt(sumSquares / timeDomainData.length);
};
