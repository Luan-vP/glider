# glider

The goal is to evolve a glider design by genetic algorithms.

## Genetic selection
Glider shape is defined parametrically in XML, inspired by a hangglider delta design.

The fitness function is the glide ratio (forwards distance / vertical distance) tested over a 100m drop.

Glider shape is defined in XML, support for STLs is also possible.

## Simulation

Physics simulation in Mujoco for flight in air.

## Setup

### Backend

```bash
pip install -e ".[dev]"
```

#### Run tests

```bash
pytest
```

#### Build

```bash
pip install -e .
```

### Frontend

The frontend is a React + TypeScript application built with Vite.

```bash
cd frontend
npm install
npm run dev
```

The development server runs on `http://localhost:5173` and connects to the backend API at `http://localhost:8000`.

#### Building the frontend

```bash
cd frontend
npm run build
```

## Dependencies
- ffmpeg
- Node.js (for frontend development)