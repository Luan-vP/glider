import mujoco
import numpy as np

from .constants import DEFAULT_MAX_WING_DIMENSION_M
from .simulation import drop_test_glider
from .vehicle import Vehicle

NUM_GENES = 12


def create_point(max_dim_m: float) -> list[float]:
    return list(np.random.random() * max_dim_m for _ in range(3))


def fitness_func(test_vehicle: Vehicle) -> float:
    glider_xml, glider_asset = test_vehicle.create_glider_from_vertices()
    world_xml = drop_test_glider(
        glider_xml=glider_xml, glider_asset=glider_asset, height=50.0
    )

    model = mujoco.MjModel.from_xml_string(world_xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)  # Reset state and time.

    while len(data.contact) < 1:  # Render until landing
        mujoco.mj_step(model, data)

    return abs(data.geom("vehicle-wing").xpos[0])


def iterate_population(
    population: list[Vehicle],
    survival_weight=0.3,
    cloning_weight=0.4,
    max_dim_m=DEFAULT_MAX_WING_DIMENSION_M,
    pilot: bool = True,
):
    # on_start()

    # on_fitness()
    # on_parents()
    # on_crossover()
    # on_mutation()
    # on_generation()

    # on_stop()

    population_size = len(population)

    assert cloning_weight + survival_weight <= 1.0

    results: list[float] = []

    for v in population:
        results.append(fitness_func(v))

    assert len(population) == len(results)

    # Ranking is a combination of glider and fitness
    ranking = list(zip(population, results))
    ranking.sort(key=lambda x: x[1], reverse=True)

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
            )
        )

    random_population = [
        Vehicle(
            num_vertices=NUM_GENES,
            max_dim_m=max_dim_m,
            pilot=pilot,
        )
        for _ in range(population_size - len(clones) - len(survivors))
    ]

    new_population = survivors + clones + random_population

    return ranking, new_population
