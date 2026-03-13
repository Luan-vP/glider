from dataclasses import dataclass
from typing import Any

import numpy as np

from .base import ShapeConfig

# Valid parameter ranges
MAX_CAMBER_MIN = 0.0
MAX_CAMBER_MAX = 0.1
CAMBER_POSITION_MIN = 0.1
CAMBER_POSITION_MAX = 0.9
MAX_THICKNESS_MIN = 0.05
MAX_THICKNESS_MAX = 0.30
SPAN_MIN = 0.5
SPAN_MAX = 6.0
CHORD_MIN = 0.1
CHORD_MAX = 3.0

# Gaussian mutation standard deviation (fraction of range)
MUTATION_STD_RATIO = 0.05


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


@dataclass
class ParametricConfig(ShapeConfig):
    """Parametric airfoil shape using continuous float parameters.

    Uses NACA-style airfoil equations with explicit camber and thickness
    parameters rather than digit encoding, giving the GA finer-grained
    control and smoother mutation behaviour.

    Attributes:
        max_camber: Maximum camber as a fraction of chord (0.0–0.1).
        camber_position: Chordwise position of maximum camber (0.1–0.9).
        max_thickness: Maximum thickness as a fraction of chord (0.05–0.30).
        span: Wing span in metres.
        chord: Chord length in metres.
        num_profile_points: Number of points per surface (default 50).
    """

    max_camber: float
    camber_position: float
    max_thickness: float
    span: float
    chord: float
    num_profile_points: int = 50

    # ------------------------------------------------------------------
    # Profile generation
    # ------------------------------------------------------------------

    def _generate_profile_2d(self) -> list[list[float]]:
        """Generate a closed 2-D airfoil profile in [x, y] coordinates.

        The profile runs from the trailing edge, along the upper surface to
        the leading edge, then along the lower surface back to the trailing
        edge.  All coordinates are scaled by ``self.chord``.
        """
        m = self.max_camber
        p = self.camber_position
        t = self.max_thickness
        c = self.chord
        n = self.num_profile_points

        # x stations from 0 (leading edge) to 1 (trailing edge)
        xs = np.linspace(0.0, 1.0, n)

        # Camber line y-coordinates and slope
        yc = np.where(
            xs < p,
            (m / (p**2)) * (2 * p * xs - xs**2),
            (m / ((1 - p) ** 2)) * ((1 - 2 * p) + 2 * p * xs - xs**2),
        )

        dyc_dx = np.where(
            xs < p,
            (2 * m / (p**2)) * (p - xs),
            (2 * m / ((1 - p) ** 2)) * (p - xs),
        )

        # Thickness distribution (NACA symmetric formula)
        yt = (t / 0.2) * (
            0.2969 * np.sqrt(xs)
            - 0.1260 * xs
            - 0.3516 * xs**2
            + 0.2843 * xs**3
            - 0.1015 * xs**4
        )

        theta = np.arctan(dyc_dx)

        # Upper and lower surface in normalised coordinates
        xu = xs - yt * np.sin(theta)
        yu = yc + yt * np.cos(theta)
        xl = xs + yt * np.sin(theta)
        yl = yc - yt * np.cos(theta)

        # Build closed profile: upper surface LE→TE, lower surface TE→LE
        upper = [[float(xu[i] * c), float(yu[i] * c)] for i in range(n)]
        lower = [[float(xl[i] * c), float(yl[i] * c)] for i in range(n - 1, -1, -1)]

        return upper + lower

    # ------------------------------------------------------------------
    # ShapeConfig interface
    # ------------------------------------------------------------------

    def generate_mesh(self) -> tuple[list[list[float]], list[list[int]]]:
        """Return (vertices, faces) for the airfoil extruded along the span."""
        profile_2d = self._generate_profile_2d()
        return self._extrude_profile(profile_2d, self.span)

    def mutate(self) -> "ParametricConfig":
        """Return a new ParametricConfig with Gaussian-perturbed parameters."""

        def perturb(value: float, lo: float, hi: float) -> float:
            std = MUTATION_STD_RATIO * (hi - lo)
            return _clamp(value + float(np.random.normal(0.0, std)), lo, hi)

        return ParametricConfig(
            max_camber=perturb(self.max_camber, MAX_CAMBER_MIN, MAX_CAMBER_MAX),
            camber_position=perturb(
                self.camber_position, CAMBER_POSITION_MIN, CAMBER_POSITION_MAX
            ),
            max_thickness=perturb(
                self.max_thickness, MAX_THICKNESS_MIN, MAX_THICKNESS_MAX
            ),
            span=perturb(self.span, SPAN_MIN, SPAN_MAX),
            chord=perturb(self.chord, CHORD_MIN, CHORD_MAX),
            num_profile_points=self.num_profile_points,
        )

    @classmethod
    def random(cls, **kwargs: Any) -> "ParametricConfig":
        """Create a random ParametricConfig within valid parameter bounds."""
        num_profile_points: int = int(kwargs.get("num_profile_points", 50))
        return cls(
            max_camber=float(
                np.random.uniform(MAX_CAMBER_MIN, MAX_CAMBER_MAX)
            ),
            camber_position=float(
                np.random.uniform(CAMBER_POSITION_MIN, CAMBER_POSITION_MAX)
            ),
            max_thickness=float(
                np.random.uniform(MAX_THICKNESS_MIN, MAX_THICKNESS_MAX)
            ),
            span=float(np.random.uniform(SPAN_MIN, SPAN_MAX)),
            chord=float(np.random.uniform(CHORD_MIN, CHORD_MAX)),
            num_profile_points=num_profile_points,
        )

    def params_dict(self) -> dict:
        return {
            "max_camber": self.max_camber,
            "camber_position": self.camber_position,
            "max_thickness": self.max_thickness,
            "span": self.span,
            "chord": self.chord,
            "num_profile_points": self.num_profile_points,
        }
