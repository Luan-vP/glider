from abc import ABC, abstractmethod
from typing import Any


class ShapeConfig(ABC):
    """Abstract base class for glider shape configurations."""

    @abstractmethod
    def generate_mesh(self) -> tuple[list[list[float]], list[list[int]]]:
        """Return (vertices, faces) for the shape, compatible with Vehicle.xml()."""
        ...

    @abstractmethod
    def mutate(self) -> "ShapeConfig":
        """Return a new ShapeConfig with perturbed parameters."""
        ...

    @classmethod
    @abstractmethod
    def random(cls, **kwargs: Any) -> "ShapeConfig":
        """Create a random instance for use in an initial population."""
        ...

    @abstractmethod
    def params_dict(self) -> dict:
        """Serialize shape-specific parameters to a dictionary."""
        ...

    @staticmethod
    def _extrude_profile(
        profile_2d: list[list[float]], span: float
    ) -> tuple[list[list[float]], list[list[int]]]:
        """Extrude a 2D airfoil profile along the span (z) axis into a 3D mesh.

        Shared utility for NACA and parametric shape subclasses.

        Args:
            profile_2d: Closed list of [x, y] 2D profile points.
            span: Length to extrude along the z-axis.

        Returns:
            Tuple of (vertices, faces) compatible with Vehicle.xml().
        """
        n = len(profile_2d)
        vertices: list[list[float]] = []

        for x, y in profile_2d:
            vertices.append([float(x), float(y), 0.0])

        for x, y in profile_2d:
            vertices.append([float(x), float(y), float(span)])

        faces: list[list[int]] = []

        for i in range(n):
            j = (i + 1) % n
            faces.append([i, j, n + j])
            faces.append([i, n + j, n + i])

        for i in range(1, n - 1):
            faces.append([0, i + 1, i])

        for i in range(1, n - 1):
            faces.append([n, n + i, n + i + 1])

        return vertices, faces
