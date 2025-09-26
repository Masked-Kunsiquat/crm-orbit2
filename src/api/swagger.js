// Swagger configuration for CRM API
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CRM Orbit API',
    version: '1.0.0',
    description: 'REST API for CRM Orbit - Contact Relationship Management',
    contact: {
      name: 'CRM Orbit',
      email: 'support@crm-orbit.dev'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server'
    }
  ],
  components: {
    schemas: {
      Contact: {
        type: 'object',
        required: ['first_name'],
        properties: {
          id: {
            type: 'integer',
            description: 'Unique contact identifier',
            example: 1
          },
          first_name: {
            type: 'string',
            description: 'First name',
            example: 'John'
          },
          last_name: {
            type: 'string',
            description: 'Last name',
            example: 'Doe'
          },
          middle_name: {
            type: 'string',
            description: 'Middle name',
            example: 'Michael'
          },
          display_name: {
            type: 'string',
            description: 'Auto-computed display name',
            example: 'John Michael Doe'
          },
          avatar_uri: {
            type: 'string',
            description: 'Avatar image URI',
            example: '/avatars/john-doe.jpg'
          },
          company_id: {
            type: 'integer',
            description: 'Associated company ID',
            example: 5
          },
          job_title: {
            type: 'string',
            description: 'Job title',
            example: 'Software Engineer'
          },
          is_favorite: {
            type: 'boolean',
            description: 'Whether contact is marked as favorite',
            example: false
          },
          last_interaction_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last interaction timestamp',
            example: '2023-12-15T10:30:00Z'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
            example: '2023-12-01T09:00:00Z'
          }
        }
      },
      ContactInput: {
        type: 'object',
        required: ['first_name'],
        properties: {
          first_name: {
            type: 'string',
            description: 'First name',
            example: 'John'
          },
          last_name: {
            type: 'string',
            description: 'Last name',
            example: 'Doe'
          },
          middle_name: {
            type: 'string',
            description: 'Middle name',
            example: 'Michael'
          },
          avatar_uri: {
            type: 'string',
            description: 'Avatar image URI',
            example: '/avatars/john-doe.jpg'
          },
          company_id: {
            type: 'integer',
            description: 'Associated company ID',
            example: 5
          },
          job_title: {
            type: 'string',
            description: 'Job title',
            example: 'Software Engineer'
          },
          is_favorite: {
            type: 'boolean',
            description: 'Whether contact is marked as favorite',
            example: false
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Contact not found'
          },
          code: {
            type: 'string',
            description: 'Error code',
            example: 'CONTACT_NOT_FOUND'
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/api/routes/*.js'], // Path to API route files
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;