//global state jej
const gameState = {
  lastTime: 0,
  fps: 60,
  canvas: {
    width: 1024,
    height: 768,
  },
  lives: 3,
  shipMovingLeft: false,
  shipMovingRight: false,
  currentScore: null,
  highScore: null,
  running: false,
  paused: false,
  lost: false,
  bg: null,
  player: null,
  enemies: new Map(),
  asteroids: new Map(),
  missiles: new Map(),
  explosions: new Map(),
};
//http://127.0.0.1:8000/
//TODO: pauza, legenda, zivoti, muzika?
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  canvas.width = gameState.canvas.width;
  canvas.height = gameState.canvas.height;
  const ctx = canvas.getContext('2d');


  gameState.bg = new Bg('assets/back.png');
  gameState.player = new Ship('player', 'assets/ship.png', 16, 24, 2.5, 0, 9, 5);
  const enemy = new Ship('enemy', 'assets/enemy-medium.png', 32, 16, 2, 0, 1, 2);
  gameState.enemies.set(enemy.id, enemy);
  const asteroid = new Asteroid('assets/asteroid.png', 160, 160, 0.4, 0, 0, 1);
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
    } else if (event.key === 'Enter') {
      if (gameState.lost || !gameState.running) {
        resetGameState();
      }
    } else if (event.key === 'p') {
      gameState.paused = !gameState.paused;
    }
  });


  function gameLoop(timestamp) {
    if (!timestamp) timestamp = performance.now();
    let delta = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState.bg.update();
    gameState.bg.draw(ctx);
    if (!gameState.running || gameState.paused || gameState.lost) {
      renderText(ctx);
    } else {
      gameState.enemies.values().forEach(enemy => {
        enemy.update(delta);
        enemy.draw(ctx);
      });
      gameState.asteroids.values().forEach(asteroid => {
        asteroid.update();
        asteroid.draw(ctx);
      });
      gameState.missiles.values().forEach(missile => {
        missile.handleCollisions();
        missile.update(delta);
        missile.draw(ctx);
      });
      gameState.explosions.values().forEach(boom => {
        boom.update(delta);
        boom.draw(ctx);
      });
    }
    gameState.player.update(delta);
    gameState.player.draw(ctx);
    setTimeout(() => requestAnimationFrame(gameLoop), 1000 / gameState.fps);
  };

  gameLoop();
});

class GameObject {
  constructor(src) {
    this.image = createImage(src);
    this.canvasWidth = gameState.canvas.width;
    this.canvasHeight = gameState.canvas.height;
    this.id = crypto.randomUUID();
  }
}

class Sprite extends GameObject {
  constructor(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow) {
    super(src);
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.scale = scale || 1;
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    this.minFrame = minFrame;
    this.maxFrame = maxFrame;
    this.currentFrame = 0;
    this.currFrameX = 0;
    this.currFrameY = 0;
    this.framesPerRow = framesPerRow;
    this.frameTimer = 0;
    this.x = 0;
    this.y = 0;
    this.frameInterval = 50;
    this.duration = 0;
    this.hitCounter = 3;
  }
  draw(ctx) {
    ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
  }
  update(delta) {
    if (this.duration > 500) {
      gameState.explosions.delete(this.id);
    }
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
  }
}


