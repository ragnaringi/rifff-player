import { canvasRenderer } from './src/canvas-renderer.js';
import { drawRifffSplat } from "./src/rifff-splat.js";
import { fetchRifffData, createPlayers } from "./src/loader.js";
import {
    audioContext,
    summingNode,
    sharedRifff,
    setCurrentRifff,
    fetchAudio,
    initialisePlayers,
    setRelativePlaybackRate,
    togglePlayback,
    isPlaying,
    loopPlayers,
    getLoopAmplitude,
    outputLevel,
    setOutputLevel,
} from "./src/playback.js";
import { getLayerColours, getRifffWaveform } from "./src/rifff.js";
import { makeToggleButton } from "./src/ui-helpers.js";

// Set up the analyser
const analyserNode = audioContext.createAnalyser();
analyserNode.fftSize = 256;
const bufferLength = analyserNode.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
summingNode.connect(analyserNode);

const playButton = document.getElementById("play-pause-btn");
const rifffTitle = document.getElementById("rifff-title");
const rifffCoverImg = document.getElementById("cover-image");
const rifffSharedByImg = document.getElementById("shared-by-avatar");
const rifffCreatorLinks = document.getElementById("rifff-creators");
const outputLevelSlider = document.querySelector("#output-level");
let longestLooper = null;
const muteButtons = (() => {
    var buttons = [];
    for (var i = 0; i < 8; ++i) {
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

// wire up range slider to playback rate
{
    const floatOfEvent = (e) => parseFloat(e.target.value);

    document
        .querySelector("#playback-speed")
        .addEventListener("input", (e) =>
            setRelativePlaybackRate(floatOfEvent(e))
        );

    outputLevelSlider.addEventListener(
      "input",
      (e) => setOutputLevel(floatOfEvent(e))
    );
}

const playButtonPressed = () => {
    togglePlayback();
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");
    if (!isPlaying) {
        playIcon.style.display = "inline";
        pauseIcon.style.display = "none";
    } else {
        playIcon.style.display = "none";
        pauseIcon.style.display = "inline";
    }
};

const muteButtonClicked = (e) => {
    const button = e.srcElement;
    const index = muteButtons.indexOf(button);
    loopPlayers[index].muted = !loopPlayers[index].muted;
    button.on = loopPlayers[index].muted;
};

fetchRifffData(rifffUrl)
    .then(setCurrentRifff)
    .then(fetchAudio)
    .then(createPlayers)
    .then((players) => {
        initialisePlayers(players);

        longestLooper = players.reduce((prev, current) =>
            prev && prev.duration > current.duration ? prev : current
        );

        rifffCoverImg.src = sharedRifff.image_url;
        rifffSharedByImg.src =
            "https://endlesss.ams3.digitaloceanspaces.com/attachments/avatars/" +
            sharedRifff.user;
        rifffTitle.textContent = sharedRifff.title;
        rifffCreatorLinks.innerHTML = sharedRifff.creators
            .map((user) => `<a href="https://endlesss.fm/${user}">${user}</a>`)
            .join(", ");

        const layerColours = getLayerColours(sharedRifff.rifff);

        playButton?.addEventListener("click", playButtonPressed);
        muteButtons.forEach((button, index) => {
            button.addEventListener("click", muteButtonClicked);
        
            const player = loopPlayers[index];
            if (player) {
                button.on = player.muted;
            } else {
                button.style.display = "none";
            }

            button.color = layerColours[index];
        });

        outputLevelSlider.value = outputLevel;

        const canvas = document.querySelector('canvas');
        const renderer = canvasRenderer(canvas, drawRifffSplat);
        const waveform = getRifffWaveform(sharedRifff.rifff, 200);
        const animate = () => {
            analyserNode.getByteFrequencyData(dataArray);

            const averageFrequency =
                dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const scale = 0.25 + (averageFrequency / 255) * 1.5;
            renderer.draw(waveform, {
                time: longestLooper.playbackPosition,
                rms: scale,
                noiseAmt: isPlaying,
                fillColour: layerColours[0]
            });

            loopPlayers.forEach((looper, index) => {
                const amp = getLoopAmplitude(index);
                muteButtons[index].style.opacity = 0.8 + amp * 2;
                return;
            });

            requestAnimationFrame(animate);
        };

        animate();
    });
