import { AssetsManifest } from 'pixi.js';

export const manifest: AssetsManifest = {
    bundles: [
        {
            name: "backgrounds",
            assets:
            {
                "Room": "./background/room.jpeg",
                "Room-Night": "./background/room-night.jpg",
                "Stage": "./background/stage.png"
            }
        },

        {
            name: "characters",
            assets:
            {
                "Buck-hd-ec": "./character/buck-hd-ec.png",
                "Buck-hd-ec-s": "./character/buck-hd-ec-s.png",
                "Buck-hd-eh": "./character/buck-hd-eh.png",
                "Buck-hd-eh-s": "./character/buck-hd-eh-s.png",
                "Buck-hd-eo": "./character/buck-hd-eo.png",
                "Buck-hd-ey-s": "./character/buck-hd-ey-s.png",
                "Buck-hu-ec": "./character/buck-hu-ec.png",
                "Buck-hu-ec-s": "./character/buck-hu-ec-s.png",
                "Buck-hu-eh": "./character/buck-hu-eh.png",
                "Buck-hu-eh-s": "./character/buck-hu-eh-s.png",
                "Buck-hu-eo": "./character/buck-hu-eo.png",
                "Buck-hu-eo-s": "./character/buck-hu-eo-s.png"
            }
        },

        {
            name: "objects",
            assets:
            {
                "Amplifier": "./objects/amplifier.png",
                "Guitar": "./objects/guitar.png",
                "Clock_Morning": "./objects/clock-morning.png",
                "Clock_Transition1": "./objects/clock-transition1.png",
                "Clock_Transition2": "./objects/clock-transition2.png",
                "Clock_Night": "./objects/clock-night.png",
                "Switch-On": "./objects/switch-on.png",
                "Switch-Off": "./objects/switch-off.png"
            }
        },

        {
            name: "ui",
            assets:
            {
                Radio: "./ui/radio.png",
                Radio_off: "./ui/radio-off.png",
                UI_Player: "./ui/ui-player.png",
                Now_Playing_Bar: "./ui/nowPlayingBar.png"
            }
        },

        {
            name: "fx",
            assets:
            {
                Notes_1: "./fx/notes1.png",
                Notes_2: "./fx/notes2.png",
                NoteHitParticle: "./fx/particle.png",
                Fire: "./fx/fire.png"
            }
        },

        {
            name: "fonts",
            assets:
            {
                RedeemGold: "./fonts/RedeemGold.ttf",
                RulerGold: "./fonts/RulerGold.ttf",
                SinsGold: "./fonts/SinsGold.ttf",
            }
        },

        {
            name: "spritesheet",
            assets:
            {
                Spritesheet: "./spritesheet/textures.json"
            }
        }
    ]
}

/* KNOWN Bugs
 - PixelifySans won't load because there seems to be no parser for it.
   [Assets] https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap could not be loaded as we don't know how to parse it, ensure the correct parser has been added
*/