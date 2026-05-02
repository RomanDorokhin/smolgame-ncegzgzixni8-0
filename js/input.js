import { G } from './gameState.js';

export function bindInput(canvas) {
  if (!G || !canvas) {
    console.error("Input binding failed: G or canvas missing");
    return;
  }

  // Key handlers
  window.addEventListener('keydown', e => { G.keys[e.code] = true; });
  window.addEventListener('keyup', e => { G.keys[e.code] = false; });

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchX = 0;

  const handleStart = (e) => {
    if (G.paused || !G.running) return;
    const t = e.touches ? e.touches[0] : e;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastTouchX = t.clientX;
    
    // Tap to jump for Jumper (0) or Flappy (4)
    if (G.gameMode === 0 || G.gameMode === 4) {
      G.touchJump = true;
    }
  };

  const handleEnd = () => {
    G.touchJump = false;
    if (G.gameMode === 2 || G.gameMode === 3) {
      G.keys['ArrowLeft'] = false;
      G.keys['ArrowRight'] = false;
    }
  };

  canvas.addEventListener('touchstart', handleStart, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (G.paused || !G.running) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    
    if (G.gameMode === 1) {
      const threshold = 30;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) G.keys['ArrowRight'] = true; else G.keys['ArrowLeft'] = true;
          G.keys['ArrowUp'] = false; G.keys['ArrowDown'] = false;
        } else {
          if (dy > 0) G.keys['ArrowDown'] = true; else G.keys['ArrowUp'] = true;
          G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false;
        }
        touchStartX = t.clientX;
        touchStartY = t.clientY;
      }
    }

    if (G.gameMode === 2 || G.gameMode === 3) {
      const moveX = t.clientX - lastTouchX;
      if (moveX > 2) { G.keys['ArrowRight'] = true; G.keys['ArrowLeft'] = false; }
      else if (moveX < -2) { G.keys['ArrowLeft'] = true; G.keys['ArrowRight'] = false; }
      else { G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false; }
      lastTouchX = t.clientX;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', handleEnd);
  
  // Desktop fallbacks
  window.addEventListener('mousedown', handleStart);
  window.addEventListener('mouseup', handleEnd);

  // D-pad button support
  function setupBtn(id, code) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); G.keys[code] = true; if(code==='ArrowUp') G.touchJump=true; }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); G.keys[code] = false; G.touchJump=false; }, { passive: false });
    el.addEventListener('mousedown', () => { G.keys[code] = true; if(code==='ArrowUp') G.touchJump=true; });
    el.addEventListener('mouseup', () => { G.keys[code] = false; G.touchJump=false; });
  }
  setupBtn('btnUp', 'ArrowUp');
  setupBtn('btnDown', 'ArrowDown');
  setupBtn('btnLeft', 'ArrowLeft');
  setupBtn('btnRight', 'ArrowRight');
  setupBtn('fireBtn', 'Space');
}
