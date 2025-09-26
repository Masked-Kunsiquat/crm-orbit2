# Interactions API Documentation

Documentation for the interactions database modules for UI development, including core interactions, statistics, and search functionality.

## Import

```javascript
import { createInteractionsDB } from '../database/interactions';
import { createInteractionsStatsDB } from '../database/interactionsStats';
import { createInteractionsSearchDB } from '../database/interactionsSearch';

// Initialize with database context
const interactionsAPI = createInteractionsDB({ execute, batch, transaction });
const statsAPI = createInteractionsStatsDB({ execute });
const searchAPI = createInteractionsSearchDB({ execute });
```

## Data Structures

### Interaction Object
```javascript
{
  id: number,                    // Auto-generated primary key
  contact_id: number,            // Required - Foreign key to contacts table
  interaction_datetime: string,  // Required - ISO datetime string
  title: string,                 // Required - Brief description of interaction
  note: string | null,           // Optional - Detailed notes about interaction
  interaction_type: string,      // Required - 'call', 'email', 'meeting', 'text', 'other'
  custom_type: string | null,    // Optional - Custom interaction type (overrides interaction_type)
  duration: number | null,       // Optional - Duration in minutes (for calls/meetings)
  created_at: string,            // Auto-generated ISO datetime
  updated_at: string             // Auto-updated ISO datetime
}
```

### Interaction Input (for create/update)
```javascript
{
  contact_id: number,            // Required
  title: string,                 // Required - Brief description
  interaction_type: string,      // Required - 'call', 'email', 'meeting', 'text', 'other'
  interaction_datetime?: string, // Optional - defaults to current timestamp
  note?: string,                 // Optional - detailed notes
  custom_type?: string,          // Optional - custom type (overrides interaction_type)
  duration?: number              // Optional - duration in minutes
}
```

### Statistics Object
```javascript
{
  totalInteractions: number,           // Total count of interactions
  uniqueContacts: number,              // Number of unique contacts with interactions
  earliestInteraction: string | null,  // ISO datetime of earliest interaction
  latestInteraction: string | null,    // ISO datetime of latest interaction
  countByType: {                       // Interaction counts by type
    [type: string]: number
  },
  averageDuration: {                   // Average duration by type (calls/meetings only)
    call?: number,                     // Average call duration in minutes
    meeting?: number                   // Average meeting duration in minutes
  }
}
```

## Core Interactions API

### Create Interaction
```javascript
const newInteraction = await interactionsAPI.create({
  contact_id: 1,
  title: "Follow-up call",
  interaction_type: "call",
  interaction_datetime: "2024-03-15T14:30:00.000Z",
  note: "Discussed project timeline and next steps",
  duration: 25
});
```

### Get Interaction by ID
```javascript
const interaction = await interactionsAPI.getById(interactionId);
// Returns interaction object or null if not found
```

### Get All Interactions
```javascript
const interactions = await interactionsAPI.getAll({
  limit: 50,                    // Default 50, max 500
  offset: 0,                    // Default 0
  orderBy: 'interaction_datetime', // 'interaction_datetime' | 'title' | 'interaction_type' | 'created_at'
  orderDir: 'DESC'              // 'ASC' | 'DESC'
});
```

### Update Interaction
```javascript
const updatedInteraction = await interactionsAPI.update(interactionId, {
  title: "Updated follow-up call",
  note: "Added discussion about budget constraints",
  duration: 30
});
```

### Delete Interaction
```javascript
const rowsDeleted = await interactionsAPI.delete(interactionId);
// Returns number of rows deleted (0 or 1)
// Automatically updates contact's last_interaction_at
```

### Bulk Create Interactions
```javascript
const newInteractions = await interactionsAPI.bulkCreate([
  {
    contact_id: 1,
    title: "Email response",
    interaction_type: "email",
    note: "Responded to pricing inquiry"
  },
  {
    contact_id: 2,
    title: "Phone call",
    interaction_type: "call",
    duration: 15,
    note: "Quick check-in call"
  }
]);
// Efficiently creates multiple interactions and updates contact timestamps
```

## Search API

### Get Recent Interactions
```javascript
const recentInteractions = await searchAPI.getRecent({
  limit: 20,      // Default 20
  days: 7         // Default 7 - interactions from last N days
});
// Returns interactions with contact details (first_name, last_name, display_name)
```

### Get Interactions by Type
```javascript
const calls = await searchAPI.getByType("call", {
  limit: 50,                    // Default 50
  offset: 0,                    // Default 0
  orderBy: 'interaction_datetime', // Default 'interaction_datetime'
  orderDir: 'DESC'              // Default 'DESC'
});
// Searches both interaction_type and custom_type fields
```

