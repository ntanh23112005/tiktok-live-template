// Calibrated against the original, unmodified 1254 × 1254 ImageGen sheet.
// Cell bounds clip adjacent poses. Ground anchors keep a constant world scale
// instead of stretching a prostrating person up to standing height.
export const ART = {
  background: '/assets/wooden-temple-v1/background.png',
  sheet: '/assets/wooden-temple-v1/devotee-sheet.png',
  width: 1254, height: 1254, columns: 4, rows: 2,
  standingHeight: 561,
  anchors: [
    [158.5, 599], [159, 596], [189.5, 600], [180.5, 593],
    [153.5, 541], [155, 533], [161, 527], [148.5, 508],
  ],
};

export function createPose(index, standingHeight = 330) {
  const frame = document.createElement('span');
  const scale = standingHeight / ART.standingHeight;
  const cellWidth = ART.width / ART.columns, cellHeight = ART.height / ART.rows;
  const [x, ground] = ART.anchors[index];
  frame.className = 'sprite-cell'; frame.dataset.pose = index; frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    width: `${cellWidth * scale}px`, height: `${cellHeight * scale}px`,
    left: `calc(50% - ${x * scale}px)`, bottom: `${-(cellHeight - ground) * scale}px`,
    backgroundImage: `url("${ART.sheet}")`,
    backgroundSize: `${ART.width * scale}px ${ART.height * scale}px`,
    backgroundPosition: `${-(index % ART.columns) * cellWidth * scale}px ${-Math.floor(index / ART.columns) * cellHeight * scale}px`,
  });
  return frame;
}
