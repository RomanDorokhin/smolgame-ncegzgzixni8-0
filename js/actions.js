import { G } from './gameState.js';

/** Избегаем циклических импортов: игры вызывают метаморфоз через этот мост. */
export function triggerMorph(reason) {
  if (G.triggerMorph) {
    G.triggerMorph(reason);
  }
}
