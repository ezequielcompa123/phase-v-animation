const canvas = document.querySelector("#constellation");
const context = canvas.getContext("2d");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const TAU = Math.PI * 2;
const LOGO_HOLD_SECONDS = 4;
const MORPH_SECONDS = 2.2;
const WAVE_HOLD_SECONDS = 5.5;
const CYCLE_SECONDS = LOGO_HOLD_SECONDS + MORPH_SECONDS * 2 + WAVE_HOLD_SECONDS;
const RINGS = [
  {
    radius: 0.7,
    rows: 3,
    speed: 0.012,
    phase: 0,
    segments: [
      { start: 0.003125, end: 0.115625, filled: true },
      { start: 0.128125, end: 0.240625, filled: false },
      { start: 0.253125, end: 0.365625, filled: false },
      { start: 0.378125, end: 0.490625, filled: true },
      { start: 0.503125, end: 0.615625, filled: false },
      { start: 0.628125, end: 0.740625, filled: true },
      { start: 0.753125, end: 0.865625, filled: true },
      { start: 0.878125, end: 0.990625, filled: false },
    ],
  },
  {
    radius: 0.57,
    rows: 3,
    speed: -0.019,
    phase: 0.035,
    segments: [
      { start: 0.003125, end: 0.157292, filled: false },
      { start: 0.169792, end: 0.323958, filled: true },
      { start: 0.336458, end: 0.490625, filled: false },
      { start: 0.503125, end: 0.657292, filled: false },
      { start: 0.669792, end: 0.823958, filled: true },
      { start: 0.836458, end: 0.990625, filled: false },
    ],
  },
  {
    radius: 0.44,
    rows: 3,
    speed: 0.026,
    phase: 0.08,
  },
];

const SEGMENTS = [
  { start: 0.003125, end: 0.240625, filled: true },
  { start: 0.253125, end: 0.490625, filled: false },
  { start: 0.503125, end: 0.740625, filled: true },
  { start: 0.753125, end: 0.990625, filled: false },
];

let viewportWidth = 0;
let viewportHeight = 0;
let density = 1;
let centerX = 0;
let centerY = 0;
let logoRadius = 0;
let animationFrame = 0;
let lastTimestamp = performance.now();
let elapsedSeconds = 0;

function resize() {
  density = Math.min(window.devicePixelRatio || 1, 2);
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  canvas.width = Math.round(viewportWidth * density);
  canvas.height = Math.round(viewportHeight * density);
  context.setTransform(density, 0, 0, density, 0, 0);

  logoRadius = viewportWidth * 0.64;
  centerX = viewportWidth / 2;
  centerY = viewportHeight / 2;
}

function drawCross(x, y, size, rotation) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.strokeStyle = "#b8a6ff";
  context.lineWidth = Math.max(1.1, size * 0.42);
  context.lineCap = "butt";
  context.beginPath();
  context.moveTo(-size, -size);
  context.lineTo(size, size);
  context.moveTo(size, -size);
  context.lineTo(-size, size);
  context.stroke();
  context.restore();
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getMorphAmount(time) {
  const cycle = time % CYCLE_SECONDS;

  if (cycle < LOGO_HOLD_SECONDS) return 0;
  if (cycle < LOGO_HOLD_SECONDS + MORPH_SECONDS) {
    return easeInOutCubic((cycle - LOGO_HOLD_SECONDS) / MORPH_SECONDS);
  }
  if (cycle < LOGO_HOLD_SECONDS + MORPH_SECONDS + WAVE_HOLD_SECONDS) return 1;

  const returnProgress =
    (cycle - LOGO_HOLD_SECONDS - MORPH_SECONDS - WAVE_HOLD_SECONDS) /
    MORPH_SECONDS;
  return 1 - easeInOutCubic(returnProgress);
}

