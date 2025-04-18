# Milles Bornes Game Client

This is the client component for the Milles Bornes card game. It's an Electron application that can be packaged as a Windows executable.

## Requirements

- Node.js 14+
- npm

## Installation

1. Clone the repository
2. Navigate to the client directory
3. Install dependencies:

```bash
npm install
```

## Running the Client

To start the client in development mode:

```bash
npm run dev
```

For production mode:

```bash
npm start
```

## Building the Executable

To build the Windows executable:

```bash
npm run build
```

This will create a portable executable in the `dist` directory.

## Connecting to the Server

When starting the game, you'll need to enter:

1. Your player name
2. Game ID (leave blank to create a new game)
3. Server URL (e.g., `http://raspberry-pi-ip:3000`)

## Game Rules

Milles Bornes is a French card racing game where players try to be the first to travel 1000 miles (milles bornes). Players use distance cards to advance, but can be stopped by hazards like flat tires or accidents. Players need safety cards to protect against hazards and remedy cards to fix problems.

### Card Types

- **Distance Cards**: Used to advance your car (25, 50, 75, 100, and 200 miles)
- **Hazard Cards**: Used to stop your opponent (Accident, Out of Gas, Flat Tire, Speed Limit, Stop)
- **Remedy Cards**: Used to fix hazards (Repairs, Gasoline, Spare Tire, End of Speed Limit, Go)
- **Safety Cards**: Protect against specific hazards (Driving Ace, Fuel Tank, Puncture-Proof, Right of Way)
- **Attack Cards**: Special cards to hinder your opponent (Red Light)
