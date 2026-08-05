// audio-manifest.js
//
// The only file you edit to add audio. Drop a file into public/audio/ and add
// a line here. Nothing else in the codebase needs to change.
//
// Format: OGG is preferred — it loops cleanly and is well compressed. MP3
// carries decoder-inserted padding that breaks seamless loops. Safari's OGG
// support is recent, so list an mp3 fallback if that matters to you: any entry
// can be an array of paths and the first one that decodes wins.

export const AUDIO_MANIFEST = {

    // Ambient tracks. Played one after another with a fade between them,
    // shuffled by default. Add as many as you like.
    music: [
        'audio/music/ambient-01.ogg'
    ],

    // Plays when the eye reveals itself. Loops until the run ends.
    chase: 'audio/music/chase.ogg',

    // One-shots, triggered by name from game code.
    // An array means "pick one at random" — use it for anything that repeats
    // often, or the ear starts hearing the loop. Footsteps especially.
    sfx: {
        footstep:        ['audio/sfx/step-01.ogg', 'audio/sfx/step-02.ogg',
                          'audio/sfx/step-03.ogg', 'audio/sfx/step-04.ogg'],
        footstep_water:  ['audio/sfx/step-water-01.ogg', 'audio/sfx/step-water-02.ogg'],
        splash_in:       'audio/sfx/splash-in.ogg',
        splash_out:      'audio/sfx/splash-out.ogg',
        swim:            ['audio/sfx/swim-01.ogg', 'audio/sfx/swim-02.ogg'],
        collect:         'audio/sfx/collect.ogg',
        collect_final:   'audio/sfx/collect-final.ogg',
        puzzle_solved:   'audio/sfx/puzzle-solved.ogg',
        elevator_open:   'audio/sfx/elevator-open.ogg',
        elevator_close:  'audio/sfx/elevator-close.ogg',
        elevator_move:   'audio/sfx/elevator-move.ogg',
        jump:            'audio/sfx/jump.ogg',
        land:            'audio/sfx/land.ogg',
        eye_reveal:      'audio/sfx/eye-reveal.ogg'
    },

    // Looping positional sources, started once and left running.
    // position is [x, y, z] in world units.
    ambience: {
        pool_surface: { file: 'audio/ambience/water-loop.ogg', position: [0, 0, 0], refDistance: 120, volume: 0.5 }
    }
};

export const AUDIO_SETTINGS = {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.9,
    trackFadeSeconds: 3.0,     // fade in/out between ambient tracks
    gapBetweenTracks: 2.0,     // silence between them
    chaseFadeSeconds: 1.5,
    shuffleMusic: true
};