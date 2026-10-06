# rifff-player

An embeddable player and reusable Web Audio playback module for Endlesss Rifffs.

## What is it?

`rifff-player` provides:

- `StemsPlayer` — a generic synced multi-stem loop player.
- `RifffPlayer` — an Endlesss Rifff-specific player built on top of `StemsPlayer`.
- An iframe-friendly embed page for sharing Rifffs.

This package is intended for browser environments with Web Audio API support.

## Install

    npm install rifff-player

## Basic StemsPlayer usage

    import { StemsPlayer } from "rifff-player";

    const audioContext = new AudioContext();

    const response = await fetch("/audio/drums.ogg");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);

    const player = new StemsPlayer(audioContext, {
        stems: [
            {
                buffer,
                gain: 1,
                muted: false,
                playbackRate: 1,
                loop: true,
                loopStart: 0,
                loopEnd: buffer.duration,
            },
        ],
    });

    player.connect(audioContext.destination);

    await audioContext.resume();

    player.play();

## Basic RifffPlayer usage

    import {
        RifffPlayer,
        fetchRifffData,
    } from "rifff-player";

    const audioContext = new AudioContext();

    const sharedRifff = await fetchRifffData(
        "https://api.endlesss.fm/api/v3/feed/shared_rifff/41510a10435311ed8a10405df04d7516"
    );

    const player = await RifffPlayer.fromSharedRifff(audioContext, sharedRifff);

    player.connect(audioContext.destination);

    await audioContext.resume();

    player.play();

## Controls

    player.play();
    player.pause();
    player.toggle();
    player.stop();

    player.setOutputLevel(0.75);
    player.setRelativePlaybackRate(1.25);

    player.setStemMuted(0, true);
    player.setStemGain(0, 0.5);

    const amplitude = player.getStemAmplitude(0);
    const position = player.getPlaybackPosition();

Optional tape-style transport effects:

    player.toggle({
        tapeStart: true,
        tapeStop: true,
    });

## Import paths

Root API:

    import {
        LooperNode,
        StemsPlayer,
        RifffPlayer,
        fetchRifffData,
    } from "rifff-player";

Rifff-specific helpers:

    import {
        RifffPlayer,
        fetchRifffData,
        getLayerColours,
        getRifffWaveform,
        getUserImageUrl,
    } from "rifff-player/rifff";

Loader utilities:

    import {
        loadAudioBuffer,
        loadAudioBuffers,
    } from "rifff-player/loader";

## Embed usage

    <iframe
        src="https://your-host.example/rifff-player/embed.html?rifffId=41510a10435311ed8a10405df04d7516"
        title="Rifff Player">
    </iframe>

Useful query parameters:

| Parameter | Values | Description |
| --- | --- | --- |
| `rifffId` | Shared Rifff ID | Loads a Rifff by ID |
| `rifffUrl` | Full Rifff API URL | Loads a Rifff from a full URL |
| `showLayers` | `true`, `false` | Shows or hides layer buttons |
| `showSettings` | `true`, `false` | Shows or hides settings |
| `theme` | `dark`, `light` | Sets the embed theme |
| `tapeStart` | `true`, `false` | Enables tape-start on resume |
| `tapeStop` | `true`, `false` | Enables tape-stop on pause |

Example:

    <iframe
        src="https://your-host.example/rifff-player/embed.html?rifffId=41510a10435311ed8a10405df04d7516&theme=dark&tapeStop=true"
        title="Rifff Player">
    </iframe>

## Local development

    npm install
    npm run check
    npx serve .

Open the local server URL to view the demo.
