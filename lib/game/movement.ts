export type HorizontalDirection = -1 | 0 | 1;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function movePlayerX({
  currentX,
  direction,
  deltaSeconds,
  speed,
  worldWidth,
  playerWidth,
}: {
  currentX: number;
  direction: HorizontalDirection;
  deltaSeconds: number;
  speed: number;
  worldWidth: number;
  playerWidth: number;
}) {
  const nextX = currentX + direction * speed * Math.max(0, deltaSeconds);
  return clamp(nextX, 0, worldWidth - playerWidth);
}

export function getCameraX({
  playerX,
  playerWidth,
  viewportWidth,
  worldWidth,
}: {
  playerX: number;
  playerWidth: number;
  viewportWidth: number;
  worldWidth: number;
}) {
  const desiredOffset = playerX + playerWidth / 2 - viewportWidth / 2;
  return clamp(desiredOffset, 0, Math.max(0, worldWidth - viewportWidth));
}
