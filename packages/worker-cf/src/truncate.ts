export const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;