function drawRing(ring, ringIndex, time, morphAmount) {
  const baseRotation = (time * ring.speed + ring.phase) * TAU;
  const crossSize = Math.max(2, Math.min(3, logoRadius * 0.0095));
  const cellSize = crossSize * 3.15;
  const radialStep = cellSize;
  const firstRowOffset = -((ring.rows - 1) * radialStep) / 2;
  const baseRadius = logoRadius * ring.radius;

  const segments = ring.segments || SEGMENTS;

  segments.forEach(({ start, end, filled }) => {
    const segmentIsFilled = ringIndex % 2 === 0 ? filled : !filled;
    const arcLength = (end - start) * TAU * baseRadius;
    const count = Math.max(2, Math.floor(arcLength / cellSize));

    for (let index = 0; index < count; index += 1) {
      const progress = (index + 0.5) / count;
      const position = start + (end - start) * progress;
      const angle = position * TAU + baseRotation;

      for (let row = 0; row < ring.rows; row += 1) {
        const isBorder =
          row === 0 ||
          row === ring.rows - 1 ||
          index === 0 ||
          index === count - 1;

        if (!segmentIsFilled && !isBorder) continue;

        const rowOffset = firstRowOffset + row * radialStep;
        const radius = baseRadius + rowOffset;
        const ringX = centerX + Math.cos(angle) * radius;
        const ringY = centerY + Math.sin(angle) * radius;

        const waveWidth = logoRadius * 1.55;
        const waveSpacing = logoRadius * 0.15;
        const isOuterWave = ringIndex !== 1;
        const waveAmplitude = logoRadius * (isOuterWave ? 0.24 : 0.08);
        const waveDirection = ringIndex === 2 ? -1 : 1;
        const wavePhase =
          position * TAU * (isOuterWave ? 1.45 : 1.65) -
          time * (isOuterWave ? 1.35 : 1.1) +
          Math.sin(time * 0.3 + ringIndex * 0.7) * 0.16 +
          (ringIndex === 1 ? 1.1 : 0);
        const waveX = centerX + (position - 0.5) * waveWidth;
        const waveY =
          centerY +
          (ringIndex - 1) * waveSpacing +
          Math.sin(wavePhase) * waveAmplitude * waveDirection +
          rowOffset;

        drawCross(
          ringX + (waveX - ringX) * morphAmount,
          ringY + (waveY - ringY) * morphAmount,
          crossSize,
          baseRotation,
        );
      }
    }
  });
}

function drawSpacedText(text, x, y, spacing) {
  const widths = [...text].map((character) => context.measureText(character).width);
  const totalWidth =
    widths.reduce((total, width) => total + width, 0) + spacing * (text.length - 1);
  let cursor = x - totalWidth / 2;

  [...text].forEach((character, index) => {
    context.fillText(character, cursor, y);
    cursor += widths[index] + spacing;
  });
}

function drawWordmark(opacity = 1) {
  if (opacity <= 0.001) return;

  context.save();
  context.globalAlpha = opacity;
  context.fillStyle = "#b8a6ff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const nameSize = Math.max(25, logoRadius * 0.15);
  context.font = `500 ${nameSize}px Inter, "Helvetica Neue", Arial, sans-serif`;
  context.fillText("Phase V", centerX, centerY - nameSize * 0.16);

  const labsSize = Math.max(9, logoRadius * 0.043);
  context.font = `650 ${labsSize}px Inter, "Helvetica Neue", Arial, sans-serif`;
  drawSpacedText("LABS", centerX, centerY + nameSize * 0.72, labsSize * 0.55);
  context.restore();
}

function render(timestamp) {
  const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (!reduceMotionQuery.matches) {
    elapsedSeconds += delta;
  }

  context.clearRect(0, 0, viewportWidth, viewportHeight);
  const morphAmount = getMorphAmount(elapsedSeconds);
  RINGS.forEach((ring, index) =>
    drawRing(ring, index, elapsedSeconds, morphAmount),
  );
  drawWordmark(1 - morphAmount);

  animationFrame = requestAnimationFrame(render);
}

window.addEventListener("resize", resize, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animationFrame);
  } else {
    lastTimestamp = performance.now();
    animationFrame = requestAnimationFrame(render);
  }
});

resize();
animationFrame = requestAnimationFrame(render);
