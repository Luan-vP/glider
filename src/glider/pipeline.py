from __future__ import annotations

from typing import Callable, Iterable

from .optimization import fitness_func
from .surface import spherical_delaunay_surface
from .vehicle import Vehicle

SurfaceBuilder = Callable[
    [Iterable[Iterable[float]]], tuple[list[list[float]], list[list[int]]]
]
FitnessFunc = Callable[[Vehicle], float]


def process_genome(
    vertices: Iterable[Iterable[float]],
    surface_builder: SurfaceBuilder = spherical_delaunay_surface,
    fitness: FitnessFunc = fitness_func,
    **vehicle_kwargs,
) -> tuple[Vehicle, float]:
    """
    Build a surface from coordinates, simulate, and return fitness score.

    Dependency injection:
    - surface_builder controls how faces are generated from points.
    - fitness controls scoring (including penalties).
    """
    surface_vertices, faces = surface_builder(vertices)
    vehicle = Vehicle(vertices=surface_vertices, faces=faces, **vehicle_kwargs)
    score = fitness(vehicle)
    return vehicle, score
