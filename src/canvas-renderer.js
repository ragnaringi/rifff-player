export const canvasRenderer = (canvas, drawFn) => {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
        const logicalWidth = canvas.clientWidth;
        const logicalHeight = canvas.clientHeight;

        if (logicalWidth === 0 || logicalHeight === 0) return; // skip if layout not ready

        // Set pixel buffer size for crisp rendering
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;

        // Set CSS size to match logical dimensions
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;

        // Apply scaling to match logical pixel units
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        lastSize.width = logicalWidth;
        lastSize.height = logicalHeight;
    };

    // Track current size to use in draw
    const lastSize = { width: 0, height: 0 };

    // Setup ResizeObserver to update on layout changes
    const ro = new ResizeObserver(() => {
        resize();
    });
    ro.observe(canvas);

    // Initial resize
    resize();

    return {
        draw: (waveformData, options = {}) => {
            const { width, height } = lastSize;

            if (width === 0 || height === 0) return;

            ctx.clearRect(0, 0, width, height);
            drawFn(ctx, waveformData, {
                ...options,
                width,
                height,
            });
        },
        cleanup: () => ro.disconnect(),
    };
};
