/**
 * Update Area Command
 *
 * Command for updating existing areas in the multi-tenant agency system.
 * Follows CQRS pattern for write operations with proper validation.
 *
 * Business Rules:
 * - Area must exist and be accessible by the user
 * - Area code cannot be changed once created
 * - Area name must be unique within agency scope (if changed)
 * - Geographic coordinates are optional but if provided must be valid
 * - Boundaries must be valid JSON polygon if provided
 * - Only authorized users can update areas
 *
 * @domain Area Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { AreaCoordinates, AreaBoundary, AreaStatus } from '../../../domain/entities/area';

/**
 * Update Area Command Interface
 */
export interface UpdateAreaCommand {
  readonly id: string;
  readonly areaName?: string;
  readonly description?: string | null;
  readonly coordinates?: AreaCoordinates | null;
  readonly boundaries?: AreaBoundary | null;
  readonly status?: AreaStatus;
  readonly updatedBy: string;
}

/**
 * Update Area Command Result
 */
export interface UpdateAreaCommandResult {
  readonly success: boolean;
  readonly areaId?: string;
  readonly areaCode?: string;
  readonly areaName?: string;
  readonly agencyId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

/**
 * Update Area Command Validation Error
 */
export class UpdateAreaCommandValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(errors: string[]) {
    super(`Area update validation failed: ${errors.join(', ')}`);
    this.name = 'UpdateAreaCommandValidationError';
    this.validationErrors = errors;
  }
}

/**
 * Validate Update Area Command
 * @param command - Command to validate
 * @throws {UpdateAreaCommandValidationError} When validation fails
 */
export function validateUpdateAreaCommand(command: UpdateAreaCommand): void {
  const errors: string[] = [];

  // Validate area ID
  if (!command.id || typeof command.id !== 'string' || command.id.trim().length === 0) {
    errors.push('Area ID is required');
  }

  // Validate updated by
  if (!command.updatedBy || typeof command.updatedBy !== 'string' || command.updatedBy.trim().length === 0) {
    errors.push('Updated by is required');
  }

  // Validate optional area name
  if (command.areaName !== undefined) {
    if (typeof command.areaName !== 'string') {
      errors.push('Area name must be a string');
    } else {
      const trimmedName = command.areaName.trim();
      if (trimmedName.length < 2) {
        errors.push('Area name must be at least 2 characters long');
      }
      if (trimmedName.length > 100) {
        errors.push('Area name must not exceed 100 characters');
      }
    }
  }

  // Validate optional description
  if (command.description !== undefined && command.description !== null) {
    if (typeof command.description !== 'string') {
      errors.push('Description must be a string');
    } else if (command.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }
  }

  // Validate optional coordinates
  if (command.coordinates !== undefined && command.coordinates !== null) {
    if (typeof command.coordinates !== 'object') {
      errors.push('Coordinates must be an object');
    } else {
      if (
        typeof command.coordinates.latitude !== 'number' ||
        command.coordinates.latitude < -90 ||
        command.coordinates.latitude > 90
      ) {
        errors.push('Latitude must be a number between -90 and 90');
      }
      if (
        typeof command.coordinates.longitude !== 'number' ||
        command.coordinates.longitude < -180 ||
        command.coordinates.longitude > 180
      ) {
        errors.push('Longitude must be a number between -180 and 180');
      }
    }
  }

  // Validate optional boundaries
  if (command.boundaries !== undefined && command.boundaries !== null) {
    if (typeof command.boundaries !== 'object') {
      errors.push('Boundaries must be an object');
    } else {
      if (command.boundaries.type !== 'Polygon') {
        errors.push('Boundaries must be of type Polygon');
      }
      if (!Array.isArray(command.boundaries.coordinates) || command.boundaries.coordinates.length === 0) {
        errors.push('Polygon coordinates must be a non-empty array');
      } else {
        // Validate each ring of the polygon
        for (let i = 0; i < command.boundaries.coordinates.length; i++) {
          const ring = command.boundaries.coordinates[i];
          if (!Array.isArray(ring) || ring.length < 4) {
            errors.push(`Polygon ring ${i} must have at least 4 coordinate pairs`);
            continue;
          }

          // Check if first and last coordinates are the same (closed ring)
          const firstCoord = ring[0];
          const lastCoord = ring[ring.length - 1];
          if (!firstCoord || !lastCoord || firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            errors.push(`Polygon ring ${i} must be closed (first and last coordinates must be the same)`);
            continue;
          }

          // Validate each coordinate pair
          for (let j = 0; j < ring.length; j++) {
            const coord = ring[j];
            if (!Array.isArray(coord) || coord.length !== 2) {
              errors.push(`Coordinate ${j} in ring ${i} must be an array with longitude and latitude`);
              continue;
            }

            const [longitude, latitude] = coord;
            if (typeof longitude !== 'number' || typeof latitude !== 'number') {
              errors.push(`Coordinate ${j} in ring ${i} must contain numbers`);
              continue;
            }

            if (longitude < -180 || longitude > 180) {
              errors.push(`Longitude in coordinate ${j} of ring ${i} must be between -180 and 180`);
            }

            if (latitude < -90 || latitude > 90) {
              errors.push(`Latitude in coordinate ${j} of ring ${i} must be between -90 and 90`);
            }
          }
        }
      }
    }
  }

  // Validate optional status
  if (command.status !== undefined && !Object.values(AreaStatus).includes(command.status)) {
    errors.push('Status must be a valid area status');
  }

  if (errors.length > 0) {
    throw new UpdateAreaCommandValidationError(errors);
  }
}
