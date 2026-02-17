# CLAUDE.md

## Project Overview

Glider is an evolutionary glider simulator that uses genetic algorithms to optimize glider designs. Physics simulation runs in MuJoCo.

## Quick Start

```bash
pip install -e ".[dev]"
```

## Build & Run

```bash
pip install -e .
python -m glider
```

## Testing

```bash
pytest
```

## Project Structure

- `src/glider/` - Main package
  - `vehicle.py` - Glider vehicle definition and parametric geometry
  - `optimization.py` - Genetic algorithm and fitness evaluation
  - `pipeline.py` - End-to-end simulation pipeline
  - `surface.py` - Aerodynamic surface modeling
  - `visualization.py` - Rendering and media output
  - `database.py` - Experiment storage
  - `constants.py` - Simulation constants
  - `serving/` - API server for results
- `tests/` - Test suite

## Naming Conventions

- snake_case for functions, variables, and modules
- PascalCase for classes
- UPPER_SNAKE_CASE for constants
- Test files: `test_<module>.py`
- Test functions: `test_<behavior>()`

## Frontend

The frontend is a React + TypeScript single-page application built with Vite.

### Development

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

### Building

```bash
cd frontend
npm run build
```

### Project Structure

- `frontend/src/` - React application source
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point
  - `index.css` - Global styles (Tailwind directives)
- `frontend/vite.config.ts` - Vite configuration
- `frontend/tailwind.config.js` - Tailwind CSS configuration
