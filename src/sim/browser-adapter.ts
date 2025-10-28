/**
 * BROWSER ADAPTER FOR SIMULATOR
 *
 * Purpose: Expose simulator controls via window.RMS API for browser-based testing
 *
 * This adapter bridges the TypeScript simulator to a JavaScript-accessible API
 * that can be called from the browser console or UI controls.
 */

import { SimDataProvider } from '../data/SimDataProvider';
import type { UnitState } from '../pricing/types';

/**
 * Snapshot of simulator state at a point in time
 */
export interface SimulatorSnapshot {
  nowSeconds: number;
  dataSource: 'simulation' | 'real';
  boxScore: {
    totalUnits: number;
    occupiedUnits: number;
    onNoticeUnits: number;
    vacantReadyUnits: number;
    preleasedUnits: number;
    occupancyRate: number;
    projectedOccupancy: number;
    vacantDaysAvg: number;
  };
  lists: {
    occupied: UnitState[];
    onNotice: UnitState[];
    vacantReady: UnitState[];
    preleased: UnitState[];
  };
  pricesByFP: Record<string, {
    newRent: number;
    delta: number;
    reasons: string[];
  }>;
  trendOverrides: Record<string, number>;
  propertyInfo: {
    totalUnits: number;
    mixByFP: Record<string, number>;
  };
}

/**
 * Configuration for simulator initialization
 */
export interface SimulatorConfig {
  seed: number;
  totalUnits: number;
  mixByFP: Record<string, number>; // { floorplanCode: percentage }
  startingRents: Record<string, number>;
}

/**
 * Ring buffer for history snapshots
 */
class SnapshotHistory {
  private buffer: SimulatorSnapshot[];
  private maxSize: number;
  private pointer: number;

  constructor(maxSize: number = 200) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.pointer = 0;
  }

  add(snapshot: SimulatorSnapshot): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(snapshot);
    } else {
      this.buffer[this.pointer] = snapshot;
      this.pointer = (this.pointer + 1) % this.maxSize;
    }
  }

  getAll(): SimulatorSnapshot[] {
    return [...this.buffer].sort((a, b) => a.nowSeconds - b.nowSeconds);
  }

  get(index: number): SimulatorSnapshot | null {
    return this.buffer[index] || null;
  }

  clear(): void {
    this.buffer = [];
    this.pointer = 0;
  }

  size(): number {
    return this.buffer.length;
  }
}

/**
 * Browser API implementation
 */
class BrowserSimulatorAPI {
  private mode: 'simulation' | 'real' = 'real';
  private simDataProvider: SimDataProvider | null = null;
  private config: SimulatorConfig | null = null;
  private history: SnapshotHistory;
  private trendOverrides: Record<string, number> = {};
  private pricingResults: Record<string, any> = {};

  constructor() {
    this.history = new SnapshotHistory(200);
  }

  /**
   * Set simulation or real mode
   */
  setMode(mode: 'simulation' | 'real'): void {
    this.mode = mode;
    console.log(`[RMS] Mode set to: ${mode}`);
  }

  /**
   * Get current mode
   */
  getMode(): 'simulation' | 'real' {
    return this.mode;
  }

  /**
   * Initialize simulator with config
   */
  initSim(config: SimulatorConfig): void {
    this.config = config;
    
    // Build floorplan array for SimDataProvider
    const floorplans = Object.keys(config.mixByFP).map(code => {
      const percentage = config.mixByFP[code];
      const count = Math.round((config.totalUnits * percentage) / 100);
      const startingRent = config.startingRents[code] || 1500;
      
      return { code, count, startingRent };
    });

    this.simDataProvider = new SimDataProvider(config.seed, floorplans);
    console.log(`[RMS] Simulator initialized with seed ${config.seed}, ${config.totalUnits} total units`);
  }

  /**
   * Reset simulator to initial state
   */
  resetSim(seed?: number): void {
    if (!this.config) {
      throw new Error('Simulator not initialized. Call initSim first.');
    }
    
    const newSeed = seed ?? this.config.seed;
    this.config.seed = newSeed;
    this.initSim(this.config);
    this.history.clear();
    this.trendOverrides = {};
    this.pricingResults = {};
    console.log(`[RMS] Simulator reset to seed ${newSeed}`);
  }

  /**
   * Set seed
   */
  setSeed(seed: number): void {
    if (this.config) {
      this.config.seed = seed;
    }
    console.log(`[RMS] Seed set to: ${seed}`);
  }

