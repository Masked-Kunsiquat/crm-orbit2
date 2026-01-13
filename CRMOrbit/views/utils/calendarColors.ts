/**
 * Calendar color configuration
 *
 * Customize the colors used for different event types and statuses
 * in the calendar views (both Agenda and Timeline).
 */

export const CALENDAR_COLORS = {
  // Audit event colors
  audit: {
    scheduled: "#2196F3", // Blue - scheduled audits
    completed: "#4CAF50", // Green - completed audits
    canceled: "#999999", // Gray - canceled audits
  },

  // Interaction event colors
  interaction: {
    scheduled: "#FF9800", // Orange - scheduled interactions
    completed: "#4CAF50", // Green - completed interactions
    canceled: "#999999", // Gray - canceled interactions
  },

  // Timeline event background colors
  timeline: {
    audit: "#2196F3", // Blue - all audits in timeline
    interaction: "#FF9800", // Orange - all interactions in timeline
  },
} as const;

/**
 * Get the appropriate calendar dot color for an audit based on its status
 */
export const getAuditDotColor = (
  status:
    | "audits.status.scheduled"
    | "audits.status.completed"
    | "audits.status.canceled",
): string => {
  switch (status) {
    case "audits.status.scheduled":
      return CALENDAR_COLORS.audit.scheduled;
    case "audits.status.completed":
      return CALENDAR_COLORS.audit.completed;
    case "audits.status.canceled":
      return CALENDAR_COLORS.audit.canceled;
  }
};

/**
 * Get the appropriate calendar dot color for an interaction based on its status
 */
export const getInteractionDotColor = (
  status:
    | "interaction.status.scheduled"
    | "interaction.status.completed"
    | "interaction.status.canceled",
): string => {
  switch (status) {
    case "interaction.status.scheduled":
      return CALENDAR_COLORS.interaction.scheduled;
    case "interaction.status.completed":
      return CALENDAR_COLORS.interaction.completed;
    case "interaction.status.canceled":
      return CALENDAR_COLORS.interaction.canceled;
  }
};
