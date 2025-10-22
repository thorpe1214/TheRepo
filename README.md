# 🚀 Revenue Management System

A comprehensive revenue management application for apartment complexes, featuring dynamic pricing, floorplan management, and lease optimization.

## 📋 Overview

This system provides apartment managers with sophisticated tools to:
- **Optimize rent pricing** based on market conditions and occupancy
- **Manage floorplan configurations** with tier-based pricing strategies
- **Process rent roll data** with automated mapping and analysis
- **Generate pricing recommendations** for new leases and renewals
- **Track occupancy trends** and market performance

## 🏗️ Architecture

The application follows a modular architecture with clear separation of concerns:

- **Floorplan Pricing Module** (`src/js/pricing-fp.js`): Computes baseline pricing per floorplan type
- **Unit Pricing Module** (`src/js/pricing-unit.js`): Renders individual unit lists with filtering and pagination
- **Helper Functions** (`src/js/pricing-helpers.js`): Common utilities and calculations
- **Development Guards** (`src/js/dev-guards.js`): Boundary enforcement for module separation
- **Application Bootstrap** (`src/js/app-boot.js`): Initialization and event handling

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architectural documentation.

## 🚀 Quick Start

1. **Open the application**: Open `Step 89E — architecture boundaries + docs (no behavior change).html` in your browser
2. **Upload rent roll**: Click "Choose File" and select a CSV file with unit data
3. **Confirm mapping**: Review the auto-detected column mappings and click "Confirm Mapping"
4. **Run pricing**: Click "Run New" to generate pricing recommendations
5. **View results**: Navigate between "Floorplan Pricing" and "Unit Pricing" tabs

## 📊 Features

### Core Functionality
- ✅ **Rent Roll Processing**: Automated CSV upload and column mapping
- ✅ **Floorplan Management**: Configurable floorplan settings with tier-based pricing
- ✅ **Dynamic Pricing**: Market-responsive pricing with term-based adjustments
- ✅ **Unit-Level Analysis**: Individual unit pricing with amenity adjustments
- ✅ **Renewal Management**: Automated renewal pricing with guardrails
- ✅ **Local Storage**: Persistent settings and mapping configurations

### Advanced Features
- ✅ **Seasonality Adjustments**: Monthly market variation handling
- ✅ **Buffer Guardrails**: Prevents aggressive price decreases
- ✅ **Term Premiums**: Short-term lease pricing adjustments
- ✅ **Occupancy Tracking**: Real-time occupancy and trend analysis
- ✅ **Export Capabilities**: Data export for external analysis

## 📁 Project Structure

```
Thorpe Management/
├── docs/
│   └── ARCHITECTURE.md          # Detailed architectural documentation
├── src/js/
│   ├── pricing-helpers.js       # Common utilities and calculations
│   ├── pricing-unit.js          # Unit pricing and filtering logic
│   ├── pricing-fp.js            # Floorplan pricing calculations
│   ├── dev-guards.js            # Development boundary enforcement
│   └── app-boot.js              # Application initialization
├── assets/
│   └── styles.css               # Application styling
├── Step 89E — architecture boundaries + docs (no behavior change).html  # Main application
└── sample_rent_roll_300_units_statuses.csv  # Sample data for testing
```

## 🔧 Development

### Module Separation
The application enforces strict module boundaries:
- **Floorplan Pricing**: Computes baseline pricing per floorplan
- **Unit Pricing**: Renders unit lists using floorplan baselines
- **No Cross-Module Dependencies**: Each module operates independently

### Development Guards
Built-in guards warn about potential boundary violations during development.

### Testing
- Use `sample_rent_roll_300_units_statuses.csv` for testing
- All major features are tested and verified
- Local storage functionality confirmed

## 📈 Data Flow

1. **Rent Roll Upload** → Column mapping and validation
2. **Floorplan Analysis** → Baseline pricing calculations
3. **Unit Processing** → Individual unit pricing with amenities
4. **Term Adjustments** → Short-term premiums and seasonality
5. **Renewal Calculations** → Current rent-based renewal pricing

## 🛠️ Configuration

### Settings Available
- **Global Settings**: Comfort targets, lease terms, pricing style
- **Floorplan Settings**: Tier configurations, starting rents, price caps
- **Seasonality**: Monthly market variation settings
- **Renewals**: Renewal pricing rules and guardrails
- **Safety**: Change frequency limits and governance

### Local Storage
All settings and mappings are automatically saved locally and persist between sessions.

## 📝 Sample Data

The repository includes sample CSV files for testing:
- `sample_rent_roll_300_units_statuses.csv`: 300-unit complex with various statuses
- `rent_roll_200_units_mixed.csv`: Smaller dataset for quick testing

## 🎯 Current Status

**Version**: Step 89E - Architecture Boundaries + Documentation
**Status**: ✅ Production Ready
**Features**: All core functionality implemented and tested
**Architecture**: Clean modular separation with documentation

## 📚 Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Project Context](INSTRUCTIONS/RevenueMgmt_Project_Context.txt)
- [Checkpoint Notes](INSTRUCTIONS/RevenueMgmt_Checkpoint_Step87.txt)

## 🔄 Version History

The project includes a complete development history with step-by-step implementations:
- **Steps 1-89**: Complete development progression
- **Step 89E**: Current production version with clean architecture
- **All previous steps**: Preserved for reference and rollback capability

---

**Ready for Production Use** 🚀
