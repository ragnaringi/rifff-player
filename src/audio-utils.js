
export const trimBuffer = (audioContext, originalBuffer, newLength) => {
    if (originalBuffer.length == newLength) {
        // Do nothing, just return the original buffer
        return originalBuffer;
    }
    // Make sure the new length is not longer than the original length
    newLength = Math.min(newLength, originalBuffer.length);

    // Create a new buffer with the same number of channels and sample rate
    const newBuffer = audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        newLength,  // new length in samples
        audioContext.sampleRate
    );

    // For each channel, copy the data up to the new length
    for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
        const originalData = originalBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);

        // Copy data from original buffer to new buffer, up to the new length
        for (let i = 0; i < newBuffer.length; i++) {
            newData[i] = originalData[i];
        }
    }

    return newBuffer;
}

export const trimBuffers = (audioContext, originalBuffers, newLengths) => {
    console.assert(originalBuffers.length == newLengths.length);
    return originalBuffers.map(buffer => {
        return trimBuffer(audioContext, buffer, newLengths[originalBuffers.indexOf(buffer)]);
    })
};