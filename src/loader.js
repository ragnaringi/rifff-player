
export const audioContext = new AudioContext();

// Only initialize the Ogg decoder once
const isOggSupported = (() => {
    const audio = document.createElement("audio");
    return audio.canPlayType("audio/ogg; codecs=vorbis") !== "";
})();

// Decode a raw Ogg Vorbis file
async function decodeOggVorbis(arrayBuffer) {
    const { OggVorbisDecoderWebWorker } = window["ogg-vorbis-decoder"];
    const decoder = new OggVorbisDecoderWebWorker();
    await decoder.ready;

    const result = await decoder.decodeFile(new Uint8Array(arrayBuffer));
    const { channelData, sampleRate } = result;

    const buf = audioContext.createBuffer(
        channelData.length,
        channelData[0].length,
        sampleRate
    );
    channelData.forEach((ch, i) => buf.copyToChannel(ch, i));

    decoder.free();
    return buf;
}

// Decode a fetch Response to AudioBuffer (fallback Ogg support)
export async function decodeResponseToAudioBuffer(response) {
    const arrayBuffer = await response.arrayBuffer();

    // Check if we actually need Ogg decoding
    const type = (response.headers.get("content-type") || "").toLowerCase();
    let isOgg = type.includes("ogg") || type.includes("vorbis");

    // Fallback: sniff first four bytes for "OggS"
    if (!isOgg) {
        const h = new Uint8Array(arrayBuffer, 0, 4);
        isOgg = h[0] === 0x4f && h[1] === 0x67 && h[2] === 0x67 && h[3] === 0x53;
    }

    // Only decode via OggVorbisDecoder if necessary
    if (isOgg && !isOggSupported) {
        return decodeOggVorbis(arrayBuffer);
    } else {
        return audioContext.decodeAudioData(arrayBuffer);
    }
}

// Load single file (fetch + decode)
export const loadAudioBuffer = (filePath) =>
    fetch(filePath).then(decodeResponseToAudioBuffer);

// Load multiple files concurrently
export const loadAudioBuffers = (filePaths) =>
    Promise.all(filePaths.map(loadAudioBuffer));

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
