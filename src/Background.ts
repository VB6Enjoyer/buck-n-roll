import { Container, Sprite, Texture, Text, TextStyle } from "pixi.js";
import { sound } from "@pixi/sound";
import { ElectricSwitch } from "./ElectricSwitch";
import { Clock } from "./Clock";
import JSZip from "jszip";

export class Background extends Container {

    private room: Sprite;
    private stage: Sprite;

    private clock: Clock;

    private canClick: boolean = true;
    public lightsOn: boolean = true;

    private content: Container;

    public files: File[] = [];

    private callback: Function;
    private callback2: Function;

    constructor(callback: () => void, callback2: () => void) {
        super();

        // ------------------------------------
        // Initialization of global variables |
        // ------------------------------------
        this.callback = callback;
        this.callback2 = callback2;
        this.files = [];
        this.content = new Container();
        this.room = Sprite.from("Room");
        this.stage = Sprite.from("Stage");
        this.clock = new Clock(
            Texture.from("Clock_Morning"),
            Texture.from("Clock_Transition1"),
            Texture.from("Clock_Transition2"),
            Texture.from("Clock_Night")
        );

        // --------------------------------
        // Declaration of local variables |
        // --------------------------------
        const guitar = Sprite.from("Guitar");
        const electricSwitch = new ElectricSwitch(Texture.from("Switch-On"), Texture.from("Switch-Off"));

        const menuTextStyle = new TextStyle({
            fontSize: 60,
            fill: 0x000000,
            fontFamily: "RulerGold",
        });
        const playText = new Text("Play", menuTextStyle);

        // ---------------------------
        // Setup of global variables |
        // ---------------------------
        this.stage.x = screen.width - 384;
        this.stage.visible = false;
        this.stage.scale.set(0.4799);

        this.clock.on("clockPress", this.onClockClick, this);
        this.clock.scale.set(0.11);
        this.clock.position.set(900, 350);

        this.room.anchor.set(0);
        this.room.scale.set(2);

        // ---------------------------
        // Setup of local variables  |
        // ---------------------------
        electricSwitch.on("switchPress", this.onSwitchClick, this)
        electricSwitch.scale.set(0.08);
        electricSwitch.position.set(400, 480);

        guitar.scale.set(0.8);
        guitar.position.set(985, 500);
        guitar.eventMode = "static";
        guitar.cursor = "pointer";
        guitar.on("pointerdown", this.onGuitarClick, this); // Adds an onClick event to play a random chord when the guitar is clicked.

        playText.anchor.set(0.5);
        playText.position.set(screen.width / 24, screen.height / 24);
        playText.eventMode = "static";
        playText.cursor = "pointer";
        playText.on("pointerdown", this.transitionToGameplay, this);

        // ---------------------------
        // Addition of children      |
        // ---------------------------
        this.content.addChild(this.room);
        this.content.addChild(this.stage);
        this.content.addChild(this.clock);
        this.content.addChild(electricSwitch);
        this.content.addChild(guitar);
        this.content.addChild(playText);

        this.addChild(this.content);
    }

    // --------------------------------------------------
    // onClick Events                                   |
    // --------------------------------------------------
    // TODO This doesn't work very well, it's sluggish and the textures are awful. Must get better textures and a better animation.
    private onClockClick() {
        // Changes the room's texture based on the time of day read on the clock.
        if (this.clock.timeText.text == "18:50" || this.clock.timeText.text == "21:10") {
            this.room.texture = Texture.from("Room-Night");
        } else {
            this.room.texture = Texture.from("Room");
        }
    }

    // TODO Turning off the lights darkens literally everything on screen, including text. Must fix.
    private onSwitchClick() {
        this.callback();

        // Turns on/off the lights of the room, darkening the entire screen.
        if (this.lightsOn) {
            this.lightsOn = false;
        } else {
            this.lightsOn = true;
        }
    }

