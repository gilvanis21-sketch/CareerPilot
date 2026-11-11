/** Mesures de qualité d'un classement. `ranked` = ids triés par score décroissant. */
export function precisionAtK(ranked: string[], relevant: Set<string>, k: number): number {
  const top = ranked.slice(0, k);
  return top.length ? top.filter((id) => relevant.has(id)).length / top.length : 0;
}
export function recallAtK(ranked: string[], relevant: Set<string>, k: number): number {
  return relevant.size ? ranked.slice(0, k).filter((id) => relevant.has(id)).length / relevant.size : 0;
}
