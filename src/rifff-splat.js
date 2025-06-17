
export const drawRifffSplat = (ctx, waveformData, { width, height, fillColour = '#00ff00', time = 0, exponent = 0.2, rms = 0.5, maxRadiusIncrease = 20, noiseAmt = 1 }) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(centerX, centerY) - 10;

    // Scale radius based on overall amplitude
    const scaledRadius = baseRadius + rms * maxRadiusIncrease;

    // Calculate playhead angle shifted so time=0 points up (90 degrees)
    let playheadAngle = (time % 1) * 2 * Math.PI;
    playheadAngle = (playheadAngle - Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    const dipWidth = Math.PI / 20; // dip angular width

    ctx.globalAlpha = 0.8;

    ctx.beginPath();

    waveformData.forEach((amp, i) => {
        const t = i / waveformData.length;
        const angle = t * 2 * Math.PI;

        // Noise: gentle sine + jitter
        const sineMod = Math.sin(t * 12 * Math.PI + time * 10);
        const peakFactor = Math.pow(amp, 2);
        const randomMod = (Math.random() - 0.5) * 0.01;
        const noise = 0.15 * sineMod * peakFactor + randomMod;

        // Distance from playhead angle (wrap-around)
        let delta = Math.abs(angle - playheadAngle);
        if (delta > Math.PI) delta = 2 * Math.PI - delta;

        // Dip factor: 0 outside dip, 1 at playhead
        const dipFactor = Math.max(0, 1 - (delta / dipWidth) ** 2);

        // Apply dip to waveform amplitude
        const baseAmp = amp + noise * noiseAmt;
        const clampedAmp = Math.max(baseAmp, 0);
        const modulatedAmp = clampedAmp * (1 - dipFactor);

        // Shape amplitude safely
        const shaped = Math.pow(modulatedAmp, exponent);
    
        // Use scaledRadius here
        const distance = shaped * scaledRadius;

        const x = centerX + distance * Math.cos(angle);
        const y = centerY + distance * Math.sin(angle);

        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });

    ctx.closePath();
    ctx.fillStyle = fillColour;
    ctx.fill();

    ctx.globalAlpha = 1.0;
};
