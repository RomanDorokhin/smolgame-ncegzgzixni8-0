let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

export const playSound = (type) => {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'jump') {
    o.type = 'sine';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now);
    o.stop(now + 0.1);
  } else if (type === 'collect') {
    o.type = 'triangle';
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now);
    o.stop(now + 0.1);
  } else if (type === 'death') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    g.gain.setValueAtTime(0.2, now);
    g.gain.linearRampToValueAtTime(0, now + 0.3);
    o.start(now);
    o.stop(now + 0.3);
  } else if (type === 'morph') {
    o.type = 'sine';
    o.frequency.setValueAtTime(100, now);
    o.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    o.start(now);
    o.stop(now + 0.5);
  } else if (type === 'shoot') {
    o.type = 'square';
    o.frequency.setValueAtTime(800, now);
    o.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    o.start(now);
    o.stop(now + 0.05);
  }
};
