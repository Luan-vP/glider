from functools import reduce

AIR_DENSITY = 1.2
AIR_VISCOSITY = 0.00002
WIND = "0 0 0"
FLUID_SHAPE = "ellipsoid"

# Pilot defaults
PILOT_RGBA = "0.2 0.2 0.8 0.5"
PILOT_DIMENSIONS_M = [1.8, 0.3, 0.6]
PILOT_MASS_KG = 68
PILOT_DENSITY_KG = 68 / reduce(lambda x, y: x * y, PILOT_DIMENSIONS_M)

# Wing defaults
WING_DENSITY = 0.4
WING_RGBA = "0.8 0.2 0.2 0.5"
DEFAULT_MAX_WING_DIMENSION_M = 4.5

# Simulation
FRAMERATE = 60
TIME_STEP = 0.02

# Reproduction constants
MUTATION_RATIO = 0.05
MUTATION_CHANCE = 1.0

# Reproduction weighting
MUTATION_WEIGHT = 3
CLONE_WEIGHT = 2
CROSSOVER_WEIGHT = 1

# Shape penalty
MIN_THICKNESS_RATIO = 0.08
THINNESS_PENALTY_WEIGHT = 5.0

# Rendering constants
FRAME_WIDTH = 320
FRAME_HEIGHT = 240


def create_pilot_geom(pos: list[float] = [0, 0, 0]):
    size = " ".join(map(str, PILOT_DIMENSIONS_M))
    pos_str = " ".join(map(str, pos))
    return (
        f'<geom name="pilot" type="box"'
        f' size="{size}" pos="{pos_str}" />'
    )
