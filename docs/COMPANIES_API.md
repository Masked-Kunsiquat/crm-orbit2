# Companies API Documentation

Documentation for the companies database module for UI development.

## Import

```javascript
import { createCompaniesDB } from '../database/companies';
// Then initialize with database context
const companiesAPI = createCompaniesDB({ execute, batch, transaction });
```

## Data Structure

### Company Object
```javascript
{
  id: number,                    // Auto-generated primary key
  name: string,                  // Required - Company name
  industry: string | null,       // Optional - Industry classification
  website: string | null,        // Optional - Company website URL
  address: string | null,        // Optional - Company physical address
  notes: string | null,          // Optional - Additional notes about the company
  logo_attachment_id: number | null, // Optional - Foreign key to attachments table for company logo
  created_at: string             // Auto-generated ISO datetime
}
```

### Company Input (for create/update)
```javascript
{
  name: string,                  // Required - Company name (will be validated)
  industry?: string,             // Optional - Industry classification
  website?: string,              // Optional - Company website
  address?: string,              // Optional - Physical address
  notes?: string,                // Optional - Additional notes
  logo_attachment_id?: number    // Optional - ID of logo attachment
}
```

## API Methods

### Create Company
```javascript
const newCompany = await companiesAPI.create({
  name: "Acme Corporation",
  industry: "Technology",
  website: "https://acme.com",
  address: "123 Main St, City, State 12345",
  notes: "Primary software vendor"
});
// Returns: { id: number }
```

### Get Company by ID
```javascript
const company = await companiesAPI.getById(companyId);
// Returns company object or null if not found
```

### Get All Companies
```javascript
const companies = await companiesAPI.getAll({
  limit: 50,           // Default 100
  offset: 0,           // Default 0
  orderBy: 'name',     // 'name' | 'industry' | 'created_at' (default 'name')
  orderDir: 'ASC',     // 'ASC' | 'DESC' (default 'ASC')
  industry: 'Technology' // Optional: filter by specific industry
});
```

### Update Company
```javascript
const updatedCompany = await companiesAPI.update(companyId, {
  name: "Acme Corporation Ltd",
  industry: "Software",
  website: "https://acme.com",
  notes: "Updated company information"
});
// Returns updated company object or null if not found
```

### Delete Company
```javascript
const rowsDeleted = await companiesAPI.delete(companyId);
// Returns number of rows deleted (0 or 1)
```

### Search Companies
```javascript
const results = await companiesAPI.search("Acme");
// Searches name, industry, address, and notes fields
// Returns array of matching companies sorted by name
```

## Company Relations

### Get Company with Associated Contacts
```javascript
const companyWithContacts = await companiesAPI.getWithContacts(companyId);
// Returns company object with contacts array or null if company not found
// Format: { ...companyData, contacts: [contactArray] }
```

## Company-Specific Features

### Update Company Logo
```javascript
const updatedCompany = await companiesAPI.updateLogo(companyId, attachmentId);
// Links an attachment as the company logo
// Returns updated company object
// Throws DatabaseError with code 'NOT_FOUND' if company doesn't exist
```

### Merge Companies
```javascript
const mergeResult = await companiesAPI.mergeCompanies(keepCompanyId, mergeCompanyId);
// Merges two companies: keeps first company, merges data from second
// Moves all contacts from merged company to kept company
// Returns: {
//   mergedCompanyId: number,     // ID of the company that was kept
//   contactsUpdated: number,     // Number of contacts moved
//   deletedCompanyId: number     // ID of the company that was deleted
// }
// Requires transaction support - throws 'TRANSACTION_REQUIRED' error if not available
```

## Usage Examples for UI Components

### Company List Component
```javascript
import { useEffect, useState } from 'react';
import { initDatabase } from '../database';

function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const db = await initDatabase();
        const companiesAPI = db.companies;
        const companiesList = await companiesAPI.getAll({
          limit: 100,
          orderBy: 'name'
        });
        setCompanies(companiesList);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  // Render companies list...
}
```

### Create Company Form
```javascript
async function handleCreateCompany(formData) {
  try {
    const db = await initDatabase();
    const newCompany = await db.companies.create({
      name: formData.companyName,
      industry: formData.industry || null,
      website: formData.website || null,
      address: formData.address || null,
      notes: formData.notes || null
    });

    console.log('Company created:', newCompany);
    // Navigate to company details or update UI
  } catch (error) {
    console.error('Failed to create company:', error);
    // Show error message to user
  }
}
```

### Company Search Component
```javascript
function CompanySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  async function handleSearch(query) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const db = await initDatabase();
      const results = await db.companies.search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Company search failed:', error);
    }
  }

  // Debounced search implementation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Render search input and results...
}
```

### Company Selection Dropdown
```javascript
function CompanySelector({ onSelect, selectedCompanyId }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const db = await initDatabase();
        const companiesList = await db.companies.getAll({
          orderBy: 'name',
          limit: 200 // Reasonable limit for dropdown
        });
        setCompanies(companiesList);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  // Render dropdown with companies...
}
```

### Company Details with Contacts
```javascript
function CompanyDetails({ companyId }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanyDetails() {
      try {
        const db = await initDatabase();
        const company = await db.companies.getWithContacts(companyId);
        setCompanyData(company);
      } catch (error) {
        console.error('Failed to load company details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyDetails();
  }, [companyId]);

  if (!companyData) {
    return <div>Company not found</div>;
  }

  // Render company details and associated contacts list...
}
```

