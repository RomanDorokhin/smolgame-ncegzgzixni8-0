import { G } from './gameState.js';

export function bindInput(canvas) {
  if (!G || !canvas) {
    console.error("Input binding failed: G or canvas missing");
    return;
  }

  // Key handlers
  window.addEventListener('keydown', e => { 
    let code = e.code;
    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      if (code === 'ArrowLeft') code = 'ArrowRight';
      else if (code === 'ArrowRight') code = 'ArrowLeft';
      else if (code === 'ArrowUp') code = 'ArrowDown';
      else if (code === 'ArrowDown') code = 'ArrowUp';
      else if (code === 'KeyA') code = 'KeyD';
      else if (code === 'KeyD') code = 'KeyA';
      else if (code === 'KeyW') code = 'KeyS';
      else if (code === 'KeyS') code = 'KeyW';
    }
    G.keys[code] = true; 
  });
  window.addEventListener('keyup', e => { 
    let code = e.code;
    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      if (code === 'ArrowLeft') code = 'ArrowRight';
      else if (code === 'ArrowRight') code = 'ArrowLeft';
      else if (code === 'ArrowUp') code = 'ArrowDown';
      else if (code === 'ArrowDown') code = 'ArrowUp';
      else if (code === 'KeyA') code = 'KeyD';
      else if (code === 'KeyD') code = 'KeyA';
      else if (code === 'KeyW') code = 'KeyS';
      else if (code === 'KeyS') code = 'KeyW';
    }
    G.keys[code] = false; 
  });

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
    G.touchDir = 0;
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
    let dx = t.clientX - touchStartX;
    let dy = t.clientY - touchStartY;
    let moveX = t.clientX - lastTouchX;

    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      dx = -dx;
      dy = -dy;
      moveX = -moveX;
    }
    
    // Swipe for Snake (1) or Jumper (0)
    if (G.gameMode === 0 || G.gameMode === 1) {
      const threshold = 20;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) { G.keys['ArrowRight'] = true; G.keys['ArrowLeft'] = false; } 
          else { G.keys['ArrowLeft'] = true; G.keys['ArrowRight'] = false; }
          if (G.gameMode === 1) { G.keys['ArrowUp'] = false; G.keys['ArrowDown'] = false; }
        } else if (G.gameMode === 1) {
          if (dy > 0) { G.keys['ArrowDown'] = true; G.keys['ArrowUp'] = false; } 
          else { G.keys['ArrowUp'] = true; G.keys['ArrowDown'] = false; }
          G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false;
        }
        if (G.gameMode === 1) {
          touchStartX = t.clientX;
          touchStartY = t.clientY;
        }
      }
    }

    if (G.gameMode === 2 || G.gameMode === 3) {
      if (moveX > 2) G.touchDir = 1;
      else if (moveX < -2) G.touchDir = -1;
      else G.touchDir = 0;
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
    
    let actualCode = code;
    
    el.addEventListener('touchstart', (e) => { 
      e.preventDefault(); 
      if (G.currentMod.name === 'ИНВЕРСИЯ') {
        if (code === 'ArrowLeft') actualCode = 'ArrowRight';
        else if (code === 'ArrowRight') actualCode = 'ArrowLeft';
        else if (code === 'ArrowUp') actualCode = 'ArrowDown';
        else if (code === 'ArrowDown') actualCode = 'ArrowUp';
      } else {
        actualCode = code;
      }
      G.keys[actualCode] = true; 
      if(actualCode==='ArrowUp') G.touchJump=true; 
    }, { passive: false });

    el.addEventListener('touchend', (e) => { 
      e.preventDefault(); 
      G.keys[actualCode] = false; 
      G.touchJump=false; 
    }, { passive: false });

    el.addEventListener('mousedown', () => { 
      if (G.currentMod.name === 'ИНВЕРСИЯ') {
        if (code === 'ArrowLeft') actualCode = 'ArrowRight';
        else if (code === 'ArrowRight') actualCode = 'ArrowLeft';
        else if (code === 'ArrowUp') actualCode = 'ArrowDown';
        else if (code === 'ArrowDown') actualCode = 'ArrowUp';
      } else {
        actualCode = code;
      }
      G.keys[actualCode] = true; 
      if(actualCode==='ArrowUp') G.touchJump=true; 
    });
    el.addEventListener('mouseup', () => { 
      G.keys[actualCode] = false; 
      G.touchJump=false; 
    });
  }
  setupBtn('btnUp', 'ArrowUp');
  setupBtn('btnDown', 'ArrowDown');
  setupBtn('btnLeft', 'ArrowLeft');
  setupBtn('btnRight', 'ArrowRight');
  setupBtn('fireBtn', 'Space');
}