    private onGuitarClick() {
        if (this.canClick) {
            if (sound.isPlaying()) {
                sound.stop;
            }

            if (sound.exists("chord")) {
                sound.remove("chord"); // Removes existing "chord" sound to avoid errors.
            }

            sound.add("chord", "./audio/chord" + (Math.floor(Math.random() * 5) + 1) + ".mp3") // Picks a chord at random.
            sound.play("chord");

            this.canClick = false;

            // Set a cooldown of 4 seconds before being able to play another sound to avoid spamming.
            setTimeout(() => {
                this.canClick = true;
            }, 4000);
        }
    }

    // --------------------------------------------------
    // Gameplay-transition functions                    |
    // --------------------------------------------------
    public transitionToGameplay() {
        // Find the existing file input element in the DOM.
        let zipFileInput = document.getElementById('zipFileInput') as HTMLInputElement;

        const handleZipFileSelect = async (event: Event) => {
            const input = event.target as HTMLInputElement;
            const zipFiles = Array.from(input.files || []).filter(file => file.name.endsWith('.zip')); // Filter out any non-ZIP files.

            if (zipFiles.length === 0) {
                alert('Please select a .zip file.');
                zipFileInput.removeEventListener('change', handleZipFileSelect);
                return;
            }

            // Read the selected ZIP file.
            const zipFile = zipFiles[0];
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(zipFile);

            let midiFile: File | null = null;
            let oggFile: File | null = null;
            let txtFile: File | null = null;

            // Iterate through the contents of the ZIP file.
            for (const filename of Object.keys(zipContent.files)) {
                const file = zipContent.files[filename];
                if (!file.dir) {
                    if (filename.endsWith('.mid') || filename.endsWith('.midi')) {
                        midiFile = new File([await file.async('blob')], filename);
                    } else if (filename.endsWith('.ogg')) {
                        oggFile = new File([await file.async('blob')], filename);
                    } else if (filename.endsWith('.txt')) {
                        txtFile = new File([await file.async('blob')], filename);
                    }
                }
            }

            if (midiFile && oggFile && txtFile) {
                this.files.push(midiFile, oggFile, txtFile);

                this.continueWithGameplayLogic();
            } else {
                alert('The ZIP file must contain a MIDI file, OGG and TXT file.');
            }

            // Remove the event listener to avoid multiple executions.
            zipFileInput.removeEventListener('change', handleZipFileSelect);
        };

        // Attach event listener for ZIP file input.
        zipFileInput.addEventListener('change', handleZipFileSelect);

        zipFileInput.click(); // Trigger the ZIP file select window.
    }

    private continueWithGameplayLogic() {
        let startTime = performance.now(); // Get the current timestamp.
        const duration = 1250; // Duration of the animation in milliseconds.

        this.stage.visible = true;

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Calculate animation progress (0 to 1).

            // Lerp (linear interpolation) for a smoother transition.
            const contentX = this.lerp(0, (-screen.width + 380), progress); // Calculate content.x using lerp.
            this.content.x = contentX;

            if (progress < 1) {
                requestAnimationFrame(animate); // Request the next animation frame.
            } else {
                // Animation complete.
                this.room.visible = false;
                this.content.x = -screen.width + 380; // Enforce exact final position to avoid variations.
            }
        };

        // Start the animation.
        requestAnimationFrame(animate);
        this.callback2();
    }

    // --------------------------------------------------
    // Auxiliary functions                              |
    // --------------------------------------------------
    private lerp(start: number, end: number, amount: number) {
        return (1 - amount) * start + amount * end;
    }
}

/* KNOWN BUGS:
- If the player opens and closes the file select window without selecting a file, then carries out the gameplay process correctly, the notes on-screen will be duplicated, with the duplicates appearing behind the track graph.

- Opening a .zip with multiple .midi, .ogg or .ini files will use the first file it parses alphabetically and ignore all others.

- Custom fonts currently don't seem to work, either imported locally or from the web.
*/