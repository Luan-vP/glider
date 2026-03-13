from collections.abc import Callable
from typing import TypedDict

import mujoco
import numpy as np

from .constants import (
    AIR_DENSITY,
    AIR_VISCOSITY,
    DEFAULT_MAX_WING_DIMENSION_M,
    MIN_THICKNESS_RATIO,
    THINNESS_PENALTY_WEIGHT,
)
from .shapes import NacaConfig, ParametricConfig, ShapeConfig
from .vehicle import Vehicle

NUM_GENES = 10
DROP_TEST_HEIGHT = 50.0


class TrajectoryFrameDict(TypedDict):
    time: float
    position: list[float]
    orientation: list[float]


def create_point(max_dim_m: float) -> list[float]:
    return list(np.random.random() * max_dim_m for _ in range(3))


def drop_test_glider(
    vehicle: Vehicle,
    height: float = 80,
    wind: str = "0 0 0",
) -> str:
    glider_xml, glider_asset = vehicle.xml()

    world_xml = f"""
<mujoco>
    <option density="{AIR_DENSITY}" viscosity="{AIR_VISCOSITY}" wind="{wind}"/>
    <worldbody>
        <light name="top" pos="0 0 5"/>
        <camera name="fixed" pos="0 -100 100" euler="40 0 0"/>
        <!-- Body -->
        {glider_xml}
        <!-- Landing Platform -->
        <body name="platform" pos="0 0 0">
            <geom name="platform-geom" type="box"
                size="1500 1500 1" rgba="1 1 1 1"
                pos="0 0 {-height}"/>
        </body>
    </worldbody>

    {glider_asset}
</mujoco>

"""
    return world_xml


def thinness_ratio(vertices: list[list[float]]) -> float:
    points = np.asarray(vertices, dtype=float)
    if points.shape[0] < 3:
        return 1.0

    centered = points - points.mean(axis=0, keepdims=True)
    cov = (centered.T @ centered) / points.shape[0]
    eigvals = np.linalg.eigvalsh(cov)
    eigvals = np.clip(eigvals, 0.0, None)
    axes = np.sqrt(eigvals + 1e-12)

    max_axis = axes[-1]
    min_axis = axes[0]
    if max_axis <= 1e-12:
        return 1.0

    return float(min_axis / max_axis)


def _compute_fitness(distance: float, vertices: list[list[float]]) -> float:
    """Compute fitness from glide distance and vertex geometry."""
    ratio = thinness_ratio(vertices)
    thinness_penalty = 0.0
    if ratio < MIN_THICKNESS_RATIO:
        thinness_penalty = THINNESS_PENALTY_WEIGHT * (
            (MIN_THICKNESS_RATIO - ratio) / MIN_THICKNESS_RATIO
        )
    return float(distance - thinness_penalty)


def fitness_func(test_vehicle: Vehicle) -> float:
    test_xml = drop_test_glider(test_vehicle, height=DROP_TEST_HEIGHT)

    model = mujoco.MjModel.from_xml_string(test_xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)  # Reset state and time.

    while len(data.contact) < 1:  # Render until landing
        mujoco.mj_step(model, data)

    distance = abs(data.geom("vehicle-wing").xpos[0])
    return _compute_fitness(distance, test_vehicle.vertices)


def simulate_trajectory(
    test_vehicle: Vehicle,
    sample_rate: int = 60,
) -> tuple[list[TrajectoryFrameDict], float]:
    """Run a drop test and return sampled trajectory data plus fitness."""
    test_xml = drop_test_glider(test_vehicle, height=DROP_TEST_HEIGHT)

    model = mujoco.MjModel.from_xml_string(test_xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)

    frames: list[TrajectoryFrameDict] = []

    while len(data.contact) < 1:
        mujoco.mj_step(model, data)
        while len(frames) < data.time * sample_rate:
            frames.append({
                "time": float(data.time),
                "position": data.body("body").xpos.tolist(),
                "orientation": data.body("body").xquat.tolist(),
            })

    distance = abs(data.geom("vehicle-wing").xpos[0])
    fitness = _compute_fitness(distance, test_vehicle.vertices)
    return frames, fitness


def _create_random_vehicle(
    shape_type: str,
    max_dim_m: float,
    pilot: bool,
    mass_kg: float | None,
) -> Vehicle:
    """Create a random Vehicle using the appropriate shape config."""
    cfg: ShapeConfig
    if shape_type == "naca":
        cfg = NacaConfig.random(max_dim_m=max_dim_m)
        return Vehicle(
            max_dim_m=max_dim_m,
            pilot=pilot,
            mass_kg=mass_kg,
            shape_config=cfg,
        )
    elif shape_type == "parametric":
        cfg = ParametricConfig.random()
        return Vehicle(
            max_dim_m=max_dim_m,
            pilot=pilot,
            mass_kg=mass_kg,
            shape_config=cfg,
        )
    else:
        return Vehicle(
            num_vertices=NUM_GENES,
            max_dim_m=max_dim_m,
            pilot=pilot,
            mass_kg=mass_kg,
        )


def iterate_population(
    input_population: list[Vehicle],
    survival_weight: float = 0.3,
    cloning_weight: float = 0.4,
    max_dim_m: float = DEFAULT_MAX_WING_DIMENSION_M,
    pilot: bool = False,
    mass_kg: float | None = None,
    shape_type: str = "point_cloud",
) -> tuple[list[tuple[Vehicle, float]], list[Vehicle]]:
    """
    Take an input population, and return a new population based on the
    survival and cloning weights. Random gliders are generated to fill
    the remaining population.

    Args:
    survival_weight:    The proportion of the population that survives
    cloning_weight:     The proportion of the population that is cloned
    max_dim_m:          The maximum dimension of a wing
    pilot:              Whether or not to add a pilot
    mass_kg:            The mass of the wing
    shape_type:         The shape type to use for random generation
                        ('point_cloud', 'naca', 'parametric')
    """

    population_size = len(input_population)
    assert cloning_weight + survival_weight <= 1.0

    ranking = evaluate_population(input_population)

    # Retain survivors
    survivor_results = ranking[: int(population_size * survival_weight)]
    survivors: list[Vehicle] = [result[0] for result in survivor_results]

    clones: list[Vehicle] = []
    for i in range(int(population_size * cloning_weight)):
        target = survivors[i % len(survivors)]

        if target.shape_config is not None:
            new_shape_config = target.shape_config.mutate()
            clones.append(
                Vehicle(
                    max_dim_m=target.max_dim_m,
                    pilot=pilot,
                    mass_kg=mass_kg,
                    shape_config=new_shape_config,
                )
            )
        else:
            clones.append(
                Vehicle(
                    vertices=target.mutate(),
                    max_dim_m=target.max_dim_m,
                    pilot=pilot,
                    mass_kg=mass_kg,
                )
            )

    random_population = [
        _create_random_vehicle(shape_type, max_dim_m, pilot, mass_kg)
        for _ in range(population_size - len(clones) - len(survivors))
    ]

    new_population = survivors + clones + random_population

    return ranking, new_population


def evaluate_population(
        input_population: list[Vehicle],
        fitness_func: Callable[[Vehicle], float] = fitness_func,
        ) -> list[tuple[Vehicle, float]]:

    results: list[float] = []
    for v in input_population:
        results.append(fitness_func(v))

    assert len(input_population) == len(results)

    # Ranking is a combination of glider and fitness
    ranking = list(zip(input_population, results))
    ranking.sort(key=lambda x: x[1], reverse=True)

    return ranking
