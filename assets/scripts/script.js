window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  canvas.width = 1024;
  canvas.height = 768;
  const fps = 60;
  const ctx = canvas.getContext('2d');

  //global state jej
  let gameState = {
    shipMovingLeft: false,
    shipMovingRight: false,
    currentScore: null,
    highScore: null,
    paused: false,
    bg: new Bg('assets/back.png', canvas.width, canvas.height),
    player: new Ship('player', 'assets/ship.png', canvas.width, canvas.height, 16, 24, 2.5, 0, 9),
    enemies: [new Ship('enemy', 'assets/enemy-medium.png', canvas.width, canvas.height, 32, 16, 2, 0, 1)],
    asteroids: [],
  };

  // const ship = new Ship('player', 'assets/ship.png', canvas.width, canvas.height);
  // const bg = new Bg('assets/back.png', canvas.width, canvas.height);

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
  }});

  
  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState.bg.draw(ctx);
    gameState.bg.update();
    gameState.enemies.forEach(enemy => {
      enemy.draw(ctx);
      enemy.update('');
    });
    gameState.player.draw(ctx);
    let direction = gameState.shipMovingLeft ? 'left' : gameState.shipMovingRight ? 'right' : '';
    gameState.player.update(direction);
    setTimeout(() => requestAnimationFrame(gameLoop), 1000/fps);
  };

  gameLoop();
});


class Bg {
  constructor(src, canvasWidth, canvasHeight) {
    this.image1 = createImage(src, 'bg1');
    this.image2 = createImage(src, 'bg2');
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.y1 = 0;
    this.y2 = this.y1 - this.canvasHeight;
  }
  draw(ctx) {
    ctx.drawImage(this.image1, 0, this.y1, this.canvasWidth, this.canvasHeight);
    ctx.drawImage(this.image2, 0, this.y2, this.canvasWidth, this.canvasHeight);
  }
  update() {
    if (this.y1 < this.canvasHeight) {
      this.y1+=2;
      this.y2+=2;
    } else {
      this.y1 = 0;
      this.y2 = this.y1 - this.canvasHeight;
    }
  }
}

class Ship {
  constructor(type, src, canvasWidth, canvasHeight, spriteWidth, spriteHeight, scale, minFrame, maxFrame){
    this.type = type;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight; 
    this.image = createImage(src);
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.scale = scale;
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    //mora drugacije za mene i za neprijatelje
    if (this.type === 'player') {
      this.x = this.canvasWidth / 2 - this.width / 2;
      this.y = this.canvasHeight - this.height;
    } else {
      this.x = Math.floor(Math.random() * (this.canvasWidth - 2 * this.spriteWidth));
      this.y = 0 + this.height;
    }
    this.minFrame = minFrame;
    this.maxFrame = maxFrame;
    this.currFrame = 0;
    this.currFrameX = 0;
    this.currFrameY = 0;
    //prebrza je animacija, moram nekako da je usporim
    this.iteration = 0;
  }
  draw(ctx) {
    ctx.drawImage(this.image, this.currFrameX * this.spriteWidth, this.currFrameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
  }
  update(direction = '') {
    if (this.iteration < 3) {
      this.iteration+=1;
      return;
    }
    this.iteration = 0;
    if (this.currFrame < this.maxFrame) this.currFrame++;
    else this.currFrame = this.minFrame;
    this.currFrameX = this.currFrame % 5;
    this.currFrameY = Math.floor(this.currFrame / 5);
    if (direction === 'left' && this.x > 0) this.x-=15;
    else if (direction === 'right' && this.x < this.canvasWidth - this.width) this.x+=15;
  }
}

const createImage = (src) => {
  let img = new Image();
  img.src = src;
  return img;
};
