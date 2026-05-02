const { G } = await import('./js/gameState.js');
const { snake } = await import('./js/games/snake.js');

// Mock canvas and context
G.canvas = { width: 800, height: 600 };
G.ctx = {
  save: () => {}, restore: () => {}, beginPath: () => {}, fill: () => {}, stroke: () => {},
  moveTo: () => {}, lineTo: () => {}, fillRect: () => {}, strokeRect: () => {},
  arc: () => {}, ellipse: () => {}, fillText: () => {}, createRadialGradient: () => ({ addColorStop: () => {} })
};
G.W = () => 800;
G.H = () => 600;

// Mock triggerMorph
let morphTriggered = false;
G.triggerMorph = (reason) => {
  console.log('MORPH TRIGGERED:', reason);
  morphTriggered = true;
};

// Initialize
snake.init();
snake.huntingJumper = true;
snake.jumperPrey = { x: snake.body[snake.body.length - 1].x + 1, y: snake.body[snake.body.length - 1].y };
snake.dir = { x: 1, y: 0 };
snake.nextDir = { x: 1, y: 0 };
snake.timer = 100; // force update

console.log('Snake head before:', snake.body[snake.body.length - 1]);
console.log('Prey at:', snake.jumperPrey);
snake.update();
console.log('Snake head after:', snake.body[snake.body.length - 1]);
console.log('Morph triggered?', morphTriggered);

