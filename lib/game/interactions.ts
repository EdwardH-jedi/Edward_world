import type { InteractionAction, Player, WorldObject } from "@/types/world";

function horizontalGap(player: Player, object: WorldObject) {
  const playerLeft = player.position.x;
  const playerRight = player.position.x + player.size.width;
  const objectLeft = object.position.x;
  const objectRight = object.position.x + object.size.width;

  if (playerRight < objectLeft) return objectLeft - playerRight;
  if (objectRight < playerLeft) return playerLeft - objectRight;
  return 0;
}

export function findNearestInteractable(
  player: Player,
  objects: readonly WorldObject[],
) {
  return objects
    .map((object) => ({ object, distance: horizontalGap(player, object) }))
    .filter(({ object, distance }) => distance <= object.interactionRange)
    .sort((a, b) => a.distance - b.distance)[0]?.object;
}

export function getInteractionPrompt(action: InteractionAction) {
  switch (action.type) {
    case "OPEN_PROJECT":
    case "OPEN_INFO":
      return "E TO ENTER";
    case "TALK":
      return "E TO TALK";
    case "READ":
      return "E TO READ";
  }
}
