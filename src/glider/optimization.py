import mujoco
import numpy as np

from .constants import (DEFAULT_MAX_WING_DIMENSION_M, AIR_DENSITY,
                        AIR_VISCOSITY, MIN_THICKNESS_RATIO,
                        THINNESS_PENALTY_WEIGHT)
from .vehicle import Vehicle

NUM_GENES = 10
DROP_TEST_HEIGHT = 50.0


def create_point(max_dim_m: float) -> list[float]:
    return list(np.random.random() * max_dim_m for _ in range(3))


def drop_test_glider(
    vehicle: Vehicle,
    height=80,
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
            <geom name="platform-geom" type="box" size="1500 1500 1" rgba="1 1 1 1" pos="0 0 {-height}"/>
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


def fitness_func(test_vehicle: Vehicle) -> float:
    test_xml = drop_test_glider(test_vehicle, height=DROP_TEST_HEIGHT)

    model = mujoco.MjModel.from_xml_string(test_xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)  # Reset state and time.

    while len(data.contact) < 1:  # Render until landing
        mujoco.mj_step(model, data)

    distance = abs(data.geom("vehicle-wing").xpos[0])
    ratio = thinness_ratio(test_vehicle.vertices)
    thinness_penalty = 0.0
    if ratio < MIN_THICKNESS_RATIO:
        thinness_penalty = THINNESS_PENALTY_WEIGHT * (
            (MIN_THICKNESS_RATIO - ratio) / MIN_THICKNESS_RATIO
        )

    return distance - thinness_penalty


def iterate_population(
    input_population: list[Vehicle],
    survival_weight=0.3,
    cloning_weight=0.4,
    max_dim_m=DEFAULT_MAX_WING_DIMENSION_M,
    pilot: bool = False,
    mass_kg: float | None = None,
):
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
    """

    population_size = len(input_population)
    assert cloning_weight + survival_weight <= 1.0

    ranking = evaluate_population(input_population)

    # Retain survivors
    survivor_results = ranking[: int(population_size * survival_weight)]
    survivors: list[Vehicle] = [result[0] for result in survivor_results]

    clones: list[Vehicle] = []
    for i in range(int(population_size * cloning_weight)):
        target_index = i % len(survivors)

        clones.append(
            Vehicle(
                vertices=(survivors[target_index].mutate()),
                max_dim_m=survivors[target_index].max_dim_m,
                pilot=pilot,
                mass_kg=mass_kg,
            )
        )

    random_population = [
        Vehicle(
            num_vertices=NUM_GENES,
            max_dim_m=max_dim_m,
            pilot=pilot,
            mass_kg=mass_kg,
        )
        for _ in range(population_size - len(clones) - len(survivors))
    ]

    new_population = survivors + clones + random_population

    return ranking, new_population


def evaluate_population(
        input_population: list[Vehicle],
        fitness_func=fitness_func,
        ) -> list[tuple[Vehicle, float]]:

    results: list[float] = []
    for v in input_population:
        results.append(fitness_func(v))

    assert len(input_population) == len(results)

    # Ranking is a combination of glider and fitness
    ranking = list(zip(input_population, results))
    ranking.sort(key=lambda x: x[1], reverse=True)

    return ranking
