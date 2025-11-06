import { Container, Rectangle, Graphics, Ticker, Sprite, Text, TextStyle } from "pixi.js";
import { IUpdateable } from "./IUpdateable";
import { IHitbox, checkCollision } from "./IHitbox";
import { HitKey } from "./HitKey";
import { HitZone } from "./HitZone";
import * as particle from "../src/emitter.json";
import { Emitter, LinkedListContainer, upgradeConfig } from "@pixi/particle-emitter";
import { sound } from "@pixi/sound";

export class TickerScene extends Container implements IUpdateable, IHitbox {

    private hitZoneContainer: Container;
    private hitParticleContainer: LinkedListContainer;

    private nowPlayingContainer: Container;
    private streakContainer: Container;
    private uiPlayerContainer: Container;

    private hitZones: HitZone[] = [];
    private hitParticle: Emitter;

    private notesArray: [string, number][]; // An array of arrays that includes a note string, and a delay value.
    private notesToSchedule: { time: number; note: string }[] = [];
    private noteKeyMap: { [note: string]: HitKey[] } = {};
    private keyMap = {
        "0": "S",
        "1": "D",
        "2": "F",
        "3": "J",
        "4": "K",
        "5": "L"
    };

    private audioBuffer: AudioBuffer;

    private trackGraph: Graphics;
    private streakGraph: Graphics;

    private scoreValueText: Text;
    private multiplierText: Text;
    private artistAndTitleText: Text;
    private currentStreakText: Text;
    private noteGradeText: Text;

    private multiplier: number;
    private noteStreak: number;
    private longestStreak: number;
    private totalNotes: number;
    private totalNotesHit: number;
    private startTime: number;
    private totalPossibleScore: number;

    private totalExcellentNotes: number;
    private totalGreatNotes: number;
    private totalGoodNotes: number;
    private totalOkNotes: number;
    private totalEarlyStrokes: number;

    private songHasEnded: boolean;

