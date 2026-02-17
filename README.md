# glider

The goal is to evolve a glider design by genetic algorithms.

## Genetic selection
Glider shape is defined parametrically in XML, inspired by a hangglider delta design.

The fitness function is the glide ratio (forwards distance / vertical distance) tested over a 100m drop.

Glider shape is defined in XML, support for STLs is also possible.

## Simulation

Physics simulation in Mujoco for flight in air.

## Setup

```bash
pip install -e ".[dev]"
```

### Run tests

```bash
pytest
```

### Build

```bash
pip install -e .
```

## Dependencies
ffmpeg