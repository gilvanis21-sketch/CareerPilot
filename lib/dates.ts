export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);

/** Minuit (début du jour) dans un fuseau donné, indépendamment du fuseau du serveur. */
export function startOfDay(now = new Date(), tz = "Europe/Paris"): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const guess = new Date(`${ymd}T00:00:00Z`);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(guess).map((x) => [x.type, x.value]),
  );
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(guess.getTime() - (wall - guess.getTime()));
}
