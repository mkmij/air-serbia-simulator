//http://127.0.0.1:8000/
window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    //global state jej
    let gameState = {
        lastTime: 0,
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
        enemies: new Map(),
        asteroids: new Map(),
        occupiedSpace: new Map(),
        missiles: new Map(),
        explosions: new Map(),
    };

    gameState.bg = new Bg('assets/back.png', canvas.width, canvas.height, gameState);
    gameState.player = new Ship('player', 'assets/ship.png', canvas.width, canvas.height, 16, 24, 2.5, 0, 9, 5, gameState);
    const enemy = new Ship('enemy', 'assets/enemy-medium.png', canvas.width, canvas.height, 32, 16, 2, 0, 1, 2, gameState);
    gameState.enemies.set(enemy.id, enemy);
    const asteroid = new Asteroid('assets/asteroid.png', canvas.width, canvas.height, 160, 160, 0.4, 0, 0, 1, gameState);
    gameState.asteroids.set(asteroid.id, asteroid);

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


    function gameLoop(timestamp) {
        if (!timestamp) timestamp = performance.now();
        let delta = timestamp - gameState.lastTime;
        gameState.lastTime = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gameState.bg.update();
        gameState.bg.draw(ctx);
        gameState.enemies.values().forEach(enemy => {
            enemy.update('', delta);
            enemy.draw(ctx);
        });
        gameState.asteroids.values().forEach(asteroid => {
            asteroid.update();
            asteroid.draw(ctx);
        });
        gameState.missiles.values().forEach(missile => {
            missile.calculateCollisions();
            missile.update(delta);
            missile.draw(ctx);
        });
        gameState.explosions.values().forEach(boom => {
            boom.update(delta);
            boom.draw(ctx);
        });
        let direction = gameState.shipMovingLeft ? 'left' : gameState.shipMovingRight ? 'right' : '';
        gameState.player.update(direction, delta);
        gameState.player.draw(ctx);
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
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState) {
        super(src, canvasWidth, canvasHeight, gameState);
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.scale = scale || 1;
        this.minFrame = minFrame;
        this.maxFrame = maxFrame;
        this.currentFrame = 0;
        this.currFrameX = 0;
        this.currFrameY = 0;
        this.framesPerRow = framesPerRow;
        this.frameTimer = 0;
        this.x = 0;
        this.y = 0;
        this.frameInterval = 180;
        this.duration = 0;
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
    }
    update(delta) {
        if (this.duration < 1000) {
            if (this.frameTimer > this.frameInterval) {
                if (this.currentFrame < this.maxFrame) this.currentFrame++;
                else this.currentFrame = this.minFrame;
                this.currFrameX = this.currentFrame % this.framesPerRow;
                this.currFrameY = Math.floor(this.currentFrame / this.framesPerRow);
                this.frameTimer = 0;
            } else {
                this.frameTimer += delta;
            }
            this.duration += delta;
        } else {
            this.gameState.explosions.delete(this.id);
        }
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
    constructor(type, src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState);
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
        //smanji fps
        this.frameTimer = 0;
        this.frameInterval = 100;
    }
    draw(ctx) {
        //checkCollisions
        ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
        const id = this.type === 'player' ? 'player' : this.id;
        updateOccupiedSpace(this.x, this.y, this.width, this.height, id, this.gameState);
    }
    update(direction = '', delta) {
        if (this.frameTimer > this.frameInterval) {
            if (this.currentFrame < this.maxFrame) this.currentFrame++;
            else this.currentFrame = this.minFrame;
            this.currFrameX = this.currentFrame % this.framesPerRow;
            this.currFrameY = Math.floor(this.currentFrame / this.framesPerRow);
            this.frameTimer = 0;
        } else {
            this.frameTimer += delta;
        }
        if (direction === 'left' && this.x > 0) this.x -= 15;
        else if (direction === 'right' && this.x < this.canvasWidth - this.width) this.x += 15;
    }
}

class Asteroid extends Sprite {
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState);
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
            this.gameState.asteroids.delete(this.id);
        }
        this.rotationCounter += 2;
        this.y += 1;
    }
}

class Missile extends Sprite {
    constructor(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState) {
        super(src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow, gameState);
        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        this.x = this.gameState.player.x + 4;//4 iz nekog razloga centrira, ne znam zasto izgleda lose bez cetvorke
        this.y = this.gameState.player.y - this.gameState.player.height / 2 - this.height / 2;
        //smanji fps
        this.frameTimer = 0;
        this.frameInterval = 50;
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
    }
    update(delta) {
        if (this.y === this.canvasHeight + this.height) {
            this.gameState.missiles.delete(this.id);
        }
        if (this.frameTimer > this.frameInterval) {
            this.currFrameX = this.currentFrame % this.framesPerRow;
            this.currentFrame = this.currentFrame < this.maxFrame ? this.currentFrame += 1 : this.minFrame;
            this.frameTimer = 0;
        } else {
            this.frameTimer += delta;
        }
        this.y -= 8;
    }
    calculateCollisions() {
        const enemyPositions = this.gameState.enemies.values().map(enemy => {
            return {
                id: enemy.id,
                x: enemy.x,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height,
            };
        }).toArray();
        const hitEnemies = enemyPositions.filter(pos => this.y <= pos.y + pos.height / 2 && (this.x >= pos.x - pos.width / 2 && this.x <= pos.x + pos.width / 2));
        if (hitEnemies.length > 0) {
            console.log("enemy hit!!!");
            const hit = hitEnemies[0];
            this.gameState.enemies.delete(hit.id);
            this.gameState.missiles.delete(this.id);

            const explosion = explode(this.gameState);
            explosion.x = hit.x;
            explosion.y = hit.y;
            this.gameState.explosions.set(explosion.id, explosion);
        }
    }
}

const shoot = (gameState) => {
    const missile = new Missile('assets/laser-bolts.png', gameState.canvas.canvasWidth, gameState.canvas.canvasHeight, 16, 32, 2, 0, 1, 2, gameState);
    gameState.missiles.set(missile.id, missile);
};

const explode = (gameState) => {
    return new Sprite('assets/explosion.png', gameState.canvas.canvasWidth, gameState.canvas.canvasHeight, 16, 16, 1, 0, 4, 5, gameState);
};


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
