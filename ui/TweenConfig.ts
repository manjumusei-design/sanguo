export const TWEEN = { //mostly just for reusability+centralization and consistency for UI animations
  hover: { duration: 120, ease: 'Sine.easeOut' },
  play: { duration: 250, ease: 'Quad.easeInOut' },
  return: { duration: 300, ease: 'Back.easeOut' },
  discard: { duration: 200, ease: 'Cubic.easeIn' },
  exhaust: { duration: 400, ease: 'Sine.easeInOut' },
  pulse: { duration: 150, ease: 'Sine.easeInOut' },
  shake: { duration: 50, ease: 'Linear' },
  intentPulse: { duration: 500, ease: 'Sine.easeInOut' },
  fanTransition: { duration: 180, ease: 'Sine.easeOut' },
};

export type TweenKey = keyof typeof TWEEN;
