from functools import reduce

AIR_DENSITY = 1.2
AIR_VISCOSITY = 0.00002
WIND = "0 0 0"

# Pilot defaults
PILOT_RGBA = "0.2 0.2 0.8 0.5"
PILOT_DIMENSIONS_M = [1.8, 0.3, 0.6]
PILOT_DENSITY_KG = 68 / reduce(lambda x, y: x * y, PILOT_DIMENSIONS_M)

# Delta wing defaults
WING_RGBA = "0.8 0.2 0.2 0.5"

# Glider defaults
GLIDER_GEOM_NAME = "stl-wing"
DEFAULT_STL_FILEPATH = "assets/delta_plane.stl"

# Simulation
FRAMERATE = 60
TIME_STEP = 0.02

# Reproduction constants
MUTATION_RATIO = 0.05
MUTATION_CHANCE = 0.15

# Reproduction weighting
MUTATION_WEIGHT = 3
CLONE_WEIGHT = 2
CROSSOVER_WEIGHT = 1

# Rendering constants
FRAME_WIDTH = 320
FRAME_HEIGHT = 240
