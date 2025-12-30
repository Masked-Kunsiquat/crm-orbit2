import type { Entity, Timestamp } from "../shared/types";

export interface Note extends Entity {
  title: string;
  body: string;
  createdAt: Timestamp;
}
