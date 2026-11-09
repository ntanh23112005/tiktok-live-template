export const DRAW_END = .69;
export const WALL_TRAVEL_SECONDS = .42;
export function actionSeconds(rule) {
  return rule.kind === 'statue' ? rule.duration + 1.2 : rule.duration * DRAW_END + WALL_TRAVEL_SECONDS;
}
