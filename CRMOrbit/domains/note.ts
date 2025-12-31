import type { Entity } from "./shared/types";

export interface Note extends Entity {
  title: string;
  body: string;
}