### Get Interactions by Date Range
```javascript
const rangeInteractions = await searchAPI.getByDateRange(
  "2024-01-01",    // Start date (YYYY-MM-DD)
  "2024-03-31",    // End date (YYYY-MM-DD)
  {
    limit: 100,
    offset: 0,
    orderBy: 'interaction_datetime',
    orderDir: 'ASC'
  }
);
```

### Search Interactions by Text
```javascript
const searchResults = await searchAPI.searchInteractions("project meeting", {
  limit: 50,       // Default 50
  offset: 0        // Default 0
});
// Searches title, note, and contact display_name fields
// Returns interactions with contact details
```

### Get Interactions by Contact
```javascript
const contactInteractions = await searchAPI.getByContact(contactId, {
  limit: 50,
  offset: 0,
  orderBy: 'interaction_datetime',
  orderDir: 'DESC'
});
```

### Advanced Search
```javascript
const advancedResults = await searchAPI.advancedSearch({
  contactIds: [1, 2, 3],                    // Optional - array of contact IDs
  interactionTypes: ['call', 'meeting'],    // Optional - array of types
  title: "follow-up",                       // Optional - title contains text
  note: "budget",                          // Optional - note contains text
  startDate: "2024-01-01",                 // Optional - date range start
  endDate: "2024-03-31",                   // Optional - date range end
  minDuration: 15,                         // Optional - minimum duration in minutes
  maxDuration: 120                         // Optional - maximum duration in minutes
}, {
  limit: 100,
  offset: 0,
  orderBy: 'interaction_datetime',
  orderDir: 'DESC'
});
// Returns interactions with contact details
```

## Statistics API

### Get Interaction Statistics
```javascript
const stats = await statsAPI.getStatistics({
  contactId: 1,              // Optional - filter by specific contact
  startDate: "2024-01-01",   // Optional - date range start (YYYY-MM-DD)
  endDate: "2024-12-31"      // Optional - date range end (YYYY-MM-DD)
});

// Returns:
// {
//   totalInteractions: 145,
//   uniqueContacts: 23,
//   earliestInteraction: "2024-01-15T09:30:00.000Z",
//   latestInteraction: "2024-03-14T16:45:00.000Z",
//   countByType: {
//     call: 65,
//     email: 45,
//     meeting: 25,
//     text: 10
//   },
//   averageDuration: {
//     call: 18,      // 18 minutes average
//     meeting: 45    // 45 minutes average
//   }
// }
```

### Get Contact Interaction Summary
```javascript
const contactSummary = await statsAPI.getContactInteractionSummary(contactId);
// Returns array of interaction summaries by type:
// [
//   {
//     interaction_type: "call",
//     count: 12,
//     last_interaction: "2024-03-14T16:45:00.000Z",
//     avg_duration: 20
//   },
//   {
//     interaction_type: "email",
//     count: 8,
//     last_interaction: "2024-03-12T10:30:00.000Z",
//     avg_duration: null
//   }
// ]
```

### Get Interaction Trends
```javascript
const trends = await statsAPI.getInteractionTrends({
  contactId: 1,        // Optional - filter by contact
  period: 'daily',     // 'hourly' | 'daily' | 'weekly' | 'monthly'
  days: 30             // Look back N days (default 30)
});

// Returns array of trend data:
// [
//   {
//     period: "2024-03-14",
//     interaction_count: 5,
//     unique_contacts: 3,
//     avg_duration: 22
//   },
//   {
//     period: "2024-03-13",
//     interaction_count: 2,
//     unique_contacts: 2,
//     avg_duration: 15
//   }
// ]
```

### Get Top Contacts by Interaction Volume
```javascript
const topContacts = await statsAPI.getTopContacts({
  limit: 10,                        // Default 10, max 200
  startDate: "2024-01-01",         // Optional - date range filter
  endDate: "2024-03-31",           // Optional - date range filter
  interactionType: "call"          // Optional - filter by type
});

// Returns contacts ranked by interaction count:
// [
//   {
//     id: 1,
//     first_name: "John",
//     last_name: "Doe",
//     display_name: "John Doe",
//     interaction_count: 25,
//     last_interaction: "2024-03-14T16:45:00.000Z",
//     avg_duration: 18
//   }
// ]
```

## Usage Examples for UI Components

### Activity Feed Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';

