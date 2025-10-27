/**
 * SIMULATOR TYPES
 *
 * Purpose: Type definitions for the unit state simulator
 */

export type UnitState =
  | 'OCCUPIED'
  | 'ON_NOTICE'
  | 'ON_NOTICE_RENTED'
  | 'VACANT_NOT_READY'
  | 'VACANT_READY'
  | 'PRELEASED'
  | 'OFFLINE';

/**
 * Simulated unit with dates and state transitions
 */
export interface SimulatedUnit {
  unitId: string;
  floorplanCode: string;
  currentRent: number;
  leaseEndDate: string; // ISO date string
  moveInDate: string | null; // ISO date string or null
  noticeDate: string | null; // ISO date string or null
  preleaseStart: string | null; // ISO date string or null
  vacantDays: number; // Days vacant since move-out
  state: UnitState;
}

/**
 * Configuration for state transition probabilities per floorplan
 */
export interface FloorplanConfig {
  floorplanCode: string;
  p_notice: number; // Daily probability of receiving notice
  p_prelease: number; // Daily probability of preleasing
  p_make_ready: number; // Daily probability of completing make-ready
  max_make_ready_days: number; // Maximum make-ready days
  max_prelease_days: number; // Maximum prelease window
}

/**
 * Simulation state and controls
 */
export interface SimulatorState {
  seed: number;
  currentDate: Date;
  tickRate: number; // Ticks per day (1 = daily, 2 = twice per day, etc.)
  isRunning: boolean;
  units: SimulatedUnit[];
  floorplanConfigs: Map<string, FloorplanConfig>;
}

