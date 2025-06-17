
import LooperNode from "./looper-node.js";

export const audioContext = new AudioContext();

export const createLooperNode = (audioBuffer) => {
    const playbackNode = new LooperNode(audioContext);
    playbackNode.buffer = audioBuffer;
    playbackNode.loop = true;
    return playbackNode;
};

export const createPlayers = (audioBuffers) => {
    return audioBuffers.map((audioBuffer) => {
        return createLooperNode(audioBuffer);
    });
};

export const audioBufferOfResponse = (response) =>
    response
        .arrayBuffer()
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer));

export const loadAudio = (filePath) => fetch(filePath).then(audioBufferOfResponse);

export const loadAudioFiles = (filePaths) => {
    const loadPromises = filePaths.map((filePath) => loadAudio(filePath));
    return Promise.all(loadPromises);
};

export const fetchRifffData = (rifffUrl) => {
    const apiUrl = "https://faas-lon1-917a94a7.doserverless.co/api/v1/web/fn-47de0ed6-06e1-4a41-9d1c-f70b0d7ad08e/rifff-player/get-rifff?url=";
    return fetch(apiUrl + rifffUrl)
        .then(response => response.json())
        .then(response => {
            // Check if 'data' exists and is an array, then access the first element
            const result = Array.isArray(response.data) && response.data.length > 0
                ? response.data[0] // First element of the array if 'data' exists
                : response; // If 'data' doesn't exist, return the raw object
            return result;
        })
        .catch(console.error);
}