  /**
   * Set total unit count
   */
  setUnits(n: number): void {
    if (!this.config) {
      throw new Error('Simulator not initialized. Call initSim first.');
    }
    this.config.totalUnits = n;
    this.initSim(this.config);
    console.log(`[RMS] Total units set to: ${n}`);
  }

  /**
   * Set floorplan mix (% per FP)
   */
  setMix(mixByFP: Record<string, number>): void {
    if (!this.config) {
      throw new Error('Simulator not initialized. Call initSim first.');
    }
    this.config.mixByFP = mixByFP;
    this.initSim(this.config);
    console.log(`[RMS] Mix updated:`, mixByFP);
  }

  /**
   * Set trend overrides (percentage points, e.g., -5 to +5)
   */
  setTrendOverrides(overrides: Record<string, number>): void {
    this.trendOverrides = { ...this.trendOverrides, ...overrides };
    console.log(`[RMS] Trend overrides:`, this.trendOverrides);
  }

  /**
   * Compute pricing without advancing time
   */
  runOnce(): void {
    if (this.mode === 'simulation' && this.simDataProvider) {
      const units = this.simDataProvider.getUnits();
      const boxScore = this.simDataProvider.getBoxScore();
      const today = this.simDataProvider.getToday();
      
      // TODO: Call pricing engine here
      // For now, just capture the state
      this.pricingResults = {};
      console.log('[RMS] Pricing computed (runOnce)');
    } else {
      console.log('[RMS] Not in simulation mode or provider not initialized');
    }
  }

  /**
   * Get last invariant check result (public for UI)
   */
  private lastInvariantCheck: { valid: boolean; message?: string } = { valid: true };

  /**
   * Get last invariant check result
   */
  getInvariantCheck(): { valid: boolean; message?: string } {
    return this.lastInvariantCheck;
  }

  /**
   * Check invariants after a step
   */
  private checkInvariants(): { valid: boolean; message?: string } {
    if (!this.simDataProvider) {
      return { valid: true };
    }
    
    const units = this.simDataProvider.getUnits();
    const boxScore = this.simDataProvider.getBoxScore();
    
    // Check: total units match expected
    if (this.config && units.length !== this.config.totalUnits) {
      return {
        valid: false,
        message: `Unit count mismatch: expected ${this.config.totalUnits}, got ${units.length}`
      };
    }
    
    // Check: bucket counts sum to total
    const sumBuckets = boxScore.occupied + boxScore.onNotice + boxScore.vacant + boxScore.preleased;
    if (sumBuckets !== boxScore.totalUnits) {
      return {
        valid: false,
        message: `Bucket counts don't sum: ${boxScore.occupied}+${boxScore.onNotice}+${boxScore.vacant}+${boxScore.preleased} ≠ ${boxScore.totalUnits}`
      };
    }
    
    // Check: no negative rents
    const negativeRents = units.filter(u => u.currentRent < 0);
    if (negativeRents.length > 0) {
      return {
        valid: false,
        message: `Negative rent detected on ${negativeRents.length} units`
      };
    }
    
    return { valid: true };
  }

  /**
   * Advance one day in simulation
   */
  step(): void {
    if (this.mode === 'simulation' && this.simDataProvider) {
      this.simDataProvider.advanceDays(1);
      
      // Capture snapshot and check invariants
      const snapshot = this.getSnapshot();
      this.history.add(snapshot);
      
      this.lastInvariantCheck = this.checkInvariants();
      if (!this.lastInvariantCheck.valid) {
        console.error('[RMS] Invariant violation:', this.lastInvariantCheck.message);
      }
      
      console.log(`[RMS] Stepped forward 1 day`);
    } else {
      console.log('[RMS] Not in simulation mode or provider not initialized');
    }
  }

