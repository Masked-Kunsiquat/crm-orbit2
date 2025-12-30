export type DocMutator<T> = (doc: T) => T;

export type MergeAdapter<T> = {
  clone: (doc: T) => T;
  merge: (left: T, right: T) => T;
};

export type InvariantCheck<T> = (doc: T) => void;

export const applyMutators = <T>(base: T, mutators: DocMutator<T>[]): T => {
  return mutators.reduce((doc, mutate) => mutate(doc), base);
};

export const simulateDivergence = <T>(
  base: T,
  adapter: MergeAdapter<T>,
  mutatorsA: DocMutator<T>[],
  mutatorsB: DocMutator<T>[],
): { docA: T; docB: T } => {
  const baseA = adapter.clone(base);
  const baseB = adapter.clone(base);

  return {
    docA: applyMutators(baseA, mutatorsA),
    docB: applyMutators(baseB, mutatorsB),
  };
};

export const mergeDivergentDocs = <T>(
  adapter: MergeAdapter<T>,
  docA: T,
  docB: T,
): T => {
  return adapter.merge(docA, docB);
};

export const assertInvariants = <T>(
  doc: T,
  checks: InvariantCheck<T>[],
): void => {
  for (const check of checks) {
    check(doc);
  }
};
