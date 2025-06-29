/**
 * Area Entity
 *
 * Domain entity representing geographic/logical areas for worker assignments and customer mapping.
 * Implements business rules for area management in the multi-tenant agency system.
 *
 * Business Rules:
 * - Area code must be unique within agency scope
 * - Area name must be unique within agency scope
 * - Area must belong to an agency
 * - Geographic coordinates are optional but if provided must be valid
 * - Boundaries must be valid JSON polygon if provided
 * - Only authorized users can manage areas
 *
 * @domain Area Management
 * @pattern Domain Entity
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Area status enumeration
 */
export enum AreaStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Geographic coordinates for area location
 */
export interface AreaCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Area boundary definition as polygon coordinates
 */
export interface AreaBoundary {
  readonly type: 'Polygon';
  readonly coordinates: number[][][]; // GeoJSON Polygon format
}

/**
 * Area creation properties
 */
export interface AreaProps {
  readonly areaCode: string;
  readonly areaName: string;
  readonly description?: string;
  readonly coordinates?: AreaCoordinates;
  readonly boundaries?: AreaBoundary;
  readonly status?: AreaStatus;
  readonly agencyId: string;
  readonly createdBy: string;
}

/**
 * Area persistence interface
 */
export interface AreaPersistence {
  readonly id: string;
  readonly agencyId: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly description: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly boundaries: string | null; // JSON string
  readonly status: AreaStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string;
}

/**
 * Area update properties
 */
export interface AreaUpdateProps {
  readonly areaName?: string;
  readonly description?: string | null;
  readonly coordinates?: AreaCoordinates | null;
  readonly boundaries?: AreaBoundary | null;
  readonly status?: AreaStatus;
  readonly updatedBy: string;
}

/**
 * Area domain errors
 */
export class AreaDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AreaDomainError';
  }
}

export class AreaValidationError extends AreaDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'AreaValidationError';
  }
}

export class AreaBusinessRuleError extends AreaDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'AreaBusinessRuleError';
  }
}

/**
 * Area Entity Class
 */
export class Area {
  private readonly _id: string;
  private readonly _agencyId: string;
  private readonly _areaCode: string;
  private _areaName: string;
  private _description: string | null;
  private _coordinates: AreaCoordinates | null;
  private _boundaries: AreaBoundary | null;
  private _status: AreaStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _createdBy: string;

  // Business constants
  private static readonly MIN_CODE_LENGTH = 2;
  private static readonly MAX_CODE_LENGTH = 20;
  private static readonly MIN_NAME_LENGTH = 2;
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;
  private static readonly MIN_LATITUDE = -90;
  private static readonly MAX_LATITUDE = 90;
  private static readonly MIN_LONGITUDE = -180;
  private static readonly MAX_LONGITUDE = 180;

  /**
   * Creates an Area entity
   * @param props - Area properties
   * @param id - Optional ID for existing areas
   */
  constructor(props: AreaProps, id?: string) {
    this.validateAreaProps(props);

    this._id = id || this.generateId();
    this._agencyId = props.agencyId;
    this._areaCode = props.areaCode;
    this._areaName = props.areaName;
    this._description = props.description || null;
    this._coordinates = props.coordinates || null;
    this._boundaries = props.boundaries || null;
    this._status = props.status || AreaStatus.ACTIVE;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._createdBy = props.createdBy;

    // Validate coordinates if provided
    if (this._coordinates) {
      this.validateCoordinates(this._coordinates);
    }

    // Validate boundaries if provided
    if (this._boundaries) {
      this.validateBoundaries(this._boundaries);
    }

    Object.freeze(this);
  }

  /**
   * Factory method to create a new Area
   * @param props - Area creation properties
   * @returns New Area instance
   */
  public static create(props: AreaProps): Area {
    return new Area(props);
  }

