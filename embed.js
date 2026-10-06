import { canvasRenderer } from "./src/canvas-renderer.js";
import { drawRifffSplat } from "./src/rifff-splat.js";
import {
    fetchRifffData,
    RifffPlayer,
    getLayerColours,
    getRifffWaveform,
    getUserImageUrl,
} from "./src/rifff-entry.js";
import { makeToggleButton } from "./src/ui-helpers.js";

const audioContext = new AudioContext();

const playButton = document.getElementById("play-pause-btn");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const rifffTitle = document.getElementById("rifff-title");
const rifffCoverImg = document.getElementById("cover-image");
const rifffSharedByImg = document.getElementById("shared-by-avatar");
const rifffCreatorLinks = document.getElementById("rifff-creators");
const outputLevelSlider = document.querySelector("#output-level");
const playbackSpeedSlider = document.querySelector("#playback-speed");

const muteButtons = (() => {
    const buttons = [];

    for (let i = 0; i < 8; ++i) {
        const button = document.getElementById("mute-button-" + i);
        buttons.push(makeToggleButton(button));
    }

    return buttons;
})();

// Get a specific parameter
let rifffUrl = "";

const params = new URLSearchParams(window.location.search);

if (params.has("rifffUrl")) {
    rifffUrl = params.get("rifffUrl");
} else if (params.has("rifffId")) {
    rifffUrl = "https://api.endlesss.fm/api/v3/feed/shared_rifff/" + params.get("rifffId");
}

if (params.get("showLayers") === "false") {
    document.getElementById("footer").style.opacity = 0;
}

if (params.get("showSettings") === "false") {
    document.getElementById("settings-button").style.opacity = 0;
}

if (params.get("theme") !== "dark") {
    document.body.classList.remove("dark");
    document.body.classList.add("light");
} else {
    document.body.classList.remove("light");
    document.body.classList.add("dark");
}

const setImageSrc = (img, src) => {
    img.onload = () => {
        img.style.display = "block";
    };

    img.src = src;
};

const updatePlayButton = (isPlaying) => {
    if (!isPlaying) {
        playIcon.style.display = "inline";
        pauseIcon.style.display = "none";
    } else {
        playIcon.style.display = "none";
        pauseIcon.style.display = "inline";
    }
};

const floatOfEvent = (event) => parseFloat(event.target.value);

const booleanParam = (name, defaultValue = false) => {
    if (!params.has(name)) {
        return defaultValue;
    }

    return params.get(name) === "true";
};

const tapeStartEnabled = booleanParam("tapeStart", false);
const tapeStopEnabled = booleanParam("tapeStop", false);

fetchRifffData(rifffUrl)
    .then(async (sharedRifff) => {
        const player = await RifffPlayer.fromSharedRifff(audioContext, sharedRifff);

        player.connect(audioContext.destination);

        // Set up the analyser for the visualiser.
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        player.connect(analyserNode);

        setImageSrc(rifffCoverImg, sharedRifff.image_url);
        setImageSrc(rifffSharedByImg, getUserImageUrl(sharedRifff));

        rifffTitle.textContent = player.title;
        rifffCreatorLinks.innerHTML = player.creators
            .map((user) => `<a href="https://endlesss.fm/${user}" target="_blank">${user}</a>`)
            .join(", ");

        const layerColours = getLayerColours(player.rifff);

        playbackSpeedSlider.addEventListener("input", (event) => {
            player.setRelativePlaybackRate(floatOfEvent(event));
        });

        outputLevelSlider.addEventListener("input", (event) => {
            player.setOutputLevel(floatOfEvent(event));
        });

        let hasPlayedOnce = false;

        playButton?.addEventListener("click", async () => {
            await audioContext.resume();

            const wasPlaying = player.isPlaying;
            const isPlaying = player.toggle({
                tapeStart: tapeStartEnabled && hasPlayedOnce,
                tapeStop: tapeStopEnabled,
            });

            if (!wasPlaying && isPlaying) {
                hasPlayedOnce = true;
            }

            updatePlayButton(isPlaying);
        });

        muteButtons.forEach((button, index) => {
            const stem = player.stems[index];

            if (!stem) {
                button.style.display = "none";
                return;
            }

            button.on = stem.muted;
            button.color = layerColours[index];

            button.addEventListener("click", () => {
                const muted = !player.stems[index].muted;

                player.setStemMuted(index, muted);
                button.on = muted;
            });
        });

        outputLevelSlider.value = player.outputLevel;

        const canvas = document.querySelector("canvas");
        const renderer = canvasRenderer(canvas, drawRifffSplat);
        const waveform = getRifffWaveform(player.rifff, 200);

        const animate = () => {
            analyserNode.getByteFrequencyData(dataArray);

            const averageFrequency =
                dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const scale = 0.25 + (averageFrequency / 255) * 1.5;

            renderer.draw(waveform, {
                time: player.getPlaybackPosition(),
                rms: scale,
                noiseAmt: player.isPlaying,
                fillColour: layerColours[0],
            });

            player.stems.forEach((stem, index) => {
                const amp = player.getStemAmplitude(index);

                if (muteButtons[index]) {
                    muteButtons[index].style.opacity = 0.8 + amp * 2;
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    });
