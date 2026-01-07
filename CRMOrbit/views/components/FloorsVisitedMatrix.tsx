import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { Audit } from "@domains/audit";
import type { Account } from "@domains/account";
import type { EntityId } from "@domains/shared/types";
import { getAuditStartTimestamp, sortAuditsByDescendingTime } from "../utils/audits";
import { useTheme } from "../hooks";

type FloorsVisitedMatrixVisit = {
  id: EntityId;
  label: string;
  visited: ReadonlySet<number>;
  isCurrent: boolean;
};

export type FloorsVisitedMatrixData = {
  floors: number[];
  visits: FloorsVisitedMatrixVisit[];
  excludedFloors: ReadonlySet<number>;
};

type BuildMatrixOptions = {
  audits: Audit[];
  account?: Account;
  currentAuditId?: EntityId;
  maxVisits?: number;
};

const CELL_SIZE = 18;
const CELL_GAP = 6;
const LABEL_WIDTH = 36;

const normalizeFloor = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
};

const formatAuditLabel = (audit: Audit): string => {
  const timestamp = getAuditStartTimestamp(audit);
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const selectAudits = (
  audits: Audit[],
  currentAuditId?: EntityId,
  maxVisits?: number,
): Audit[] => {
  const sorted = [...audits].sort(sortAuditsByDescendingTime);
  if (sorted.length === 0) return [];

  if (currentAuditId) {
    const index = sorted.findIndex((audit) => audit.id === currentAuditId);
    if (index !== -1) {
      const limit = maxVisits ?? sorted.length;
      return sorted.slice(index, index + limit);
    }
  }

  if (maxVisits) {
    return sorted.slice(0, maxVisits);
  }

  return sorted;
};

export const buildFloorsVisitedMatrix = ({
  audits,
  account,
  currentAuditId,
  maxVisits,
}: BuildMatrixOptions): FloorsVisitedMatrixData | null => {
  const selectedAudits = selectAudits(audits, currentAuditId, maxVisits);
  if (selectedAudits.length === 0) return null;

  const derivedFloors = new Set<number>();
  selectedAudits.forEach((audit) => {
    audit.floorsVisited?.forEach((floor) => {
      const normalized = normalizeFloor(floor);
      if (normalized !== null) {
        derivedFloors.add(normalized);
      }
    });
  });
  account?.excludedFloors?.forEach((floor) => {
    const normalized = normalizeFloor(floor);
    if (normalized !== null) {
      derivedFloors.add(normalized);
    }
  });

  let minFloor = account?.minFloor;
  let maxFloor = account?.maxFloor;
  const derivedList = Array.from(derivedFloors);
  if (derivedList.length > 0) {
    const derivedMin = Math.min(...derivedList);
    const derivedMax = Math.max(...derivedList);
    if (minFloor === undefined) minFloor = derivedMin;
    if (maxFloor === undefined) maxFloor = derivedMax;
  }

  if (minFloor === undefined || maxFloor === undefined) return null;

  if (minFloor > maxFloor) {
    [minFloor, maxFloor] = [maxFloor, minFloor];
  }

  const floors: number[] = [];
  for (let floor = maxFloor; floor >= minFloor; floor -= 1) {
    floors.push(floor);
  }

  const excludedFloors = new Set<number>();
  account?.excludedFloors?.forEach((floor) => {
    const normalized = normalizeFloor(floor);
    if (normalized !== null) {
      excludedFloors.add(normalized);
    }
  });

  const visits: FloorsVisitedMatrixVisit[] = selectedAudits.map((audit) => {
    const visited = new Set<number>();
    audit.floorsVisited?.forEach((floor) => {
      const normalized = normalizeFloor(floor);
      if (normalized !== null) {
        visited.add(normalized);
      }
    });
    return {
      id: audit.id,
      label: formatAuditLabel(audit),
      visited,
      isCurrent: audit.id === currentAuditId,
    };
  });

  return { floors, visits, excludedFloors };
};

type FloorsVisitedMatrixProps = {
  data: FloorsVisitedMatrixData;
};

export const FloorsVisitedMatrix = ({ data }: FloorsVisitedMatrixProps) => {
  const { colors } = useTheme();
  const { floors, visits, excludedFloors } = data;
  const headerTextStyle = useMemo(
    () => [styles.headerText, { color: colors.textSecondary }],
    [colors.textSecondary],
  );
  const labelTextStyle = useMemo(
    () => [styles.labelText, { color: colors.textSecondary }],
    [colors.textSecondary],
  );

  return (
    <View style={styles.matrixContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            <View style={styles.labelSpacer} />
            {visits.map((visit) => (
              <View
                key={visit.id}
                style={[
                  styles.headerCell,
                  {
                    borderColor: visit.isCurrent
                      ? colors.accent
                      : colors.border,
                  },
                  visit.isCurrent && { backgroundColor: colors.accentMuted },
                ]}
              >
                <Text style={headerTextStyle}>{visit.label}</Text>
              </View>
            ))}
          </View>

          {floors.map((floor) => (
            <View key={floor} style={styles.row}>
              <View style={styles.labelCell}>
                <Text style={labelTextStyle}>{floor}</Text>
              </View>
              {visits.map((visit) => {
                const isExcluded = excludedFloors.has(floor);
                const isVisited = visit.visited.has(floor);
                return (
                  <View
                    key={`${visit.id}-${floor}`}
                    style={[
                      styles.cell,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                      isExcluded && {
                        backgroundColor: colors.borderLight,
                        borderColor: colors.border,
                      },
                      isVisited && {
                        backgroundColor: colors.success,
                        borderColor: colors.success,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  matrixContainer: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: CELL_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelSpacer: {
    width: LABEL_WIDTH,
    marginRight: CELL_GAP,
  },
  labelCell: {
    width: LABEL_WIDTH,
    marginRight: CELL_GAP,
    alignItems: "flex-end",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginRight: CELL_GAP,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 9,
    fontWeight: "600",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginRight: CELL_GAP,
    marginBottom: CELL_GAP,
    borderRadius: 4,
    borderWidth: 1,
  },
});