    constructor(notesArray: [string, number][], songMetadata: string, audioBuffer: AudioBuffer) {
        super();

        // ------------------------------------
        // Initialization of global variables |
        // ------------------------------------
        this.hitZoneContainer = this.setupHitZones();
        this.hitParticleContainer = new LinkedListContainer();

        this.nowPlayingContainer = new Container();
        this.streakContainer = new Container();

        this.trackGraph = new Graphics();
        this.streakGraph = new Graphics();

        this.hitParticle = new Emitter(this.hitParticleContainer, upgradeConfig(particle, "Fire"));

        this.uiPlayerContainer = new Container();

        this.notesArray = notesArray;
        this.audioBuffer = audioBuffer;

        this.multiplier = 1;
        this.noteStreak = 0;
        this.longestStreak = this.noteStreak;
        this.startTime = 0;
        this.totalNotesHit = 0;
        this.totalNotes = 0;
        this.totalPossibleScore = this.calculateTotalPossibleScore();
        console.log(this.totalPossibleScore);

        this.totalExcellentNotes = 0;
        this.totalGreatNotes = 0;
        this.totalGoodNotes = 0;
        this.totalOkNotes = 0;
        this.totalEarlyStrokes = 0;

        this.songHasEnded = false;

        this.scoreValueText = new Text("0", { fontSize: 35, fill: 0x000000, fontFamily: "RulerGold" });
        this.multiplierText = new Text("x" + this.multiplier.toString(), { fontSize: 35, fill: 0x000000, fontFamily: "RedeemGold" });

        // TODO A better implementation for this is necessary; Would be better for the text to constantly slide on the screen.
        if (songMetadata.length > 34) {
            songMetadata = songMetadata.substring(0, 34) + '...';
        }

        this.artistAndTitleText = new Text(songMetadata, { fontSize: 54, fill: 0x000000, fontFamily: "SinsGold" });

        this.currentStreakText = new Text(this.noteStreak.toString(), { fontSize: 80, fill: 0x00000, fontFamily: "RulerGold" });
        this.noteGradeText = new Text("Excellent", { fontSize: 55, fill: 0x10EFE3, fontFamily: "RedeemGold" });

        // --------------------------------
        // Declaration of local variables |
        // --------------------------------
        const uiPlayer = Sprite.from("UI_Player");

        const nowPlayingBar = Sprite.from("Now_Playing_Bar");

        const scoreText = new Text("Score:", { fontSize: 27, fill: 0x000000, fontFamily: "RulerGold" });

        const hitzoneTextStyle = new TextStyle({
            fontSize: 122,
            fill: 0x000000,
            fontFamily: "RulerGold",
        });

        const hitzoneSText = new Text("S", hitzoneTextStyle);
        const hitzoneDText = new Text("D", hitzoneTextStyle);
        const hitzoneFText = new Text("F", hitzoneTextStyle);
        const hitzoneJText = new Text("J", hitzoneTextStyle);
        const hitzoneKText = new Text("K", hitzoneTextStyle);
        const hitzoneLText = new Text("L", hitzoneTextStyle);

        const hitZoneTextContainer = new Container();

        // ---------------------------
        // Setup of global variables |
        // ---------------------------
        // Graph to wrap the area of the screen that holds the gameplay elements
        this.trackGraph.lineStyle({ color: 0x666666, width: 2, alpha: 1 });
        this.trackGraph.beginFill(0x000000, 0.66);
        this.trackGraph.drawRect(100, 100, this.hitZoneContainer.width + 19, screen.height + 10);
        this.trackGraph.endFill();
        this.trackGraph.position.set(500, -110);

        this.hitParticle.spawnPos.y = 600;
        this.hitParticle.emit = false;

        this.scoreValueText.position.set(1023, 345);

        this.multiplierText.position.set(1023, 380);

        this.uiPlayerContainer.x = this.trackGraph.x - this.trackGraph.x / 2.66;
        this.uiPlayerContainer.y = screen.height;
        this.artistAndTitleText.position.set(66, (nowPlayingBar.height / 2) * 0.70);

        this.streakGraph.lineStyle({ color: 0xbd6a74, width: 4, alpha: 1 });
        this.streakGraph.beginFill(0x733534, 0.9);
        this.streakGraph.drawRect(0, 0, 220, 100);
        this.streakGraph.endFill();
        this.streakGraph.position.set(1295, 500);

        this.currentStreakText.position.set(this.streakGraph.x + 94, this.streakGraph.y + 12);

        this.noteGradeText.pivot.set(this.noteGradeText.width / 2, this.noteGradeText.height / 2);
        this.noteGradeText.position.set((this.streakGraph.x + this.streakGraph.width / 2) - 5, this.streakGraph.y - 46);
        this.noteGradeText.style.dropShadow = true;
        this.noteGradeText.style.dropShadowBlur = 6;
        this.noteGradeText.style.stroke = '0x03756F';
        this.noteGradeText.style.strokeThickness = 2;
        this.noteGradeText.visible = false;

        // ---------------------------
        // Setup of local variables  |
        // ---------------------------
        uiPlayer.scale.set(1.5)
        uiPlayer.position.set(970, 260);

        nowPlayingBar.scale.set(0.59, 1);
        nowPlayingBar.position.set(3, 5);

        scoreText.position.set(1021, 315);
        scoreText.scale.set(1.1); // This turns text into a texture, so it becomes blurry when upscaled.

        // TODO These positions should be more relative.
        hitzoneSText.position.set(screen.width / 2 - 325, screen.height / 2 + 93);
        hitzoneDText.position.set(screen.width / 2 - 220, screen.height / 2 + 93);
        hitzoneFText.position.set(screen.width / 2 - 105, screen.height / 2 + 93);
        hitzoneJText.position.set(screen.width / 2 + 10, screen.height / 2 + 93);
        hitzoneKText.position.set(screen.width / 2 + 105, screen.height / 2 + 93);
        hitzoneLText.position.set(screen.width / 2 + 230, screen.height / 2 + 93);

        hitZoneTextContainer.position.set(0, 0);

        // ---------------------------
        // Setup of events           |
        // ---------------------------
        document.addEventListener("keydown", this.onKeyDown.bind(this));

        // ---------------------------
        // Addition of children      |
        // ---------------------------
        this.uiPlayerContainer.addChild(uiPlayer);
        this.uiPlayerContainer.addChild(scoreText);
        this.uiPlayerContainer.addChild(this.scoreValueText);
        this.uiPlayerContainer.addChild(this.multiplierText);

        this.nowPlayingContainer.addChild(nowPlayingBar);
        this.nowPlayingContainer.addChild(this.artistAndTitleText);

        hitZoneTextContainer.addChild(hitzoneSText);
        hitZoneTextContainer.addChild(hitzoneDText);
        hitZoneTextContainer.addChild(hitzoneFText);
        hitZoneTextContainer.addChild(hitzoneJText);
        hitZoneTextContainer.addChild(hitzoneKText);
        hitZoneTextContainer.addChild(hitzoneLText);

        this.hitZoneContainer.addChild(hitZoneTextContainer);

        this.streakContainer.addChild(this.streakGraph);
        this.streakContainer.addChild(this.currentStreakText);

        this.addChild(this.trackGraph);
        this.addChild(this.hitZoneContainer);
        this.addChild(this.hitParticleContainer);
        this.addChild(this.uiPlayerContainer);
        this.addChild(this.nowPlayingContainer);
        this.addChild(this.streakContainer);
        this.addChild(this.noteGradeText);

        // ---------------------------
        // Continuation functions    |
        // ---------------------------
        this.preCalculateNoteTimes();
        this.slideIntoScreen();
        this.playSong(this.audioBuffer);
    }