### Industry Filter Component
```javascript
function CompanyByIndustry() {
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);

  useEffect(() => {
    async function loadIndustries() {
      try {
        const db = await initDatabase();
        // Get all companies to extract unique industries
        const allCompanies = await db.companies.getAll({ limit: 1000 });
        const uniqueIndustries = [...new Set(
          allCompanies
            .filter(c => c.industry)
            .map(c => c.industry)
        )].sort();
        setIndustries(uniqueIndustries);
      } catch (error) {
        console.error('Failed to load industries:', error);
      }
    }

    loadIndustries();
  }, []);

  async function filterByIndustry(industry) {
    try {
      const db = await initDatabase();
      const filteredCompanies = await db.companies.getAll({
        industry: industry || undefined,
        orderBy: 'name'
      });
      setCompanies(filteredCompanies);
    } catch (error) {
      console.error('Failed to filter companies:', error);
    }
  }

  useEffect(() => {
    filterByIndustry(selectedIndustry);
  }, [selectedIndustry]);

  // Render industry filter and companies list...
}
```

### Company Logo Management
```javascript
function CompanyLogoUpload({ companyId }) {
  async function handleLogoUpload(attachmentId) {
    try {
      const db = await initDatabase();
      const updatedCompany = await db.companies.updateLogo(companyId, attachmentId);
      console.log('Logo updated:', updatedCompany);
      // Update UI to show new logo
    } catch (error) {
      console.error('Failed to update company logo:', error);
      // Show error message to user
    }
  }

  async function handleLogoRemove() {
    try {
      const db = await initDatabase();
      const updatedCompany = await db.companies.updateLogo(companyId, null);
      console.log('Logo removed:', updatedCompany);
      // Update UI to remove logo
    } catch (error) {
      console.error('Failed to remove company logo:', error);
    }
  }

  // Render logo upload/remove interface...
}
```

### Company Merge Functionality
```javascript
function CompanyMerge({ companyId1, companyId2 }) {
  async function handleMergeCompanies(keepId, mergeId) {
    try {
      const db = await initDatabase();
      const mergeResult = await db.companies.mergeCompanies(keepId, mergeId);

      console.log(`Merged companies successfully:
        - Kept company ID: ${mergeResult.mergedCompanyId}
        - Moved ${mergeResult.contactsUpdated} contacts
        - Deleted company ID: ${mergeResult.deletedCompanyId}`);

      // Update UI to reflect merge
      // Navigate away from deleted company
    } catch (error) {
      console.error('Failed to merge companies:', error);
      if (error.code === 'TRANSACTION_REQUIRED') {
        console.error('Database transaction support is required for merge operations');
      }
      // Show error message to user
    }
  }

  // Render merge confirmation interface...
}
```

### Paginated Company List
```javascript
function PaginatedCompanyList() {
  const [companies, setCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageSize = 20;

  async function loadPage(page) {
    if (loading) return;

    setLoading(true);
    try {
      const db = await initDatabase();
      const pageCompanies = await db.companies.getAll({
        limit: pageSize,
        offset: page * pageSize,
        orderBy: 'name'
      });

      if (page === 0) {
        setCompanies(pageCompanies);
      } else {
        setCompanies(prev => [...prev, ...pageCompanies]);
      }

      setHasMore(pageCompanies.length === pageSize);
    } catch (error) {
      console.error('Failed to load companies page:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage(0);
  }, []);

  function loadNextPage() {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadPage(nextPage);
    }
  }

  // Render paginated list with load more functionality...
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
- `NOT_FOUND` - Company not found by ID
- `VALIDATION_ERROR` - Invalid input data (missing name, invalid company IDs for merge)
- `INSERT_FAILED` - Failed to create company
- `MODULE_INIT_ERROR` - Database helpers not properly initialized
- `TRANSACTION_REQUIRED` - Method requires transaction support (merge operations)
- `DATABASE_ERROR` - General database operation error

## Integration Notes

### Contact Relationships
- Companies can have multiple contacts via the `company_id` foreign key in contacts table
- Use `getWithContacts()` to retrieve company with all associated contacts
- Deleting a company sets `company_id` to NULL for associated contacts (ON DELETE SET NULL)

### Logo Attachments
- Company logos are stored as attachments with `entity_type: 'company'`
- Use the attachments API to manage logo files
- `logo_attachment_id` references the attachments table
- Use `updateLogo()` for easy logo management

### Search Capabilities
- Search functionality covers name, industry, address, and notes fields
- Search is case-insensitive and uses LIKE pattern matching
- Results are automatically sorted by company name

### Merge Operations
- Merge functionality requires transaction support
- All contacts from merged company are moved to the kept company
- Company data is intelligently merged (non-null values from merge company fill empty fields)
- Logo preference: keeps existing logo, uses merge company's logo if none exists
- Merge operation is atomic - either fully succeeds or fully rolls back

## Notes for UI Development

1. **Required Fields**: Only `name` is required when creating companies
2. **Search Performance**: Search covers multiple fields efficiently with proper indexing
3. **Company Selection**: Use `getAll()` with appropriate limits for dropdown components
4. **Contact Integration**: Always consider how company changes affect associated contacts
5. **Logo Management**: Coordinate with attachments API for logo upload/management
6. **Merge Workflow**: Implement confirmation dialogs for destructive merge operations
7. **Pagination**: Use `limit` and `offset` for large company lists
8. **Industry Filtering**: Extract unique industries from existing data for filter options
9. **Data Validation**: Validate URLs and other structured data on the UI side before submission
10. **Error Recovery**: Handle foreign key constraint errors gracefully (logo attachments)