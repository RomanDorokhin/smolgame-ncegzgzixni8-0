/** Избегаем циклических импортов: игры вызывают метаморфоз через этот мост. */
export function triggerMorph(reason) {
  const fn = triggerMorph._impl;
  if (fn) fn(reason);
}
triggerMorph._impl = null;

export function registerMorphTrigger(fn) {
  triggerMorph._impl = fn;
}
