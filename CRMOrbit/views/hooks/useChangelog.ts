import changelog from "../../changelog.json";

export type ChangelogCommit = {
  hash: string;
  date: string;
  message: string;
};

export type Changelog = {
  version: string;
  generatedAt: string;
  commits: ChangelogCommit[];
};

/**
 * Hook to access the embedded changelog data.
 * The changelog is generated at build time from git history.
 */
export const useChangelog = (): Changelog => {
  return changelog as Changelog;
};
