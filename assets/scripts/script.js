//http://127.0.0.1:8000/
window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    //global state jej
    let gameState = {
        fps: 60,
        canvas: {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
        },
        shipMovingLeft: false,
        shipMovingRight: false,
        currentScore: null,
        highScore: null,
        paused: false,
        bg: null,
        player: null,
        enemies: [],
        asteroids: [],
        occupiedSpace: new Map(),
        missiles: [],
    };

    gameState.bg = new Bg('assets/back.png', canvas.width, canvas.height, gameState);
    gameState.player = new Ship('player', 'assets/ship.png', canvas.width, canvas.height, 16, 24, 2.5, 0, 9, gameState);
    gameState.enemies.push(new Ship('enemy', 'assets/enemy-medium.png', canvas.width, canvas.height, 32, 16, 2, 0, 1, gameState));
    gameState.asteroids.push(new Asteroid('assets/asteroid.png', canvas.width, canvas.height, 160, 160, 0.4, 0, 0, gameState));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            gameState.shipMovingLeft = true;
        } else if (event.key === 'ArrowRight') {
            gameState.shipMovingRight = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft') {
            gameState.shipMovingLeft = false;
        } else if (event.key === 'ArrowRight') {
            gameState.shipMovingRight = false;
        } else if (event.key === ' ') {
            shoot(gameState);
        }
    });



    function gameLoop() {
        //check collisions
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gameState.bg.draw(ctx);
        gameState.bg.update();
        gameState.enemies.forEach(enemy => {
            enemy.draw(ctx);
            enemy.update('');
        });
        gameState.asteroids.forEach(asteroid => {
            asteroid.draw(ctx);
            asteroid.update();
        });
        gameState.missiles.forEach(missile => {
            missile.draw(ctx);
            missile.update();
        });
        gameState.player.draw(ctx);
        let direction = gameState.shipMovingLeft ? 'left' : gameState.shipMovingRight ? 'right' : '';
        gameState.player.update(direction);
        setTimeout(() => requestAnimationFrame(gameLoop), 1000 / gameState.fps);
    };

    gameLoop();
});

class GameObject {
    constructor(src, canvasWidth, canvasHeight, gameState) {
        this.image = createImage(src);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.id = crypto.randomUUID();
        this.gameState = gameState;
    }
}

class Sprite extends GameObject {
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState) {
        super(src, canvasWidth, canvasHeight, gameState);
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.scale = scale || 1;
        this.minFrame = minFrame;
        this.maxFrame = maxFrame;
    }
}


class Bg extends GameObject {
    constructor(src, canvasWidth, canvasHeight, gameState) {
        super(src, canvasWidth, canvasHeight, gameState);
        this.image1 = this.image;
        this.image2 = createImage(src);
        this.y1 = 0;
        this.y2 = this.y1 - this.canvasHeight;
    }
    draw(ctx) {
        ctx.drawImage(this.image1, 0, this.y1, this.canvasWidth, this.canvasHeight);
        ctx.drawImage(this.image2, 0, this.y2, this.canvasWidth, this.canvasHeight);
    }
    update() {
        if (this.y1 < this.canvasHeight) {
            this.y1 += 2;
            this.y2 += 2;
        } else {
            this.y1 = 0;
            this.y2 = this.y1 - this.canvasHeight;
        }
    }
}

class Ship extends Sprite {
    constructor(type, src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState);
        this.type = type;
        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        //mora drugacije za mene i za neprijatelje
        if (this.type === 'player') {
            this.x = this.canvasWidth / 2 - this.width / 2;
            //mnogo je zakucano za dno
            this.y = this.canvasHeight - this.height - 5;
        } else {
            this.x = Math.floor(Math.random() * (this.canvasWidth - 2 * this.spriteWidth));
            this.y = this.height / this.scale;
        }
        this.currFrame = 0;
        this.currFrameX = 0;
        this.currFrameY = 0;
        //prebrza je animacija, moram nekako da je usporim
        this.iteration = 0;
    }
    draw(ctx) {
        //checkCollisions
        ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
        const id = this.type === 'player' ? 'player' : this.id;
        updateOccupiedSpace(this.x, this.y, this.width, this.height, id, this.gameState);
    }
    update(direction = '') {
        if (this.iteration < 3) {
            this.iteration += 1;
            return;
        }
        this.iteration = 0;
        if (this.currFrame < this.maxFrame) this.currFrame++;
        else this.currFrame = this.minFrame;
        this.currFrameX = this.currFrame % 5;
        this.currFrameY = Math.floor(this.currFrame / 5);
        if (direction === 'left' && this.x > 0) this.x -= 15;
        else if (direction === 'right' && this.x < this.canvasWidth - this.width) this.x += 15;
    }
}

class Asteroid extends Sprite {
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState);
        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        this.x = Math.floor(Math.random() * (this.canvasWidth - 2 * this.spriteWidth));
        this.y = this.height;
        this.rotationCounter = 0;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotationCounter * Math.PI / 180);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
        updateOccupiedSpace(this.x, this.y, this.width, this.height, this.id, this.gameState);
    }
    update() {

        if (this.y === this.canvasHeight + this.height) {
            let idx = this.gameState.asteroids.findIndex(el => el.id === this.id);
            this.gameState.asteroids = this.gameState.asteroids.toSpliced(idx, 1);
        }
        this.rotationCounter += 2;
        this.y += 1;
    }
}

class Missile extends Sprite {
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, gameState);
        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        this.x = this.gameState.player.x + this.width / 2 + 4; //4 iz nekog razloga centrira, ne znam zasto izgleda lose bez cetvorke
        this.y = this.gameState.player.y - this.gameState.player.height / 2 - this.height / 2;
        this.currFrameX = 0;
        this.currFrameY = 0;
        this.currFrame = 0;
    }
    draw(ctx) {
        // ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
        ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
    }
    update() {
        if (this.y === this.canvasHeight + this.height) {
            let idx = this.gameState.missiles.findIndex(el => el.id === this.id);
            this.gameState.missiles = this.gameState.missiles.toSpliced(idx, 1);
        }
        if (this.currFrame < this.maxFrame) this.currFrame++;
        else this.currFrame = this.minFrame;
        this.currFrameX = this.currFrame % 2;
        this.currFrameY = Math.floor(this.currFrame / 2);
        this.y -= 3;
    }
}

const shoot = (gameState) => {
    const missile = new Missile('assets/laser-bolts.png', gameState.canvas.canvasWidth, gameState.canvas.canvasHeight, 16, 32, 1, 0, 1, gameState);
    gameState.missiles.push(missile);
}

const createImage = (src) => {
    let img = new Image();
    img.src = src;
    return img;
};

const updateOccupiedSpace = (x, y, width, height, id, gameState) => {
    gameState.occupiedSpace.set(id, {
        x: x,
        y: y,
        dx: width / 2,
        dy: height / 2,
    });
};
