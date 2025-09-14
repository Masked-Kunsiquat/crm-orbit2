// Interactions statistics module
// Focused on analytics and reporting operations for interactions

import { DatabaseError } from './errors';

function isDateOnlyString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeDateRange(startDate, endDate) {
  let start = startDate;
  let end = endDate;
  let endOp = '<='; // default inclusive end

  if (start && isDateOnlyString(start)) {
    const [year, month, day] = start.split('-').map(Number);
    start = new Date(Date.UTC(year, month - 1, day)).toISOString();
  }
  if (end && isDateOnlyString(end)) {
    const [year, month, day] = end.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 1);
    end = d.toISOString();
    endOp = '<';
  }

  return { start, end, endOp };
}

function clampLimit(n, min = 1, max = 200) {
  const num = Number(n);
  if (isNaN(num) || num < min) return min;
  if (num > max) return max;
  return Math.floor(num);
}

/**
 * Create the interactions statistics module
 * @param {Object} deps - Database dependencies
 * @param {Function} deps.execute - Execute SQL function
 * @returns {Object} Interactions statistics API
 */
export function createInteractionsStatsDB({ execute }) {
  return {
    async getStatistics(options = {}) {
      const { contactId, startDate, endDate } = options;
      const conditions = [];
      const params = [];
      
      if (contactId) {
        conditions.push('contact_id = ?');
        params.push(contactId);
      }
      
      const { start, end, endOp } = normalizeDateRange(startDate, endDate);
      if (start) {
        conditions.push('interaction_datetime >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(`interaction_datetime ${endOp} ?`);
        params.push(end);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get count by type
      const typeCountSql = `SELECT COALESCE(custom_type, interaction_type) as effective_type, COUNT(*) as count 
                           FROM interactions ${whereClause} 
                           GROUP BY COALESCE(custom_type, interaction_type) 
                           ORDER BY count DESC;`;
      const typeCountRes = await execute(typeCountSql, params);
      
      // Get average duration for calls and meetings
      const avgDurationSql = `SELECT interaction_type, AVG(duration) as avg_duration 
                             FROM interactions 
                             ${whereClause} 
                             ${whereClause ? 'AND' : 'WHERE'} interaction_type IN ('call', 'meeting') 
                             AND duration IS NOT NULL 
                             GROUP BY interaction_type;`;
      const avgDurationRes = await execute(avgDurationSql, params);
      
      // Get total counts
      const totalSql = `SELECT COUNT(*) as total_interactions,
                               COUNT(DISTINCT contact_id) as unique_contacts,
                               MIN(interaction_datetime) as earliest_interaction,
                               MAX(interaction_datetime) as latest_interaction
                        FROM interactions ${whereClause};`;
      const totalRes = await execute(totalSql, params);
      
      return {
        totalInteractions: totalRes.rows[0]?.total_interactions || 0,
        uniqueContacts: totalRes.rows[0]?.unique_contacts || 0,
        earliestInteraction: totalRes.rows[0]?.earliest_interaction,
        latestInteraction: totalRes.rows[0]?.latest_interaction,
        countByType: typeCountRes.rows.reduce((acc, row) => {
          acc[row.effective_type] = row.count;
          return acc;
        }, {}),
        averageDuration: avgDurationRes.rows.reduce((acc, row) => {
          acc[row.interaction_type] = Math.round(row.avg_duration);
          return acc;
        }, {})
      };
    },

    async getContactInteractionSummary(contactId) {
      const sql = `SELECT 
                     interaction_type,
                     COUNT(*) as count,
                     MAX(interaction_datetime) as last_interaction,
                     AVG(duration) as avg_duration
                   FROM interactions 
                   WHERE contact_id = ? 
                   GROUP BY interaction_type 
                   ORDER BY count DESC;`;
      
      const res = await execute(sql, [contactId]);
      return res.rows;
    },

    async getInteractionTrends(options = {}) {
      const { contactId, period = 'daily', days = 30 } = options;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoff = cutoffDate.toISOString();
      
      const conditions = ['interaction_datetime >= ?'];
      const params = [cutoff];
      
      if (contactId) {
        conditions.push('contact_id = ?');
        params.push(contactId);
      }
      
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      
      let dateFormat;
      switch (period) {
        case 'hourly':
          dateFormat = "strftime('%Y-%m-%d %H:00:00', interaction_datetime)";
          break;
        case 'weekly':
          dateFormat = "strftime('%Y-W%W', interaction_datetime)";
          break;
        case 'monthly':
          dateFormat = "strftime('%Y-%m', interaction_datetime)";
          break;
        default: // daily
          dateFormat = "strftime('%Y-%m-%d', interaction_datetime)";
      }
      
      const sql = `SELECT 
                     ${dateFormat} as period,
                     COUNT(*) as interaction_count,
                     COUNT(DISTINCT contact_id) as unique_contacts,
                     AVG(duration) as avg_duration
                   FROM interactions 
                   ${whereClause}
                   GROUP BY ${dateFormat}
                   ORDER BY period ASC;`;
      
      const res = await execute(sql, params);
      return res.rows;
    },

    async getTopContacts(options = {}) {
      const { limit = 10, startDate, endDate, interactionType } = options;
      const conditions = [];
      const params = [];
      
      const { start, end, endOp } = normalizeDateRange(startDate, endDate);
      if (start) {
        conditions.push('i.interaction_datetime >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push(`i.interaction_datetime ${endOp} ?`);
        params.push(end);
      }
      if (interactionType) {
        conditions.push('(i.interaction_type = ? OR i.custom_type = ?)');
        params.push(interactionType);
        params.push(interactionType);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const sql = `SELECT 
                     c.id,
                     c.first_name,
                     c.last_name,
                     c.display_name,
                     COUNT(i.id) as interaction_count,
                     MAX(i.interaction_datetime) as last_interaction,
                     AVG(i.duration) as avg_duration
                   FROM interactions i
                   JOIN contacts c ON i.contact_id = c.id
                   ${whereClause}
                   GROUP BY c.id, c.first_name, c.last_name, c.display_name
                   ORDER BY interaction_count DESC
                   LIMIT ?;`;
      
      params.push(clampLimit(limit));
      const res = await execute(sql, params);
      return res.rows;
    }
  };
}

export default createInteractionsStatsDB;