    // --------------------------------------------------
    // Gameplay setup functions                         |
    // --------------------------------------------------
    // Create HitZone instances and position them.
    private setupHitZones() {
        const positions = [
            [-360, 0], [-250, 0], [-140, 0], [-30, 0], [80, 0], [190, 0]
        ];

        let hitZoneContainer = new Container();

        positions.forEach((pos) => {
            const hitZone = new HitZone();

            hitZone.position.set(pos[0], pos[1]);

            this.hitZones.push(hitZone);

            hitZoneContainer.addChild(hitZone);
        });

        return hitZoneContainer;
    }

    // Pre-calculate the times at which notes should be played by accumulating the delays.
    private preCalculateNoteTimes(): void {
        let cumulativeTime = 0;

        for (const [note, delay] of this.notesArray) {
            cumulativeTime += delay;
            this.notesToSchedule.push({ time: cumulativeTime, note });
        }
    }

    public startScheduling(): void {
        this.startTime = performance.now();
        Ticker.shared.add(this.update.bind(this));
    }

    private calculateTotalPossibleScore(): number {
        this.totalNotes = this.notesArray.length; // Total amount of notes in the song.
        let totalPossibleScore = 0;

        // Calculate scores based on the number of notes
        if (this.totalNotes <= 7) {
            // All notes fall within the first multiplier range (1x)
            totalPossibleScore = this.totalNotes * 200;
        } else if (this.totalNotes <= 15) {
            // First 7 notes have a 1x multiplier
            totalPossibleScore = (7 * 200) + ((this.totalNotes - 7) * 200 * 2);
        } else if (this.totalNotes <= 23) {
            // First 7 notes have a 1x multiplier
            // Next 8 notes have a 2x multiplier
            totalPossibleScore = (7 * 200) + (8 * 200 * 2) + ((this.totalNotes - 15) * 200 * 3);
        } else {
            // First 7 notes have a 1x multiplier
            // Next 8 notes have a 2x multiplier
            // Next 8 notes have a 3x multiplier
            // Remaining notes have a 4x multiplier
            totalPossibleScore = (7 * 200) + (8 * 200 * 2) + (8 * 200 * 3) + ((this.totalNotes - 23) * 200 * 4);
        }

        return totalPossibleScore;
    }

    // --------------------------------------------------
    // Gameplay functions                               |
    // --------------------------------------------------

    private playSong(audioBuffer: AudioBuffer) {
        sound.add("song", audioBuffer);

        // TODO Find a better implementation that doesn't require using a specific timeout for the song to play.
        setTimeout(() => {
            sound.play("song");
        }, 1370); // Estimated timeout based on timestamps.
    }

