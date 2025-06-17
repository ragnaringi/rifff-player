export const getAudioAttachments = (sharedRifff) => {
    return sharedRifff.loops
        .map((loop) => loop.cdn_attachments)
        .map((attachment) => attachment.flacAudio || attachment.oggAudio);
};

export const getAudioUrls = (sharedRifff) => {
    return getAudioAttachments(sharedRifff).map((audio) => audio.url);
};

export const getSlots = (rifff) => {
    return rifff.state.playback.map((p) => p.slot.current);
};

export const getSlotForLoop = (rifff, loop) => {
    return getSlots(rifff).find((slot) => {
        return slot && slot.currentLoop === loop._id;
    });
};

export const getUserImageUrl = (sharedRifff) => {
    const cdnUrl = "https://endlesss.ams3.digitaloceanspaces.com/attachments/avatars";
    return cdnUrl + "/" + sharedRifff.user;
};

export const getLayerColours = (rifff) => {
    return rifff.layerColours.map((colour) => {
        let str = "#" + colour.substring(2, colour.length);
        return str;
    });
};

const downsampleMaxPooling = (array, targetLength) => {
    const factor = Math.floor(array.length / targetLength);
    const downsampled = new Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
        const start = i * factor;
        const end = Math.min((i + 1) * factor, array.length);
        const max = Math.max(...array.slice(start, end)); // Take the max of the chunk
        downsampled[i] = max;
    }

    return downsampled;
};

export const getRifffWaveform = (rifff, maxPoints = 100) => {
    const waveform = rifff.peakData;
    return waveform.length <= maxPoints
        ? waveform
        : downsampleMaxPooling(waveform, maxPoints);
};