class Bg extends GameObject {
  constructor(src) {
    super(src);
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
  constructor(type, src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow) {
    super(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow);
    this.type = type;
    //mora drugacije za mene i za neprijatelje
    if (this.type === 'player') {
      this.x = this.canvasWidth / 2 - this.width / 2;
      this.y = this.canvasHeight - this.height - 5; //mnogo je zakucano za dno
    } else {
      this.x = Math.floor(Math.random() * (this.canvasWidth - 2 * this.spriteWidth));
      this.y = this.height / this.scale;
    }
    //smanji fps zbog epilepsije
    this.frameInterval = 100;
    //TODO: hit counter, collision detection, hit counter
  }
  update(delta) {
    if (this.frameTimer > this.frameInterval) {
      if (this.currentFrame < this.maxFrame) this.currentFrame++;
      else this.currentFrame = this.minFrame;
      this.currFrameX = this.currentFrame % this.framesPerRow;
      this.currFrameY = Math.floor(this.currentFrame / this.framesPerRow);
      this.frameTimer = 0;
    } else {
      this.frameTimer += delta;
    }
    if (this.type === 'player') this.move();
  }
  move() {
    if (gameState.shipMovingLeft && this.x > 0) this.x -= 15;
    else if (gameState.shipMovingRight && this.x < this.canvasWidth - this.width) this.x += 15;
  }
  hit() {
    if (this.type === 'enemy') {
      if (this.hitCounter == 1) gameState.enemies.delete(this.id);
      this.hitCounter -= 1;
    }
  }
}

class Asteroid extends Sprite {
  constructor(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow) {
    super(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow);
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
  }
  update() {
    if (this.y === this.canvasHeight + this.height) {
      gameState.asteroids.delete(this.id);
    }
    this.rotationCounter += 2;
    this.y += 1;
  }
  hit() {
    if (this.hitCounter == 1) gameState.asteroids.delete(this.id);
    this.hitCounter -= 1;
  }
}

class Missile extends Sprite {
  constructor(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow) {
    super(src, spriteWidth, spriteHeight, scale, minFrame, maxFrame, framesPerRow);
    this.x = gameState.player.x + 4; //4 iz nekog razloga centrira, ne znam zasto izgleda lose bez cetvorke
    this.y = gameState.player.y - gameState.player.height / 2 - this.height / 2;
    this.frameInterval = 50;
  }
  draw(ctx) {
    ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
  }
  update(delta) {
    if (this.y === this.canvasHeight + this.height) {
      gameState.missiles.delete(this.id);
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
  onCollision(thing, hit) {
    gameState[thing].get(hit.id).hit();
    gameState.missiles.delete(this.id);
    explode(hit);
  }
  handleCollisions() {
    const coords = { x: this.x, y: this.y };
    const hitEnemy = getCollisions('enemies', coords);
    if (hitEnemy) {
      this.onCollision('enemies', hitEnemy);
    }
    const hitAsteroid = getCollisions('asteroids', coords);
    if (hitAsteroid) {
      this.onCollision('asteroids', hitAsteroid);
    }
  }
}

const shoot = () => {
  const missile = new Missile('assets/laser-bolts.png', 16, 32, 2, 0, 1, 2);
  gameState.missiles.set(missile.id, missile);
};

const explode = (hit) => {
  const boom = new Sprite('assets/explosion.png', 16, 16, 2, 0, 4, 5);
  boom.x = hit.x + hit.width / 2 - boom.scale;
  boom.y = hit.y + hit.height / 2 - boom.scale;
  gameState.explosions.set(boom.id, boom);
};


const createImage = (src) => {
  let img = new Image();
  img.src = src;
  return img;
};

const getCollisions = (thing, coords) => {
  const positions = gameState[thing].values().map(col => {
    return {
      id: col.id,
      x: col.x,
      y: col.y,
      width: col.width,
      height: col.height,
    };
  }).toArray();
  const hits = positions.filter(pos => coords.y <= pos.y + pos.height / 2 && (coords.x >= pos.x - pos.width / 2 && coords.x <= pos.x + pos.width / 2));
  return hits.length > 0 ? hits[0] : null;
}

const renderText = (ctx) => {
  ctx.fillStyle = "rgb(0 0 0 / 30%)";
  ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
  ctx.fillStyle = "rgb(117 9 176 / 50%)";
  ctx.fillRect(20, 250, 984, 250);
  ctx.fillStyle = "rgb(255 255 255 / 100%)";
  const text = gameState.paused ? 'PAUSED' : gameState.lost ? 'GAME OVER' : 'PRESS ENTER TO START';
  ctx.font = "48px Doto";
  const textSize = ctx.measureText(text);
  const textX = (984 - textSize.width) / 2;
  const textY = (250 - 48) / 2;
  ctx.fillText(text, textX + 20, textY + 250);
};

const resetGameState = () => {
  gameState.running = true;
  gameState.lost = false;
  gameState.paused = false;
  gameState.lives = 3;
  gameState.shipMovingLeft = false;
  gameState.shipMovingRight = false;
}
