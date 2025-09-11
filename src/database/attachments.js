import { DatabaseError } from './errors';

export function createAttachmentsDB({ execute, batch, transaction }) {
  const validateRequiredFields = (data, requiredFields) => {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );
    if (missing.length > 0) {
      throw new DatabaseError(
        `Missing required fields: ${missing.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
  };

  const validateEntityType = (entityType) => {
    const validTypes = ['contact', 'interaction', 'event', 'note'];
    if (!validTypes.includes(entityType)) {
      throw new DatabaseError(
        `Invalid entity_type. Must be one of: ${validTypes.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
  };

  const validateFileType = (fileType) => {
    const validTypes = ['image', 'document', 'audio', 'video'];
    if (!validTypes.includes(fileType)) {
      throw new DatabaseError(
        `Invalid file_type. Must be one of: ${validTypes.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
  };

  const validateFileSize = (fileSize) => {
    if (fileSize !== null && fileSize !== undefined) {
      if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize < 0) {
        throw new DatabaseError(
          'Invalid file_size. Must be a finite number >= 0',
          'VALIDATION_ERROR'
        );
      }
    }
  };

  const validateEntityId = (entityId) => {
    if (entityId === null || entityId === undefined) {
      throw new DatabaseError(
        'entity_id is required',
        'VALIDATION_ERROR'
      );
    }

    // Convert string numbers to actual numbers
    let numericValue = entityId;
    if (typeof entityId === 'string' && !isNaN(entityId) && entityId.trim() !== '') {
      numericValue = Number(entityId);
    }

    if (typeof numericValue !== 'number' || !Number.isInteger(numericValue) || numericValue <= 0) {
      throw new DatabaseError(
        'Invalid entity_id. Must be a positive integer',
        'VALIDATION_ERROR'
      );
    }

    return numericValue;
  };

  return {
    async create(data) {
      try {
        validateRequiredFields(data, ['entity_type', 'entity_id', 'file_name', 'original_name', 'file_path', 'file_type']);
        validateEntityType(data.entity_type);
        const validatedEntityId = validateEntityId(data.entity_id);
        validateFileType(data.file_type);
        validateFileSize(data.file_size);

        const result = await execute(
          `INSERT INTO attachments (
            entity_type, entity_id, file_name, original_name, file_path, 
            file_type, mime_type, file_size, thumbnail_path, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            data.entity_type,
            validatedEntityId,
            data.file_name,
            data.original_name,
            data.file_path,
            data.file_type,
            data.mime_type || null,
            data.file_size !== undefined ? data.file_size : null,
            data.thumbnail_path || null,
            data.description || null
          ]
        );

        if (result.insertId) {
          return await this.getById(result.insertId);
        }
        throw new DatabaseError('Failed to create attachment', 'CREATE_FAILED');
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to create attachment', 'CREATE_FAILED', error);
      }
    },

    async getById(id) {
      try {
        const result = await execute(
          'SELECT * FROM attachments WHERE id = ?',
          [id]
        );
        return result.rows[0] || null;
      } catch (error) {
        throw new DatabaseError('Failed to get attachment by ID', 'GET_FAILED', error);
      }
    },

    async getAll(options = {}) {
      try {
        const {
          limit = 50,
          offset = 0,
          sortBy = 'created_at',
          sortOrder = 'DESC'
        } = options;

        const validSortColumns = ['id', 'entity_type', 'file_name', 'original_name', 'file_type', 'file_size', 'created_at'];
        if (!validSortColumns.includes(sortBy)) {
          throw new DatabaseError(`Invalid sort column: ${sortBy}`, 'VALIDATION_ERROR');
        }

        const validSortOrders = ['ASC', 'DESC'];
        if (!validSortOrders.includes(sortOrder.toUpperCase())) {
          throw new DatabaseError(`Invalid sort order: ${sortOrder}`, 'VALIDATION_ERROR');
        }

        const result = await execute(
          `SELECT * FROM attachments 
           ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
           LIMIT ? OFFSET ?`,
          [limit, offset]
        );

        return result.rows;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get all attachments', 'GET_FAILED', error);
      }
    },

    async update(id, data) {
      try {
        if (data.entity_type) validateEntityType(data.entity_type);
        if (data.entity_id !== undefined) {
          data.entity_id = validateEntityId(data.entity_id);
        }
        if (data.file_type) validateFileType(data.file_type);
        if ('file_size' in data) validateFileSize(data.file_size);

        const setParts = [];
        const params = [];

        const updatableFields = [
          'entity_type', 'entity_id', 'file_name', 'original_name', 'file_path',
          'file_type', 'mime_type', 'file_size', 'thumbnail_path', 'description'
        ];

        updatableFields.forEach(field => {
          if (data[field] !== undefined) {
            setParts.push(`${field} = ?`);
            params.push(data[field]);
          }
        });

        if (setParts.length === 0) {
          throw new DatabaseError('No valid fields to update', 'VALIDATION_ERROR');
        }

        params.push(id);

        const result = await execute(
          `UPDATE attachments SET ${setParts.join(', ')} WHERE id = ?`,
          params
        );

        if (result.rowsAffected === 0) {
          throw new DatabaseError('Attachment not found', 'NOT_FOUND');
        }

        return await this.getById(id);
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to update attachment', 'UPDATE_FAILED', error);
      }
    },

    async delete(id) {
      try {
        const result = await execute(
          'DELETE FROM attachments WHERE id = ?',
          [id]
        );

        if (result.rowsAffected === 0) {
          throw new DatabaseError('Attachment not found', 'NOT_FOUND');
        }

        return { success: true, deletedId: id };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to delete attachment', 'DELETE_FAILED', error);
      }
    },

    async getByEntity(entityType, entityId) {
      try {
        validateEntityType(entityType);

        const result = await execute(
          `SELECT * FROM attachments 
           WHERE entity_type = ? AND entity_id = ? 
           ORDER BY created_at DESC`,
          [entityType, entityId]
        );

        return result.rows;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get attachments by entity', 'GET_FAILED', error);
      }
    },

    async deleteByEntity(entityType, entityId) {
      try {
        validateEntityType(entityType);

        const result = await execute(
          'DELETE FROM attachments WHERE entity_type = ? AND entity_id = ?',
          [entityType, entityId]
        );

        return { 
          success: true, 
          deletedCount: result.rowsAffected,
          entityType,
          entityId 
        };
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to delete attachments by entity', 'DELETE_FAILED', error);
      }
    },

    async getOrphaned() {
      try {
        const result = await execute(`
          SELECT a.* FROM attachments a
          LEFT JOIN contacts c ON a.entity_type = 'contact' AND a.entity_id = c.id
          LEFT JOIN interactions i ON a.entity_type = 'interaction' AND a.entity_id = i.id
          LEFT JOIN events e ON a.entity_type = 'event' AND a.entity_id = e.id
          LEFT JOIN notes n ON a.entity_type = 'note' AND a.entity_id = n.id
          WHERE 
            (a.entity_type = 'contact' AND c.id IS NULL) OR
            (a.entity_type = 'interaction' AND i.id IS NULL) OR
            (a.entity_type = 'event' AND e.id IS NULL) OR
            (a.entity_type = 'note' AND n.id IS NULL)
          ORDER BY a.created_at DESC
        `);

        return result.rows;
      } catch (error) {
        throw new DatabaseError('Failed to get orphaned attachments', 'GET_FAILED', error);
      }
    },

    async cleanupOrphaned() {
      try {
        const result = await execute(`
          DELETE FROM attachments 
          WHERE id IN (
            SELECT a.id FROM attachments a
            LEFT JOIN contacts c ON a.entity_type = 'contact' AND a.entity_id = c.id
            LEFT JOIN interactions i ON a.entity_type = 'interaction' AND a.entity_id = i.id
            LEFT JOIN events e ON a.entity_type = 'event' AND a.entity_id = e.id
            LEFT JOIN notes n ON a.entity_type = 'note' AND a.entity_id = n.id
            WHERE 
              (a.entity_type = 'contact' AND c.id IS NULL) OR
              (a.entity_type = 'interaction' AND i.id IS NULL) OR
              (a.entity_type = 'event' AND e.id IS NULL) OR
              (a.entity_type = 'note' AND n.id IS NULL)
          )
        `);

        return { 
          success: true, 
          deletedCount: result.rowsAffected 
        };
      } catch (error) {
        throw new DatabaseError('Failed to cleanup orphaned attachments', 'DELETE_FAILED', error);
      }
    },

    async updateFilePath(id, newFilePath, newThumbnailPath = null) {
      try {
        const updateData = { file_path: newFilePath };
        if (newThumbnailPath !== null) {
          updateData.thumbnail_path = newThumbnailPath;
        }

        return await this.update(id, updateData);
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to update file path', 'UPDATE_FAILED', error);
      }
    },

    async getTotalSize(entityType = null, entityId = null) {
      try {
        let sql = 'SELECT COALESCE(SUM(file_size), 0) as total_size FROM attachments';
        let params = [];

        if (entityType && entityId) {
          validateEntityType(entityType);
          sql += ' WHERE entity_type = ? AND entity_id = ?';
          params = [entityType, entityId];
        } else if (entityType) {
          validateEntityType(entityType);
          sql += ' WHERE entity_type = ?';
          params = [entityType];
        }

        const result = await execute(sql, params);
        return result.rows[0]?.total_size || 0;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get total size', 'GET_FAILED', error);
      }
    },

    async getByFileType(fileType, options = {}) {
      try {
        validateFileType(fileType);

        const {
          limit = 50,
          offset = 0,
          sortBy = 'created_at',
          sortOrder = 'DESC'
        } = options;

        const validSortColumns = ['id', 'entity_type', 'file_name', 'original_name', 'file_size', 'created_at'];
        if (!validSortColumns.includes(sortBy)) {
          throw new DatabaseError(`Invalid sort column: ${sortBy}`, 'VALIDATION_ERROR');
        }

        const validSortOrders = ['ASC', 'DESC'];
        if (!validSortOrders.includes(sortOrder.toUpperCase())) {
          throw new DatabaseError(`Invalid sort order: ${sortOrder}`, 'VALIDATION_ERROR');
        }

        const result = await execute(
          `SELECT * FROM attachments 
           WHERE file_type = ?
           ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
           LIMIT ? OFFSET ?`,
          [fileType, limit, offset]
        );

        return result.rows;
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError('Failed to get attachments by file type', 'GET_FAILED', error);
      }
    }
  };
}