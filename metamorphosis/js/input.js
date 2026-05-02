import { G } from './gameState.js';

export function bindInput(canvas) {
  G.keys = {};
  G.touchJump = false;

  document.addEventListener('keydown', e => {
    G.keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') G.touchJump = true;
  });
  document.addEventListener('keyup', e => {
    G.keys[e.code] = false;
    G.touchJump = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(G.keys)) G.keys[k] = false;
    G.touchJump = false;
  });

  function setupBtn(id, code) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      G.keys[code] = true;
      if (code === 'ArrowUp' || code === 'Space') G.touchJump = true;
    }, { passive: false });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      G.keys[code] = false;
      G.touchJump = false;
    }, { passive: false });
    el.addEventListener('mousedown', () => {
      G.keys[code] = true;
      if (code === 'ArrowUp' || code === 'Space') G.touchJump = true;
    });
    el.addEventListener('mouseup', () => {
      G.keys[code] = false;
      G.touchJump = false;
    });
  }
  setupBtn('btnUp', 'ArrowUp');
  setupBtn('btnDown', 'ArrowDown');
  setupBtn('btnLeft', 'ArrowLeft');
  setupBtn('btnRight', 'ArrowRight');

  canvas.addEventListener('touchstart', e => { e.preventDefault(); G.touchJump = true; }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); G.touchJump = false; }, { passive: false });
}
