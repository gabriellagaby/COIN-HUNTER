var scenePlay = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
        Phaser.Scene.call(this, { key: "scenePlay" });
    },

    init: function () {
        this.score = 0;
        this.currentLevel = 1;
        this.gameStarted = false;
    },

    preload: function () {
        this.load.image("background", "assets/images/BG.png");
        this.load.image("btn_play", "assets/images/ButtonPlay.png");
        this.load.image("coin", "assets/images/Koin.png");
        this.load.image("coin_panel", "assets/images/PanelCoin.png");
        this.load.image("ground", "assets/images/Tile50.png");
        this.load.audio("snd_coin", "assets/audio/koin.mp3");
        this.load.audio("snd_jump", "assets/audio/lompat.mp3");
        this.load.audio("snd_touch", "assets/audio/touch.mp3");
        this.load.audio("music_play", "assets/audio/music_play.mp3");
        this.load.audio("snd_walk", "assets/audio/jalan.mp3");
        this.load.spritesheet("char", "assets/images/CharaSpriteAnim.png", { frameWidth: 45, frameHeight: 93 });
    },

    create: function () {
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        this.add.image(gameWidth / 2, gameHeight / 2, 'background');

        this.coinPanel = this.add.image(gameWidth / 2, 30, 'coin_panel').setDepth(10);
        this.coinText = this.add.text(gameWidth / 2, 30, '0', {
            fontFamily: 'Verdana, Arial',
            fontSize: '37px',
            color: '#adadad'
        }).setOrigin(0.5).setDepth(10);

        this.snd_coin = this.sound.add('snd_coin');
        this.snd_jump = this.sound.add('snd_jump');
        this.snd_touch = this.sound.add('snd_touch');
        this.music_play = this.sound.add('music_play', { loop: true });
        this.snd_walk = this.sound.add('snd_walk', { loop: true, volume: 0 });

        this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('char', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('char', { start: 5, end: 7 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'front', frames: [{ key: 'char', frame: 4 }], frameRate: 20 });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.emmiterCoin = this.add.particles('coin', {
            x: -100,
            y: -100,
            speed: { min: 150, max: 250 },
            gravityY: 200,
            scale: { start: 1, end: 0 },
            lifespan: { min: 200, max: 300 },
            quantity: { min: 5, max: 15 },
            emitting: false
        });

        this.scenePaused = true;
        this.darkenLayer = this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x000000, 0.25).setDepth(20);
        this.buttonPlay = this.add.image(gameWidth / 2, gameHeight / 2, 'btn_play').setDepth(21).setInteractive();

        this.buttonPlay.on('pointerdown', () => this.buttonPlay.setTint(0xaaaaaa));
        this.buttonPlay.on('pointerout', () => this.buttonPlay.clearTint());

        this.buttonPlay.on('pointerup', () => {
            this.buttonPlay.clearTint();
            this.snd_touch.play();
            this.music_play.play();
            this.snd_walk.play();

            this.tweens.add({
                targets: this.buttonPlay,
                duration: 250,
                scaleX: 0,
                scaleY: 0,
                ease: 'Back.In'
            });

            this.tweens.add({
                targets: this.darkenLayer,
                delay: 150,
                duration: 250,
                alpha: 0,
                onComplete: () => {
                    this.darkenLayer.destroy();
                    this.buttonPlay.destroy();
                    this.scenePaused = false;
                    this.startGame();
                }
            });
        });
    },

    startGame: function () {
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;
        const currentLevel = this.currentLevel;

        if (this.platforms) this.platforms.clear(true, true);
        if (this.coins) this.coins.clear(true, true);
        if (this.player) this.player.destroy();
        if (this.enemies) this.enemies.clear(true, true);

        this.platforms = this.physics.add.staticGroup();
        const platformPositions = prepareWorld(this.platforms, gameWidth, gameHeight, currentLevel);

        this.player = this.physics.add.sprite(100, 500, 'char');
        this.player.setGravityY(800);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        this.coins = this.physics.add.group();
        const groundHeight = 32;
        const coinHeight = 32;

        platformPositions.forEach(pos => {
            let coin = this.coins.create(pos.x, pos.y - groundHeight / 2 - coinHeight / 2, 'coin');
            coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        this.physics.add.collider(this.coins, this.platforms);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        // --- MUSUH (ENEMIES) ---
        this.enemies = this.physics.add.group();

        // Musuh muncul di level 4 ke atas
        if (currentLevel > 3) {
            for (let i = 0; i < currentLevel - 2; i++) {
                let x = Phaser.Math.Between(100, gameWidth - 100);
                let enemy = this.enemies.create(x, -100, 'char'); // Ganti 'char' jika ada sprite musuh khusus
                enemy.setBounce(1);
                enemy.setCollideWorldBounds(true);
                enemy.setVelocity(Phaser.Math.Between(-200, 200), 100);
                enemy.allowGravity = false;
            }
        }

        this.physics.add.collider(this.enemies, this.platforms);

        this.physics.add.collider(this.player, this.enemies, function(player, enemy) {
            this.physics.pause();
            this.player.setTint(0xff0000);
        }, null, this);

        this.gameStarted = true;
    },

    update: function () {
        if (this.scenePaused || !this.player || !this.gameStarted) return;

        if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            this.player.anims.play('right', true);
            this.snd_walk.setVolume(1);
        } else if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            this.player.anims.play('left', true);
            this.snd_walk.setVolume(1);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('front');
            this.snd_walk.setVolume(0);
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-650);
            this.snd_jump.play();
        }
    },

    collectCoin: function (player, coin) {
        if (!coin.active) return;
        coin.disableBody(true, true);
        this.score += 10;
        this.coinText.setText(this.score.toString());
        this.snd_coin.play();
        this.emmiterCoin.emitParticleAt(coin.x, coin.y);

        if (this.coins.countActive(true) === 0) {
            // Naikkan level
            this.currentLevel++;
            if (this.currentLevel > 7) this.currentLevel = 1;

            // Pause game, tampilkan transisi
            this.snd_walk.setVolume(0);
            this.gameStarted = false;
            this.physics.pause();

            // Animasi transisi
            this.tweens.add({
                targets: this.darkenLayer,
                duration: 250,
                alpha: 1,
                onComplete: () => {
                    // Mulai level baru
                    this.startGame();
                    newLevelTransition(this, this.currentLevel);
                    // Fade out darkenLayer dan resume physics
                    this.tweens.add({
                        delay: 2000,
                        targets: this.darkenLayer,
                        duration: 250,
                        alpha: 0,
                        onComplete: () => {
                            this.gameStarted = true;
                            this.physics.resume();
                        }
                    });
                }
            });
        }
    }
});

