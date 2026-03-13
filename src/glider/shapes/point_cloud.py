from dataclasses import dataclass
from typing import Any

import numpy as np

from ..constants import DEFAULT_MAX_WING_DIMENSION_M, MUTATION_CHANCE, MUTATION_RATIO
from .base import ShapeConfig


@dataclass
class PointCloudConfig(ShapeConfig):
    """Shape config wrapping a random 3D point cloud with convex geometry."""

    vertices: list[list[float]]
    max_dim_m: float = DEFAULT_MAX_WING_DIMENSION_M

    def generate_mesh(self) -> tuple[list[list[float]], list[list[int]]]:
        """Return vertices and empty faces (MuJoCo computes the convex hull)."""
        return self.vertices, []

    def mutate(self) -> "PointCloudConfig":
        """Return a new PointCloudConfig with perturbed vertex coordinates."""
        retries = 10
        for _ in range(retries):
            new_vertices: list[list[float]] = []
            for vertex in self.vertices:
                new_vertex: list[float] = []
                for dim in vertex:
                    if np.random.random() < MUTATION_CHANCE:
                        dim += (
                            self.max_dim_m
                            * MUTATION_RATIO
                            * np.random.choice((-1, 1))
                        )
                    new_vertex.append(dim)
                new_vertices.append(new_vertex)
            if not self._exceeds_max_dim(new_vertices):
                return PointCloudConfig(vertices=new_vertices, max_dim_m=self.max_dim_m)
        return PointCloudConfig(vertices=list(self.vertices), max_dim_m=self.max_dim_m)

    @classmethod
    def random(cls, **kwargs: Any) -> "PointCloudConfig":
        """Create a random point cloud configuration."""
        num_vertices: int = int(kwargs.get("num_vertices", 30))
        max_dim_m: float = float(kwargs.get("max_dim_m", DEFAULT_MAX_WING_DIMENSION_M))
        vertices = [
            [float(np.random.random() * max_dim_m) for _ in range(3)]
            for _ in range(num_vertices)
        ]
        return cls(vertices=vertices, max_dim_m=max_dim_m)

    def params_dict(self) -> dict:
        return {"vertices": self.vertices, "max_dim_m": self.max_dim_m}

    def _exceeds_max_dim(self, vertices: list[list[float]]) -> bool:
        for vertex in vertices:
            for second_vertex in vertices:
                norm = np.linalg.norm(np.array(vertex) - np.array(second_vertex))
                if norm > self.max_dim_m:
                    return True
        return False