  /**
   * Create area from persistence data
   * @param data - Persistence data
   * @returns Area instance
   */
  public static fromPersistence(data: AreaPersistence): Area {
    const props: AreaProps = {
      areaCode: data.areaCode,
      areaName: data.areaName,
      agencyId: data.agencyId,
      createdBy: data.createdBy,
      ...(data.description && { description: data.description }),
      ...(data.latitude &&
        data.longitude && {
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        }),
      ...(data.boundaries && {
        boundaries: JSON.parse(data.boundaries) as AreaBoundary,
      }),
      status: data.status,
    };

    const area = new Area(props, data.id);
    area._updatedAt = data.updatedAt;

    return area;
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get agencyId(): string {
    return this._agencyId;
  }

  public get areaCode(): string {
    return this._areaCode;
  }

  public get areaName(): string {
    return this._areaName;
  }

  public get description(): string | null {
    return this._description;
  }

  public get coordinates(): AreaCoordinates | null {
    return this._coordinates;
  }

  public get boundaries(): AreaBoundary | null {
    return this._boundaries;
  }

  public get status(): AreaStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get createdBy(): string {
    return this._createdBy;
  }

  // Business methods

  /**
   * Update area details
   * @param props - Update properties
   * @returns Updated Area instance
   */
  public update(props: AreaUpdateProps): Area {
    this.validateUpdateProps(props);

    // Build update properties object
    const baseProps = {
      areaCode: this._areaCode,
      areaName: props.areaName || this._areaName,
      agencyId: this._agencyId,
      createdBy: this._createdBy,
      status: props.status || this._status,
    };

    // Add optional properties conditionally
    const updatedProps: AreaProps = {
      ...baseProps,
      ...(props.description !== undefined && props.description !== null && { description: props.description }),
      ...(props.description === undefined && this._description !== null && { description: this._description }),
      ...(props.coordinates !== undefined && props.coordinates !== null && { coordinates: props.coordinates }),
      ...(props.coordinates === undefined && this._coordinates !== null && { coordinates: this._coordinates }),
      ...(props.boundaries !== undefined && props.boundaries !== null && { boundaries: props.boundaries }),
      ...(props.boundaries === undefined && this._boundaries !== null && { boundaries: this._boundaries }),
    };

    const updatedArea = new Area(updatedProps, this._id);
    updatedArea._updatedAt = new Date();

    return updatedArea;
  }

  /**
   * Activate area
   * @param updatedBy - User ID making the change
   * @returns Updated Area instance
   */
  public activate(updatedBy: string): Area {
    if (this._status === AreaStatus.ACTIVE) {
      throw new AreaBusinessRuleError('Area is already active');
    }

    return this.update({
      status: AreaStatus.ACTIVE,
      updatedBy,
    });
  }

  /**
   * Deactivate area
   * @param updatedBy - User ID making the change
   * @returns Updated Area instance
   */
  public deactivate(updatedBy: string): Area {
    if (this._status === AreaStatus.INACTIVE) {
      throw new AreaBusinessRuleError('Area is already inactive');
    }

    return this.update({
      status: AreaStatus.INACTIVE,
      updatedBy,
    });
  }

  /**
   * Check if area is active
   * @returns Boolean indicating if area is active
   */
  public isActive(): boolean {
    return this._status === AreaStatus.ACTIVE;
  }

  /**
   * Check if area has geographic coordinates
   * @returns Boolean indicating if coordinates are set
   */
  public hasCoordinates(): boolean {
    return this._coordinates !== null;
  }

  /**
   * Check if area has defined boundaries
   * @returns Boolean indicating if boundaries are set
   */
  public hasBoundaries(): boolean {
    return this._boundaries !== null;
  }

  /**
   * Convert to persistence format
   * @returns Persistence data
   */
  public toPersistence(): AreaPersistence {
    return {
      id: this._id,
      agencyId: this._agencyId,
      areaCode: this._areaCode,
      areaName: this._areaName,
      description: this._description,
      latitude: this._coordinates?.latitude || null,
      longitude: this._coordinates?.longitude || null,
      boundaries: this._boundaries ? JSON.stringify(this._boundaries) : null,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      createdBy: this._createdBy,
    };
  }

  // Private methods

  /**
   * Generate unique ID for area
   * @returns Generated UUID
   */
  private generateId(): string {
    return uuidv4();
  }

  /**
   * Validate area creation properties
   * @param props - Area properties to validate
   */
  private validateAreaProps(props: AreaProps): void {
    if (!props.areaCode || typeof props.areaCode !== 'string') {
      throw new AreaValidationError('Area code is required');
    }

    if (!props.areaName || typeof props.areaName !== 'string') {
      throw new AreaValidationError('Area name is required');
    }

    if (!props.agencyId || typeof props.agencyId !== 'string') {
      throw new AreaValidationError('Agency ID is required');
    }

    if (!props.createdBy || typeof props.createdBy !== 'string') {
      throw new AreaValidationError('Created by is required');
    }

    this.validateAreaCode(props.areaCode);
    this.validateAreaName(props.areaName);

    if (props.description) {
      this.validateDescription(props.description);
    }
  }

  /**
   * Validate update properties
   * @param props - Update properties to validate
   */
  private validateUpdateProps(props: AreaUpdateProps): void {
    if (!props.updatedBy || typeof props.updatedBy !== 'string') {
      throw new AreaValidationError('Updated by is required');
    }

    if (props.areaName !== undefined) {
      this.validateAreaName(props.areaName);
    }

    if (props.description !== undefined && props.description !== null) {
      this.validateDescription(props.description);
    }

    if (props.coordinates) {
      this.validateCoordinates(props.coordinates);
    }

    if (props.boundaries) {
      this.validateBoundaries(props.boundaries);
    }
  }

  /**
   * Validate area code
   * @param areaCode - Area code to validate
   */
  private validateAreaCode(areaCode: string): void {
    const trimmedCode = areaCode.trim();

    if (trimmedCode.length < Area.MIN_CODE_LENGTH) {
      throw new AreaValidationError(`Area code must be at least ${Area.MIN_CODE_LENGTH} characters long`);
    }

    if (trimmedCode.length > Area.MAX_CODE_LENGTH) {
      throw new AreaValidationError(`Area code must not exceed ${Area.MAX_CODE_LENGTH} characters`);
    }

    // Check for valid characters (alphanumeric and hyphens/underscores)
    const validCodePattern = /^[A-Za-z0-9_-]+$/;
    if (!validCodePattern.test(trimmedCode)) {
      throw new AreaValidationError('Area code can only contain letters, numbers, hyphens, and underscores');
    }
  }

  /**
   * Validate area name
   * @param areaName - Area name to validate
   */
  private validateAreaName(areaName: string): void {
    const trimmedName = areaName.trim();

    if (trimmedName.length < Area.MIN_NAME_LENGTH) {
      throw new AreaValidationError(`Area name must be at least ${Area.MIN_NAME_LENGTH} characters long`);
    }

    if (trimmedName.length > Area.MAX_NAME_LENGTH) {
      throw new AreaValidationError(`Area name must not exceed ${Area.MAX_NAME_LENGTH} characters`);
    }
  }

  /**
   * Validate description
   * @param description - Description to validate
   */
  private validateDescription(description: string): void {
    if (description.length > Area.MAX_DESCRIPTION_LENGTH) {
      throw new AreaValidationError(`Description must not exceed ${Area.MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  /**
   * Validate geographic coordinates
   * @param coordinates - Coordinates to validate
   */
  private validateCoordinates(coordinates: AreaCoordinates): void {
    if (
      typeof coordinates.latitude !== 'number' ||
      coordinates.latitude < Area.MIN_LATITUDE ||
      coordinates.latitude > Area.MAX_LATITUDE
    ) {
      throw new AreaValidationError('Latitude must be a number between -90 and 90');
    }

    if (
      typeof coordinates.longitude !== 'number' ||
      coordinates.longitude < Area.MIN_LONGITUDE ||
      coordinates.longitude > Area.MAX_LONGITUDE
    ) {
      throw new AreaValidationError('Longitude must be a number between -180 and 180');
    }
  }

  /**
   * Validate area boundaries
   * @param boundaries - Boundaries to validate
   */
  private validateBoundaries(boundaries: AreaBoundary): void {
    if (boundaries.type !== 'Polygon') {
      throw new AreaValidationError('Boundaries must be of type Polygon');
    }

    if (!Array.isArray(boundaries.coordinates) || boundaries.coordinates.length === 0) {
      throw new AreaValidationError('Polygon coordinates must be a non-empty array');
    }

    // Validate each ring of the polygon
    for (const ring of boundaries.coordinates) {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new AreaValidationError('Polygon ring must have at least 4 coordinate pairs');
      }

      // Check if first and last coordinates are the same (closed ring)
      const firstCoord = ring[0];
      const lastCoord = ring[ring.length - 1];
      if (!firstCoord || !lastCoord || firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
        throw new AreaValidationError('Polygon ring must be closed (first and last coordinates must be the same)');
      }

      // Validate each coordinate pair
      for (const coord of ring) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new AreaValidationError('Each coordinate must be an array with longitude and latitude');
        }

        const [longitude, latitude] = coord;
        if (typeof longitude !== 'number' || typeof latitude !== 'number') {
          throw new AreaValidationError('Coordinates must be numbers');
        }

        if (longitude < Area.MIN_LONGITUDE || longitude > Area.MAX_LONGITUDE) {
          throw new AreaValidationError('Longitude must be between -180 and 180');
        }

        if (latitude < Area.MIN_LATITUDE || latitude > Area.MAX_LATITUDE) {
          throw new AreaValidationError('Latitude must be between -90 and 90');
        }
      }
    }
  }
}
