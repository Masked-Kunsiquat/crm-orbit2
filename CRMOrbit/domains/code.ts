import type { Entity, EntityId } from "./shared/types";

export type CodeType =
  | "code.type.door"
  | "code.type.lockbox"
  | "code.type.alarm"
  | "code.type.gate"
  | "code.type.other";

export interface Code extends Entity {
  accountId: EntityId;
  label: string;
  codeValue: string;
  type: CodeType;
  notes?: string;
}
