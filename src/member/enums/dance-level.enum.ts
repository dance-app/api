export enum DanceLevel {
  STARTER = 0,
  BEGINNER = 100,
  INTERMEDIARY = 200,
  CONFIRMED = 300,
  EXPERT = 400,
}

export function getLevelValue(levelName: string | null): number | null {
  const level = DanceLevel[levelName as keyof typeof DanceLevel];
  return level !== undefined ? level : null;
}

export function getLevelName(value: number | null): string | null {
  const levelNames = Object.keys(DanceLevel).filter(
    (key) =>
      isNaN(Number(key)) &&
      DanceLevel[key as keyof typeof DanceLevel] === value,
  );
  return levelNames.length > 0 ? levelNames[0] : null;
}
