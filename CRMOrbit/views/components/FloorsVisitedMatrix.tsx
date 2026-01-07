import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { Audit } from "@domains/audit";
import type { Account } from "@domains/account";
import type { EntityId } from "@domains/shared/types";
import {
  getAuditStartTimestamp,
  getAuditSortTimestamp,
  sortAuditsByDescendingTime,
} from "../utils/audits";
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

const CELL_SIZE = 20;
const HEADER_HEIGHT = 40;
const LABEL_WIDTH = 42;
const GRID_LINE_WIDTH = 1;

const normalizeFloor = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
};

const formatAuditLabel = (audit: Audit): string => {
  const timestamp = getAuditStartTimestamp(audit);
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--";
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (month && day) {
    return `${month}\n${day}`;
  }
  return formatter.format(date);
};

const selectAudits = (
  audits: Audit[],
  currentAuditId?: EntityId,
  maxVisits?: number,
): Audit[] => {
  const sorted = [...audits].sort(sortAuditsByDescendingTime);
  if (sorted.length === 0) return [];
  if (!maxVisits) return sorted;

  if (!currentAuditId) {
    return sorted.slice(0, maxVisits);
  }

  const current = sorted.find((audit) => audit.id === currentAuditId);
  if (!current) {
    return sorted.slice(0, maxVisits);
  }

  const selected: Audit[] = [current];
  for (const audit of sorted) {
    if (selected.length >= maxVisits) break;
    if (audit.id === currentAuditId) continue;
    selected.push(audit);
  }
  return selected;
};

export const buildFloorsVisitedMatrix = ({
  audits,
  account,
  currentAuditId,
  maxVisits,
}: BuildMatrixOptions): FloorsVisitedMatrixData | null => {
  const selectedAudits = selectAudits(audits, currentAuditId, maxVisits);
  if (selectedAudits.length === 0) return null;
  const orderedAudits = [...selectedAudits].sort(
    (left, right) =>
      getAuditSortTimestamp(left) - getAuditSortTimestamp(right),
  );

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

  const visits: FloorsVisitedMatrixVisit[] = orderedAudits.map((audit) => {
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
        <View
          style={[styles.grid, { borderColor: colors.border }]}
        >
          <View style={styles.row}>
            <View
              style={[
                styles.headerCell,
                styles.labelHeaderCell,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderBottomWidth: GRID_LINE_WIDTH,
                },
              ]}
            />
            {visits.map((visit, index) => (
              <View
                key={visit.id}
                style={[
                  styles.headerCell,
                  {
                    backgroundColor: visit.isCurrent
                      ? colors.accentMuted
                      : colors.surfaceElevated,
                    borderRightWidth:
                      index === visits.length - 1 ? 0 : GRID_LINE_WIDTH,
                    borderBottomWidth: GRID_LINE_WIDTH,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={headerTextStyle}>{visit.label}</Text>
              </View>
            ))}
          </View>

          {floors.map((floor, rowIndex) => (
            <View key={floor} style={styles.row}>
              <View
                style={[
                  styles.labelCell,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderBottomWidth:
                      rowIndex === floors.length - 1 ? 0 : GRID_LINE_WIDTH,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={labelTextStyle}>{floor}</Text>
              </View>
              {visits.map((visit, colIndex) => {
                const isExcluded = excludedFloors.has(floor);
                const isVisited = visit.visited.has(floor);
                return (
                  <View
                    key={`${visit.id}-${floor}`}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: colors.surface,
                        borderBottomWidth:
                          rowIndex === floors.length - 1 ? 0 : GRID_LINE_WIDTH,
                        borderRightWidth:
                          colIndex === visits.length - 1 ? 0 : GRID_LINE_WIDTH,
                        borderColor: colors.border,
                      },
                      isExcluded && {
                        backgroundColor: colors.borderLight,
                      },
                      isVisited && {
                        backgroundColor: colors.success,
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
  grid: {
    borderWidth: GRID_LINE_WIDTH,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelHeaderCell: {
    width: LABEL_WIDTH,
    height: HEADER_HEIGHT,
    borderRightWidth: GRID_LINE_WIDTH,
  },
  labelCell: {
    width: LABEL_WIDTH,
    height: CELL_SIZE,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 6,
    borderRightWidth: GRID_LINE_WIDTH,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerCell: {
    width: CELL_SIZE,
    height: HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 12,
    textAlign: "center",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
});