    private spawnNote(note: string): void {
        const curNote = this.keyMap[note as keyof typeof this.keyMap];
        const hitZoneIndex = parseInt(note);

        if (hitZoneIndex >= 0 && hitZoneIndex < this.hitZones.length) {
            let curKey = new HitKey();
            curKey.x = this.hitZones[hitZoneIndex].x;
            curKey.missed = false;

            this.addChild(curKey);

            curKey.moveNote();

            if (!this.noteKeyMap[curNote]) {
                this.noteKeyMap[curNote] = [];
            }
            this.noteKeyMap[curNote].push(curKey);
        }
    }

    // ! Keeping a key pressed will spam the "Too Early" check and play the last key pressed immediately.
    private onKeyDown(event: KeyboardEvent) {
        const keyCodeMap = {
            KeyS: 0,
            KeyD: 1,
            KeyF: 2,
            KeyJ: 3,
            KeyK: 4,
            KeyL: 5
        };

        const keyCode = event.code as keyof typeof keyCodeMap;
        const keyIndex = keyCodeMap[keyCode];

        if (keyIndex !== undefined && this.noteKeyMap[keyCode.charAt(3)]) {
            try {
                const hitKeys = this.noteKeyMap[keyCode.charAt(3)];

                let collisionDetected = false;

                for (const hitKey of hitKeys) {
                    const hitZoneIndex = keyIndex;

                    if (hitZoneIndex >= 0 && hitZoneIndex < this.hitZones.length) { // Ensure within valid hitZone index.
                        const hitZone = this.hitZones[hitZoneIndex];

                        if (hitKey.visible && checkCollision(hitKey, hitZone)) {
                            hitKey.visible = false;

                            this.noteStreak += 1;
                            this.totalNotesHit += 1;

                            if (this.noteStreak > this.longestStreak) {
                                this.longestStreak = this.noteStreak;
                            }

                            const multiplier = this.setMultiplier(this.noteStreak);

                            this.calculateScore(hitKey, hitZone, multiplier);

                            this.hitParticle.spawnPos.x = hitKey.x + 1025;
                            this.hitParticle.emit = true;

                            collisionDetected = true;

                            hitKey.destroy; // ! This might possibly, perhaps, maybe cause a bug. Can't tell for sure.

                            break;
                        }
                    }
                }

                // If no collision was detected, reset the noteStreak.
                if (!collisionDetected) {
                    for (const hitKey of hitKeys) {
                        if (hitKey.visible) {
                            this.noteStreak = 0;

                            this.setMultiplier(this.noteStreak);
                            this.currentStreakText.text = this.noteStreak.toString();

                            hitKey.destroy;

                            this.noteGradeText.visible = true;
                            this.noteGradeText.text = "Too Early";
                            this.noteGradeText.style.fill = "0xFF0000";
                            this.noteGradeText.style.stroke = '0xAA1910';
                            this.noteGradeText.pivot.set(this.noteGradeText.width / 2, this.noteGradeText.height / 2);
                            this.noteGradeText.position.set((this.streakGraph.x + this.streakGraph.width / 2) - 5, this.streakGraph.y - 46);

                            this.totalEarlyStrokes += 1;

                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    private calculateScore(hitKey: HitKey, hitZone: HitZone, multiplier: number) {
        const keyPositionAtPress = hitKey.getPosition() + (hitKey.height / 2);
        const hitZonePosition = screen.height / 2 + 96; // TODO This needs more relativity.
        const hitZoneCenter = (hitZonePosition + (Math.abs(hitZone.height) / 2));

        /* For testing purposes.
        const graph = new Graphics();
        graph.beginFill(0x00FF00, 1)
        graph.drawRect(0, 0, 10, 3);
        graph.endFill();
        graph.position.set(630, hitZoneCenter);
        this.addChild(graph);

        const graph2 = new Graphics();
        graph2.beginFill(0xFF0000, 1)
        graph2.drawRect(0, 0, 10, 3);
        graph2.endFill();
        graph2.position.set(610, keyPositionAtPress);
        this.addChild(graph2);
        */

        const distanceFromCenter = Math.abs(keyPositionAtPress - hitZoneCenter);

        const calculatedScore = (100 - distanceFromCenter) * multiplier;

        this.scoreValueText.text = (Number(this.scoreValueText.text) + Math.round(calculatedScore)).toString();

        // TODO Might want to check these values again.
        if (distanceFromCenter <= 15) {
            this.noteGradeText.text = "Excellent";
            this.noteGradeText.style.fill = "0x10EFE3";
            this.noteGradeText.style.stroke = '0x03756F';
            this.totalExcellentNotes += 1;
        } else if (distanceFromCenter > 15 && distanceFromCenter <= 30) {
            this.noteGradeText.text = "Great";
            this.noteGradeText.style.fill = "0x16E516";
            this.noteGradeText.style.stroke = '0x076e07';
            this.totalGreatNotes += 1;
        } else if (distanceFromCenter > 30 && distanceFromCenter <= 45) {
            this.noteGradeText.text = "Good";
            this.noteGradeText.style.fill = "0xEAEC14";
            this.noteGradeText.style.stroke = '0x989800';
            this.totalGoodNotes += 1;
        } else if (distanceFromCenter > 45) {
            this.noteGradeText.text = "OK";
            this.noteGradeText.style.fill = "0xF0A50B";
            this.noteGradeText.style.stroke = '0xB27E13';
            this.totalOkNotes += 1;
        }

        this.noteGradeText.visible = true;
        this.noteGradeText.pivot.set(this.noteGradeText.width / 2, this.noteGradeText.height / 2);
        this.noteGradeText.position.set((this.streakGraph.x + this.streakGraph.width / 2) - 5, this.streakGraph.y - 46);
    }

    private setMultiplier(noteStreak: number): number {
        if (noteStreak < 8) {
            this.multiplier = 1;
        } else if (noteStreak >= 8 && noteStreak < 16) {
            this.multiplier = 2;
        } else if (noteStreak >= 16 && noteStreak < 24) {
            this.multiplier = 3;
        } else if (noteStreak >= 24) {
            this.multiplier = 4;
        }

        this.multiplierText.text = "x" + this.multiplier.toString();

        this.currentStreakText.text = this.noteStreak.toString();

        if (this.currentStreakText.text.length == 1) {
            this.currentStreakText.x = this.streakGraph.x + 94;
        } else if (this.currentStreakText.text.length == 2) {
            this.currentStreakText.x = this.streakGraph.x + 78;
        } else if (this.currentStreakText.text.length == 3) {
            this.currentStreakText.x = this.streakGraph.x + 61;
        } else if (this.currentStreakText.text.length == 4) {
            this.currentStreakText.x = this.streakGraph.x + 45;
        } else if (this.currentStreakText.text.length == 5) {
            this.currentStreakText.x = this.streakGraph.x + 29;
        }

        return this.multiplier;
    }

    // --------------------------------------------------
    // UI-manipulation functions                        |
    // --------------------------------------------------
    // TODO The "Now Playing" Bar and Streak Container should also slide into the screen.
    public slideIntoScreen() {
        let startTime = performance.now(); // Get the current timestamp.
        const duration = 500; // Duration of the animation in milliseconds.

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Calculate animation progress (0 to 1).

            if (progress < 1) {
                this.trackGraph.y = -(Math.round(progress * screen.height / 7)); // Update the position based on the progress of the animation.

                const newY = -(Math.round(progress * screen.height - 1425)); // TODO This REALLY needs a better implementation. It's currently shit.

                this.uiPlayerContainer.y = newY;

                requestAnimationFrame(animate); // Request the next animation frame
            }
        }

        requestAnimationFrame(animate); // Start the animation.
    }

    public slideOutOfScreen() {
        let startTime = performance.now(); // Get the current timestamp.
        const duration = 1000; // Duration of the animation in milliseconds.

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Calculate animation progress (0 to 1).

            if (progress < 1) {
                console.log(progress);
                this.trackGraph.y -= 15;
                this.hitZoneContainer.y -= 15;
                this.nowPlayingContainer.y -= 3;
                this.uiPlayerContainer.y += 7.5;
                this.streakContainer.x += 4;

                requestAnimationFrame(animate); // Request the next animation frame
            }
        }

        requestAnimationFrame(animate); // Start the animation.
    }

    // TODO Add score text
    public showFinalScore() {
        const infoContainer = new Container()
        infoContainer.y = -50;

        const rectWidth = 540;
        const rectHeight = 720;

        const scoreGraph = new Graphics()
        scoreGraph.lineStyle({ color: 0xD53C1D, width: 4, alpha: 1 });
        scoreGraph.beginFill(0x733535, 0.95);
        scoreGraph.drawRect(0, 0, rectWidth, rectHeight);
        scoreGraph.endFill();
        scoreGraph.pivot.set(rectWidth / 2, rectHeight / 2);
        scoreGraph.position.set(768, 510);

        const scoreGraphTextStyle = new TextStyle({
            fontSize: 50,
            fill: 0x000000,
            fontFamily: "RulerGold"
        });

        const finalScoreText = new Text("Score: " + this.scoreValueText.text, scoreGraphTextStyle);
        finalScoreText.pivot.set(finalScoreText.width / 2, finalScoreText.height / 2)
        finalScoreText.position.set(scoreGraph.x, scoreGraph.y / 2);

        const longestNoteStreakText = new Text("Best Streak: " + this.longestStreak, scoreGraphTextStyle);
        longestNoteStreakText.pivot.set(longestNoteStreakText.width / 2, longestNoteStreakText.height / 2)
        longestNoteStreakText.position.set(scoreGraph.x, scoreGraph.y / 1.5);

        const notesHitText = new Text("Notes: " + this.totalNotesHit + "/" + this.totalNotes, scoreGraphTextStyle);
        notesHitText.pivot.set(notesHitText.width / 2, notesHitText.height / 2);
        notesHitText.position.set(scoreGraph.x, scoreGraph.y / 1.2);

        const excellentText = new Text("Excellent: ", { fontSize: 45, fill: 0x10EFE3, fontFamily: "RedeemGold" });
        excellentText.pivot.set(excellentText.width / 2, excellentText.height / 2);
        excellentText.position.set(scoreGraph.x - 133, scoreGraph.y / 1.05);
        const excellentNotesText = new Text(this.totalExcellentNotes, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        excellentNotesText.pivot.y = excellentNotesText.height / 2;
        excellentNotesText.position.set(scoreGraph.x - 33, excellentText.y);

        const greatText = new Text("Great: ", { fontSize: 45, fill: 0x16E516, fontFamily: "RedeemGold" });
        greatText.pivot.set(greatText.width / 2, greatText.height / 2);
        greatText.position.set(scoreGraph.x + 133, scoreGraph.y / 1.05);
        const greatNotesText = new Text(this.totalGreatNotes, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        greatNotesText.pivot.y = greatNotesText.height / 2;
        greatNotesText.position.set(scoreGraph.x + 190, greatText.y);

        const goodText = new Text("Good: ", { fontSize: 45, fill: 0xEAEC14, fontFamily: "RedeemGold" });
        goodText.pivot.set(goodText.width / 2, goodText.height / 2);
        goodText.position.set(scoreGraph.x - 133, scoreGraph.y / 0.95);
        const goodNotesText = new Text(this.totalGoodNotes, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        goodNotesText.pivot.y = goodNotesText.height / 2;
        goodNotesText.position.set(scoreGraph.x - 33, goodText.y);

        const okText = new Text("OK: ", { fontSize: 45, fill: 0xF0A50B, fontFamily: "RedeemGold" });
        okText.pivot.set(okText.width / 2, okText.height / 2);
        okText.position.set(scoreGraph.x + 133, scoreGraph.y / 0.95);
        const okNotesText = new Text(this.totalOkNotes, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        okNotesText.pivot.y = okNotesText.height / 2;
        okNotesText.position.set(scoreGraph.x + 190, okText.y);

        const missedText = new Text("Missed: ", { fontSize: 45, fill: 0xFF0000, fontFamily: "RedeemGold" });
        missedText.pivot.set(missedText.width / 2, missedText.height / 2);
        missedText.position.set(scoreGraph.x - 133, scoreGraph.y / 0.865);
        const missedNotesText = new Text(this.totalNotes - this.totalNotesHit, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        missedNotesText.pivot.y = missedNotesText.height / 2;
        missedNotesText.position.set(scoreGraph.x - 33, missedText.y);

        const earlyText = new Text("Early: ", { fontSize: 45, fill: 0xFF0000, fontFamily: "RedeemGold" });
        earlyText.pivot.set(earlyText.width / 2, earlyText.height / 2);
        earlyText.position.set(scoreGraph.x + 133, scoreGraph.y / 0.865);
        const earlyNotesText = new Text(this.totalEarlyStrokes, { fontSize: 45, fill: 0x000000, fontFamily: "RulerGold" });
        earlyNotesText.pivot.y = earlyNotesText.height / 2;
        earlyNotesText.position.set(scoreGraph.x + 190, earlyText.y);

        infoContainer.addChild(finalScoreText);
        infoContainer.addChild(longestNoteStreakText);
        infoContainer.addChild(notesHitText);
        infoContainer.addChild(excellentText);
        infoContainer.addChild(greatText);
        infoContainer.addChild(goodText);
        infoContainer.addChild(okText);
        infoContainer.addChild(missedText);
        infoContainer.addChild(earlyText);
        infoContainer.addChild(excellentNotesText);
        infoContainer.addChild(greatNotesText);
        infoContainer.addChild(goodNotesText);
        infoContainer.addChild(okNotesText);
        infoContainer.addChild(missedNotesText);
        infoContainer.addChild(earlyNotesText);

        this.addChild(scoreGraph);
        this.addChild(infoContainer);
    }

    // --------------------------------------------------
    // Auxiliary functions                              |
    // --------------------------------------------------
    public getHitbox(): Rectangle {
        return this.hitZones[0].getBounds(); // Adjust based on your needs
    }

    public update(deltaMS: number): void {
        const currentTime = performance.now() - this.startTime;

        while (this.notesToSchedule.length > 0 && this.notesToSchedule[0].time <= currentTime) {
            const noteInfo = this.notesToSchedule.shift();
            if (noteInfo) {
                this.spawnNote(noteInfo.note);
            }
        }

        if (this.notesToSchedule.length < 1 && !sound.isPlaying() && !this.songHasEnded) {
            this.songHasEnded = true;
            this.slideOutOfScreen();

            setTimeout(() => {
                this.showFinalScore();
            }, 1200);
        }

        // TODO This might not be an optimal implementation and might be prone to errors. Further testing needed.
        // Check for notes that have gone past the hit zones.
        for (const key in this.noteKeyMap) {
            const hitKeys = this.noteKeyMap[key];
            for (let i = hitKeys.length - 1; i >= 0; i--) {
                const hitKey = hitKeys[i];

                if (hitKey.visible && hitKey.getPosition() > this.hitZones[0].height * 7.1 && !hitKey.missed) {
                    this.noteStreak = 0;

                    hitKey.missed = true;

                    this.setMultiplier(this.noteStreak);

                    this.noteGradeText.visible = true;
                    this.noteGradeText.text = "Missed";
                    this.noteGradeText.style.fill = "0xFF0000";
                    this.noteGradeText.style.stroke = '0xAA1910';
                    this.noteGradeText.pivot.set(this.noteGradeText.width / 2, this.noteGradeText.height / 2);
                    this.noteGradeText.position.set((this.streakGraph.x + this.streakGraph.width / 2) - 5, this.streakGraph.y - 46);
                }
            }
        }

        this.hitParticle.update(deltaMS);
    }
}

/* KNOWN BUGS:
- Playing two or more notes too close to each other can cause the note streak to reset, unless seemingly played simultaneously. Can't yet replicate bug properly.
  UPDATE 3/6/2024: This might have been fixed already by modifying the hit zone margin. Needs further testing.
*/