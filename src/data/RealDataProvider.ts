/**
 * REAL DATA PROVIDER
 * 
 * Purpose: Implements PricingDataProvider using actual rent roll uploads and browser storage.
 * 
 * Data sources:
 * - window.mappedRows: Rent roll data from CSV upload
 * - window.propertySetup: Floorplan configuration
 * - localStorage: Carry-forward baselines and starting rents
 * - Dashboard stats: Computed occupancy trends
 * 
 * This provider bridges the gap between the existing UI/data flow and the new pricing engine.
 */

import type {
  UnitState,
  FloorplanTrend,
  CommunityMetrics,
  CarryForwardBaseline,
} from '../pricing/types';
import type {
  PricingDataProvider,
  BoxScoreData,
  LeadsAppsData,
} from './PricingDataProvider';

/**
 * Real data provider - uses actual rent roll and browser storage
 */
export class RealDataProvider implements PricingDataProvider {
  private ready: boolean = false;
  
  constructor() {
    // Check if data is available
    this.ready = this.checkDataAvailability();
  }
  
  /**
   * Check if required data is available in global scope
   */
  private checkDataAvailability(): boolean {
    // Check for window.mappedRows (rent roll data)
    if (typeof window === 'undefined') {
      return false;
    }
    
    const hasMappedRows = Array.isArray((window as any).mappedRows) && (window as any).mappedRows.length > 0;
    const hasPropertySetup = (window as any).propertySetup && Array.isArray((window as any).propertySetup.floorplans);
    
    return hasMappedRows && hasPropertySetup;
  }
  
  /**
   * Get all units from rent roll
   */
  async getUnits(): Promise<UnitState[]> {
    if (!this.ready) {
      console.warn('[RealDataProvider] Data not ready, returning empty array');
      return [];
    }
    
    const mappedRows = (window as any).mappedRows || [];
    
    return mappedRows.map((row: any) => ({
      unitId: String(row.UnitID || row.unit || ''),
      floorplanCode: String(row.FP_CODE || row.Floorplan || '').split(/\s+/)[0], // Extract code
      floorplanLabel: String(row.Floorplan || ''),
      status: String(row.Status || '').toLowerCase(),
      currentRent: Number(row.CurrentRent || row['Current Rent'] || 0),
      leaseEndDate: row.LeaseEnd || row['Lease End'],
      preleaseStartDate: row.PreleaseStart || row['Prelease Start'],
      vacantDays: Number(row.VacantDays || 0),
      moveInDate: row.MoveInDate || row['Move In Date'],
      amenityAdj: Number(row.AmenityAdj || 0),
    }));
  }
  
  /**
   * Get box score data (trending occupancy and metrics)
   */
  async getBoxScore(): Promise<BoxScoreData> {
    if (!this.ready) {
      console.warn('[RealDataProvider] Data not ready, returning empty box score');
      return {
        floorplanTrends: {},
        communityMetrics: {
          trendingOccupancy: 0,
          currentOccupancy: 0,
          target: 0.95,
        },
        calculatedAt: new Date(),
      };
    }
    
    // Get property setup
    const propertySetup = (window as any).propertySetup || {};
    const floorplans = propertySetup.floorplans || [];
    
    // Compute trends from mapped rows
    const units = await this.getUnits();
    const floorplanTrends: Record<string, FloorplanTrend> = {};
    
    for (const fp of floorplans) {
      const code = fp.code;
      const fpUnits = units.filter(u => u.floorplanCode === code);
      
      if (fpUnits.length === 0) {
        continue;
      }
      
      // Count occupied vs total
      const occupied = fpUnits.filter(u => 
        !u.status.includes('vacant') || u.status.includes('notice')
      ).length;
      const total = fpUnits.length;
      const trending = total > 0 ? occupied / total : 0;
      
      floorplanTrends[code] = {
        code,
        trending,
        current: trending, // Same as trending for now (no historical data)
        bandLow: 0.93,
        bandHigh: 0.96,
        bedrooms: Number(fp.bedrooms || 0),
      };
    }
    
    // Compute community metrics
    const totalUnits = units.length;
    const totalOccupied = units.filter(u => 
      !u.status.includes('vacant') || u.status.includes('notice')
    ).length;
    const communityMetrics: CommunityMetrics = {
      trendingOccupancy: totalUnits > 0 ? totalOccupied / totalUnits : 0,
      currentOccupancy: totalUnits > 0 ? totalOccupied / totalUnits : 0,
      target: 0.95, // Default target
    };
    
    return {
      floorplanTrends,
      communityMetrics,
      calculatedAt: new Date(),
    };
  }
  
