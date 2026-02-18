from glider.optimization import (
    create_point,
    fitness_func,
    iterate_population,
)
from glider.vehicle import Vehicle


def test_create_point():
    max_dim = 5.0
    point = create_point(max_dim_m=max_dim)
    for dim in point:
        assert dim <= max_dim

    assert point[0] != point[1]
    assert point[1] != point[2]


def test_iterate_population():
    ranking, population = iterate_population(
        [Vehicle(num_vertices=10, max_dim_m=1.5) for _ in range(10)],
        survival_weight=0.5,
    )

    fitnesses = sorted(
        [fitness_func(vehicle) for vehicle in population],
        reverse=True,
    )

    assert fitnesses[0] > fitnesses[1]

    for _ in range(10):
        ranking, population = iterate_population(
            population,
            survival_weight=0.3,
            cloning_weight=0.3,
        )

        fitnesses_2 = sorted(
            [fitness_func(vehicle) for vehicle in population],
            reverse=True,
        )

        assert fitnesses_2[0] >= fitnesses[0]