function ActivityFeed() {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentActivity() {
      try {
        const db = await initDatabase();
        const searchAPI = db.interactionsSearch;

        const recentInteractions = await searchAPI.getRecent({
          limit: 20,
          days: 7
        });

        setInteractions(recentInteractions);
      } catch (error) {
        console.error('Failed to load activity feed:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecentActivity();
  }, []);

  return (
    <div>
      {interactions.map(interaction => (
        <div key={interaction.id} className="activity-item">
          <span className="interaction-type">{interaction.interaction_type}</span>
          <span className="contact-name">{interaction.display_name}</span>
          <span className="title">{interaction.title}</span>
          <span className="datetime">
            {new Date(interaction.interaction_datetime).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Interaction Logging Form
```javascript
async function handleLogInteraction(formData) {
  try {
    const db = await initDatabase();
    const interactionsAPI = db.interactions;

    const interactionData = {
      contact_id: formData.contactId,
      title: formData.title,
      interaction_type: formData.type,
      interaction_datetime: formData.datetime || new Date().toISOString(),
      note: formData.notes,
      duration: formData.duration || null
    };

    const newInteraction = await interactionsAPI.create(interactionData);
    console.log('Interaction logged:', newInteraction);

    // Update UI or navigate
  } catch (error) {
    console.error('Failed to log interaction:', error);
    // Show error message to user
  }
}
```

### Contact Interaction History
```javascript
function ContactInteractionHistory({ contactId }) {
  const [interactions, setInteractions] = useState([]);
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    async function loadContactHistory() {
      try {
        const db = await initDatabase();
        const searchAPI = db.interactionsSearch;
        const statsAPI = db.interactionsStats;

        const [history, contactSummary] = await Promise.all([
          searchAPI.getByContact(contactId, { limit: 50 }),
          statsAPI.getContactInteractionSummary(contactId)
        ]);

        setInteractions(history);
        setSummary(contactSummary);
      } catch (error) {
        console.error('Failed to load contact history:', error);
      }
    }

    loadContactHistory();
  }, [contactId]);

  return (
    <div>
      {/* Summary section */}
      <div className="interaction-summary">
        {summary.map(stat => (
          <div key={stat.interaction_type} className="stat-item">
            <span>{stat.interaction_type}: {stat.count}</span>
            <span>Last: {new Date(stat.last_interaction).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      {/* Detailed history */}
      <div className="interaction-history">
        {interactions.map(interaction => (
          <div key={interaction.id} className="history-item">
            <h4>{interaction.title}</h4>
            <p>{interaction.note}</p>
            <small>
              {interaction.interaction_type} -
              {new Date(interaction.interaction_datetime).toLocaleString()}
              {interaction.duration && ` - ${interaction.duration} min`}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Analytics Dashboard
```javascript
function InteractionsDashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topContacts, setTopContacts] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const db = await initDatabase();
        const statsAPI = db.interactionsStats;

        const [
          overallStats,
          monthlyTrends,
          mostActiveContacts
        ] = await Promise.all([
          statsAPI.getStatistics({
            startDate: "2024-01-01",
            endDate: "2024-12-31"
          }),
          statsAPI.getInteractionTrends({
            period: 'monthly',
            days: 365
          }),
          statsAPI.getTopContacts({ limit: 10 })
        ]);

        setStats(overallStats);
        setTrends(monthlyTrends);
        setTopContacts(mostActiveContacts);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="dashboard">
      {/* Overview stats */}
      {stats && (
        <div className="stats-overview">
          <div className="stat">
            <h3>{stats.totalInteractions}</h3>
            <p>Total Interactions</p>
          </div>
          <div className="stat">
            <h3>{stats.uniqueContacts}</h3>
            <p>Active Contacts</p>
          </div>
        </div>
      )}

      {/* Interaction type breakdown */}
      {stats && (
        <div className="type-breakdown">
          <h3>Interactions by Type</h3>
          {Object.entries(stats.countByType).map(([type, count]) => (
            <div key={type} className="type-stat">
              <span>{type}: {count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trends chart */}
      <div className="trends-chart">
        <h3>Interaction Trends</h3>
        {/* Render chart with trends data */}
      </div>

      {/* Top contacts */}
      <div className="top-contacts">
        <h3>Most Active Contacts</h3>
        {topContacts.map(contact => (
          <div key={contact.id} className="contact-item">
            <span>{contact.display_name}</span>
            <span>{contact.interaction_count} interactions</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Advanced Search Form
```javascript
function InteractionSearchForm() {
  const [searchCriteria, setSearchCriteria] = useState({
    title: '',
    note: '',
    interactionTypes: [],
    contactIds: [],
    startDate: '',
    endDate: '',
    minDuration: '',
    maxDuration: ''
  });
  const [results, setResults] = useState([]);

  async function handleSearch() {
    try {
      const db = await initDatabase();
      const searchAPI = db.interactionsSearch;

      // Build search criteria object
      const criteria = {};
      if (searchCriteria.title) criteria.title = searchCriteria.title;
      if (searchCriteria.note) criteria.note = searchCriteria.note;
      if (searchCriteria.interactionTypes.length > 0) {
        criteria.interactionTypes = searchCriteria.interactionTypes;
      }
      if (searchCriteria.contactIds.length > 0) {
        criteria.contactIds = searchCriteria.contactIds;
      }
      if (searchCriteria.startDate) criteria.startDate = searchCriteria.startDate;
      if (searchCriteria.endDate) criteria.endDate = searchCriteria.endDate;
      if (searchCriteria.minDuration) criteria.minDuration = parseInt(searchCriteria.minDuration);
      if (searchCriteria.maxDuration) criteria.maxDuration = parseInt(searchCriteria.maxDuration);

      const searchResults = await searchAPI.advancedSearch(criteria, {
        limit: 100,
        orderBy: 'interaction_datetime',
        orderDir: 'DESC'
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  return (
    <div className="search-form">
      {/* Search form inputs */}
      <input
        type="text"
        placeholder="Search in title..."
        value={searchCriteria.title}
        onChange={(e) => setSearchCriteria(prev => ({
          ...prev,
          title: e.target.value
        }))}
      />

      {/* More form inputs... */}

      <button onClick={handleSearch}>Search</button>

      {/* Results display */}
      <div className="search-results">
        {results.map(interaction => (
          <div key={interaction.id} className="result-item">
            <h4>{interaction.title}</h4>
            <p>{interaction.display_name} - {interaction.interaction_type}</p>
            <p>{new Date(interaction.interaction_datetime).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Bulk Import Component
```javascript
async function handleBulkImport(interactionsData) {
  try {
    const db = await initDatabase();
    const interactionsAPI = db.interactions;

    // Validate data format
    const validInteractions = interactionsData.filter(item =>
      item.contact_id && item.title && item.interaction_type
    );

    if (validInteractions.length === 0) {
      throw new Error('No valid interactions to import');
    }

    // Use bulk create for efficiency
    const createdInteractions = await interactionsAPI.bulkCreate(validInteractions);

    console.log(`Successfully imported ${createdInteractions.length} interactions`);

    // Update UI or show success message
  } catch (error) {
    console.error('Bulk import failed:', error);
    // Show error message to user
  }
}
```

## Error Handling

All methods may throw `DatabaseError` with the following structure:
```javascript
{
  message: string,     // Human-readable error message
  code: string,        // Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
  originalError: Error // Original underlying error
}
```

Common error codes:
- `NOT_FOUND` - Interaction not found by ID
- `VALIDATION_ERROR` - Invalid input data (missing required fields, invalid contact_id)
- `CREATE_FAILED` - Failed to create interaction
- `TRANSACTION_REQUIRED` - Method requires transaction support
- `DATABASE_ERROR` - General database operation error

## Integration Notes

### Interaction Types
Standard interaction types supported:
- `call` - Phone calls (supports duration tracking)
- `email` - Email communications
- `meeting` - In-person or virtual meetings (supports duration tracking)
- `text` - Text/SMS messages
- `other` - Other types of interactions

Use `custom_type` field to specify custom interaction types while keeping the standard `interaction_type` for filtering and statistics.

### Duration Tracking
- Duration is stored in minutes as an integer
- Only meaningful for interaction types like `call` and `meeting`
- Statistics API automatically calculates average duration for applicable types
- Optional field - leave null for interactions where duration doesn't apply

### Contact Integration
- All interactions must be linked to a contact via `contact_id`
- Creating/updating/deleting interactions automatically updates contact's `last_interaction_at`
- Foreign key constraint ensures contact exists before creating interactions
- Use contact details in search results and analytics

### Date Handling
- `interaction_datetime` uses ISO string format for precision
- Search API accepts YYYY-MM-DD format for date range queries
- Automatic date normalization handles date-only strings
- Statistics API supports flexible date filtering

### Performance Considerations
- Use `bulkCreate()` for importing multiple interactions efficiently
- Leverage pagination with `limit` and `offset` for large datasets
- Search API is optimized for common query patterns
- Statistics queries are optimized with proper indexing

## Notes for UI Development

1. **Real-time Updates**: Interactions automatically update contact timestamps, reflecting recent activity
2. **Search Flexibility**: Multiple search methods available - choose based on use case complexity
3. **Type Management**: Support both standard and custom interaction types in UI
4. **Duration Input**: Provide duration input for calls and meetings, hide for other types
5. **Bulk Operations**: Use bulk create for import scenarios and data migration
6. **Analytics Integration**: Rich statistics API supports dashboard and reporting features
7. **Date Pickers**: Use appropriate date/datetime pickers based on field requirements
8. **Error Recovery**: Handle foreign key errors gracefully (contact not found)
9. **Performance**: Implement pagination for interaction lists and search results
10. **Contact Context**: Always show contact information alongside interaction data