  /**
   * Get leads and applications data for a floorplan
   * 
   * NOTE: This is not yet implemented in the current system.
   * Returns null for now (conversion steering will be skipped).
   */
  async getLeadsApps(floorplanCode: string, days: number): Promise<LeadsAppsData | null> {
    // TODO: Implement leads/apps tracking in future step
    return null;
  }
  
  /**
   * Get carry-forward baselines from previous pricing run
   */
  async getCarryForwardBaselines(): Promise<Record<string, CarryForwardBaseline>> {
    const baselines: Record<string, CarryForwardBaseline> = {};
    
    try {
      const stored = localStorage.getItem('rm_carry_forward_unit_baselines');
      if (!stored) {
        return baselines;
      }
      
      const data = JSON.parse(stored);
      
      // Convert stored format to CarryForwardBaseline format
      for (const [unitId, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          const baseline = value as any;
          baselines[unitId] = {
            unitId,
            floorplanCode: baseline.floorplanCode || baseline.code || '',
            priorApprovedRent: Number(baseline.rent || baseline.priorApprovedRent || 0),
            priorApprovedDate: baseline.date || baseline.priorApprovedDate || new Date().toISOString(),
            term: Number(baseline.term || 14),
          };
        }
      }
    } catch (e) {
      console.warn('[RealDataProvider] Error loading carry-forward baselines:', e);
    }
    
    return baselines;
  }
  
  /**
   * Get starting rents for each floorplan
   */
  async getStartingRents(): Promise<Record<string, number>> {
    const startingRents: Record<string, number> = {};
    
    try {
      // Try to get from localStorage first
      const stored = localStorage.getItem('rm_starting_rents');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Fallback: compute from current rent roll
      const units = await this.getUnits();
      const fpGroups: Record<string, number[]> = {};
      
      for (const unit of units) {
        if (!fpGroups[unit.floorplanCode]) {
          fpGroups[unit.floorplanCode] = [];
        }
        if (unit.currentRent > 0) {
          fpGroups[unit.floorplanCode].push(unit.currentRent);
        }
      }
      
      // Use median rent as starting rent
      for (const [code, rents] of Object.entries(fpGroups)) {
        if (rents.length === 0) continue;
        
        rents.sort((a, b) => a - b);
        const mid = Math.floor(rents.length / 2);
        startingRents[code] = rents.length % 2 === 0
          ? (rents[mid - 1] + rents[mid]) / 2
          : rents[mid];
      }
    } catch (e) {
      console.warn('[RealDataProvider] Error loading starting rents:', e);
    }
    
    return startingRents;
  }
  
  /**
   * Get floorplan setup data
   */
  async getFloorplanSetup(): Promise<Array<{
    code: string;
    name: string;
    bedrooms: number;
    units: number;
  }>> {
    if (!this.ready) {
      return [];
    }
    
    const propertySetup = (window as any).propertySetup || {};
    const floorplans = propertySetup.floorplans || [];
    
    return floorplans.map((fp: any) => ({
      code: String(fp.code || ''),
      name: String(fp.name || ''),
      bedrooms: Number(fp.bedrooms || 0),
      units: Number(fp.units || 0),
    }));
  }
  
  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * Get provider type
   */
  getProviderType(): 'real' | 'simulator' | 'test' {
    return 'real';
  }
  
  /**
   * Refresh data availability status
   * 
   * Call this after CSV upload or property setup changes.
   */
  refresh(): void {
    this.ready = this.checkDataAvailability();
  }
}

/**
 * Global singleton instance
 * 
 * This is initialized once and reused throughout the application.
 */
let globalProvider: RealDataProvider | null = null;

/**
 * Get the global real data provider instance
 * 
 * @returns Real data provider singleton
 */
export function getRealDataProvider(): RealDataProvider {
  if (!globalProvider) {
    globalProvider = new RealDataProvider();
  }
  return globalProvider;
}

/**
 * Refresh the global provider (call after CSV upload)
 */
export function refreshRealDataProvider(): void {
  if (globalProvider) {
    globalProvider.refresh();
  }
}

