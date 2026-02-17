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