  /**
   * Load CSV file (future enhancement)
   */
  loadCSV(file: File): void {
    console.log('[RMS] CSV loading not yet implemented');
    // TODO: Implement CSV parsing and switching to 'real' mode
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): SimulatorSnapshot {
    if (this.mode === 'simulation' && this.simDataProvider) {
      const units = this.simDataProvider.getUnits();
      const rawBoxScore = this.simDataProvider.getBoxScore();
      const today = this.simDataProvider.getToday();
      
      // Convert box score to snapshot format
      const boxScore = {
        totalUnits: rawBoxScore.totalUnits,
        occupiedUnits: rawBoxScore.occupied,
        onNoticeUnits: rawBoxScore.onNotice,
        vacantReadyUnits: rawBoxScore.vacant,
        preleasedUnits: rawBoxScore.preleased,
        occupancyRate: rawBoxScore.occupancyRate,
        projectedOccupancy: rawBoxScore.projectedOccupancy,
        vacantDaysAvg: 0, // TODO: Compute from units
      };
      
      // Classify units into lists
      const lists = {
        occupied: units.filter(u => u.status.toLowerCase().includes('occupied') && !u.status.toLowerCase().includes('notice')),
        onNotice: units.filter(u => u.status.toLowerCase().includes('notice')),
        vacantReady: units.filter(u => u.status === 'Vacant' || u.status.toLowerCase().includes('vacant')),
        preleased: units.filter(u => u.status === 'Preleased' || u.status.toLowerCase().includes('preleased')),
      };
      
      return {
        nowSeconds: Math.floor(today.getTime() / 1000),
        dataSource: 'simulation',
        boxScore,
        lists,
        pricesByFP: this.pricingResults,
        trendOverrides: this.trendOverrides,
        propertyInfo: this.config ? {
          totalUnits: this.config.totalUnits,
          mixByFP: this.config.mixByFP,
        } : { totalUnits: 0, mixByFP: {} },
      };
    } else {
      // Real mode
      return {
        nowSeconds: Math.floor(Date.now() / 1000),
        dataSource: 'real',
        boxScore: { totalUnits: 0, occupiedUnits: 0, onNoticeUnits: 0, vacantReadyUnits: 0, preleasedUnits: 0, occupancyRate: 0, projectedOccupancy: 0, vacantDaysAvg: 0 },
        lists: { occupied: [], onNotice: [], vacantReady: [], preleased: [] },
        pricesByFP: {},
        trendOverrides: {},
        propertyInfo: { totalUnits: 0, mixByFP: {} },
      };
    }
  }

  /**
   * Get history snapshots
   */
  getHistory(): SimulatorSnapshot[] {
    return this.history.getAll();
  }

  /**
   * Load snapshot from history
   */
  loadSnapshot(index: number): SimulatorSnapshot | null {
    return this.history.get(index);
  }

  /**
   * Capture current state to history
   */
  private captureSnapshot(): void {
    const snapshot = this.getSnapshot();
    this.history.add(snapshot);
  }

  /**
   * Start automatic stepping (future enhancement)
   */
  start(intervalMs: number = 1000): void {
    console.log('[RMS] Auto-stepping not yet implemented');
    // TODO: Implement auto-step with setInterval
  }

  /**
   * Stop automatic stepping
   */
  stop(): void {
    console.log('[RMS] Stopping auto-step');
    // TODO: Clear interval
  }
}

/**
 * Expose API to window.RMS
 */
let api: BrowserSimulatorAPI | null = null;

export function getBrowserAPI(): BrowserSimulatorAPI {
  if (!api) {
    api = new BrowserSimulatorAPI();
  }
  return api;
}

// Browser-only setup
if (typeof window !== 'undefined') {
  const apiObj = getBrowserAPI();
  
  // Expose all methods on window.RMS
  (window as any).RMS = {
    // Mode control
    setMode: (mode: 'simulation' | 'real') => apiObj.setMode(mode),
    getMode: () => apiObj.getMode(),
    
    // Simulator control
    initSim: (config: SimulatorConfig) => apiObj.initSim(config),
    resetSim: (seed?: number) => apiObj.resetSim(seed),
    setSeed: (seed: number) => apiObj.setSeed(seed),
    setUnits: (n: number) => apiObj.setUnits(n),
    setMix: (mixByFP: Record<string, number>) => apiObj.setMix(mixByFP),
    setTrendOverrides: (overrides: Record<string, number>) => apiObj.setTrendOverrides(overrides),
    
    // Execution
    runOnce: () => apiObj.runOnce(),
    step: () => apiObj.step(),
    
    // CSV loading
    loadCSV: (file: File) => apiObj.loadCSV(file),
    
    // Snapshot management
    getSnapshot: () => apiObj.getSnapshot(),
    getHistory: () => apiObj.getHistory(),
    loadSnapshot: (index: number) => apiObj.loadSnapshot(index),
    
    // Invariant checking
    getInvariantCheck: () => apiObj.getInvariantCheck(),
    
    // Auto-stepping
    start: (intervalMs?: number) => apiObj.start(intervalMs),
    stop: () => apiObj.stop(),
  };
  
  (window as any).RMS.getAPI = getBrowserAPI;
}