// Fungsi transisi level
function newLevelTransition(activeScene, currentLevel) {
    const gameWidth = activeScene.sys.game.config.width;
    const gameHeight = activeScene.sys.game.config.height;
    var levelTransitionText = activeScene.add.text(
        gameWidth / 2,
        gameHeight / 2,
        'Level ' + currentLevel,
        {
            fontFamily: 'Verdana, Arial',
            fontSize: '40px',
            color: '#ffffff'
        }
    );
    levelTransitionText.setOrigin(0.5);
    levelTransitionText.setDepth(100);
    levelTransitionText.alpha = 0;

    activeScene.tweens.add({
        targets: levelTransitionText,
        duration: 1000,
        alpha: 1,
        yoyo: true,
        onComplete: function () {
            levelTransitionText.destroy();
        }
    });
}

// Platform tiap level
function prepareWorld(platforms, gameWidth, gameHeight, currentLevel) {
    platforms.clear(true, true);
    const groundSize = { width: 128, height: 32 };
    const X_POSITION = { CENTER: gameWidth / 2 };
    const Y_POSITION = { BOTTOM: gameHeight };
    const groundTemp = { width: 128 };
    const relativeSize = { w: 0 };

    let platformPositions = [];

    // 9 platform bawah (selalu ada di semua level)
    for (let i = -4; i <= 4; i++) {
        let x = X_POSITION.CENTER + groundSize.width * i;
        let y = Y_POSITION.BOTTOM - groundSize.height / 2;
        platforms.create(x, y, 'ground');
        platformPositions.push({ x, y });
    }

    // Level 1
    if (currentLevel == 1) {
        let extras = [
            { x: groundTemp.width / 2 + relativeSize.w, y: 384 },
            { x: 400 + relativeSize.w, y: 424 },
            { x: 1024 - groundTemp.width / 2 + relativeSize.w, y: 480 },
            { x: 600 + relativeSize.w, y: 584 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 2
    else if (currentLevel == 2) {
        let extras = [
            { x: 80 + relativeSize.w, y: 284 },
            { x: 230 + relativeSize.w, y: 184 },
            { x: 390 + relativeSize.w, y: 284 },
            { x: 498 + relativeSize.w, y: 360 },
            { x: 620 + relativeSize.w, y: 430 },
            { x: 900 + relativeSize.w, y: 570 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 3
    else if (currentLevel == 3) {
        let extras = [
            { x: 80 + relativeSize.w, y: 230 },
            { x: 230 + relativeSize.w, y: 230 },
            { x: 1040 + relativeSize.w, y: 280 },
            { x: 600 + relativeSize.w, y: 340 },
            { x: 400 + relativeSize.w, y: 420 },
            { x: 930 + relativeSize.w, y: 430 },
            { x: 820 + relativeSize.w, y: 570 },
            { x: 512 + relativeSize.w, y: 590 },
            { x: 0 + relativeSize.w, y: 570 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 4
    else if (currentLevel == 4) {
        let extras = [
            { x: 150, y: 200 },
            { x: 300, y: 350 },
            { x: 500, y: 250 },
            { x: 700, y: 400 },
            { x: 900, y: 300 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 5
    else if (currentLevel == 5) {
        let extras = [
            { x: 200, y: 180 },
            { x: 400, y: 320 },
            { x: 600, y: 220 },
            { x: 800, y: 370 },
            { x: 1000, y: 270 },
            { x: 300, y: 500 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 6
    else if (currentLevel == 6) {
        let extras = [
            { x: 120, y: 150 },
            { x: 350, y: 200 },
            { x: 600, y: 150 },
            { x: 850, y: 200 },
            { x: 1100, y: 150 },
            { x: 500, y: 400 },
            { x: 700, y: 500 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }
    // Level 7
    else if (currentLevel == 7) {
        let extras = [
            { x: 100, y: 100 },
            { x: 300, y: 200 },
            { x: 500, y: 100 },
            { x: 700, y: 200 },
            { x: 900, y: 100 },
            { x: 1100, y: 200 },
            { x: 600, y: 350 },
            { x: 400, y: 500 },
            { x: 800, y: 500 }
        ];
        extras.forEach(pos => {
            platforms.create(pos.x, pos.y, 'ground');
            platformPositions.push({ x: pos.x, y: pos.y });
        });
    }

    return platformPositions;
}

window.scenePlay = scenePlay;