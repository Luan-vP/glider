from dataclasses import dataclass
from typing import Any

import numpy as np

from ..constants import DEFAULT_MAX_WING_DIMENSION_M, MUTATION_RATIO
from .base import ShapeConfig

# Tabulated (r, k1) values for NACA 5-digit non-reflexed
# camber line, keyed by P digit (1-5).
_NACA5_TABLE: dict[int, tuple[float, float]] = {
    1: (0.0580, 361.400),
    2: (0.1260, 51.640),
    3: (0.2025, 15.957),
    4: (0.2900, 6.643),
    5: (0.3910, 3.230),
}


@dataclass
class NacaConfig(ShapeConfig):
    """NACA 4/5-digit airfoil profiles extruded into 3D."""

    digits: str
    span: float
    chord: float
    num_profile_points: int = 50
    max_dim_m: float = DEFAULT_MAX_WING_DIMENSION_M

    def generate_mesh(self) -> tuple[list[list[float]], list[list[int]]]:
        """Generate a 2D NACA airfoil profile and extrude it into a 3D mesh."""
        profile_2d = self._generate_profile()
        return self._extrude_profile(profile_2d, self.span)

    def params_dict(self) -> dict:
        return {
            "digits": self.digits,
            "span": self.span,
            "chord": self.chord,
            "num_profile_points": self.num_profile_points,
            "max_dim_m": self.max_dim_m,
        }

    def mutate(self) -> "NacaConfig":
        """Return a new NacaConfig with perturbed digits, span, and chord."""
        digits_list = list(self.digits)

        if len(digits_list) == 4:
            if np.random.random() < 0.3:
                val = int(digits_list[0])
                val += np.random.choice([-1, 1])
                digits_list[0] = str(int(np.clip(val, 0, 9)))
            if np.random.random() < 0.3:
                val = int(digits_list[1])
                val += np.random.choice([-1, 1])
                digits_list[1] = str(int(np.clip(val, 1, 9)))
            # Ensure P>=1 when M>0 (avoids division by zero in camber formula)
            if int(digits_list[0]) > 0 and int(digits_list[1]) == 0:
                digits_list[1] = "1"
            t = int(self.digits[2:])
            if np.random.random() < 0.3:
                t = int(np.clip(t + np.random.choice([-1, 1]), 4, 35))
            new_digits = digits_list[0] + digits_list[1] + f"{t:02d}"
        else:
            # 5-digit: LPQXX
            if np.random.random() < 0.3:
                val = int(digits_list[0])
                val += np.random.choice([-1, 1])
                digits_list[0] = str(int(np.clip(val, 1, 5)))
            if np.random.random() < 0.3:
                val = int(digits_list[1])
                val += np.random.choice([-1, 1])
                digits_list[1] = str(int(np.clip(val, 1, 5)))
            # Keep Q (digits_list[2]) unchanged — reflexed variants are more complex
            t = int(self.digits[3:])
            if np.random.random() < 0.3:
                t = int(np.clip(t + np.random.choice([-1, 1]), 4, 35))
            new_digits = digits_list[0] + digits_list[1] + digits_list[2] + f"{t:02d}"

        new_span = float(
            np.clip(
                self.span + np.random.normal(0, self.max_dim_m * MUTATION_RATIO),
                0.1,
                self.max_dim_m,
            )
        )
        new_chord = float(
            np.clip(
                self.chord + np.random.normal(0, self.max_dim_m * MUTATION_RATIO),
                0.05,
                self.max_dim_m / 2,
            )
        )

        return NacaConfig(
            digits=new_digits,
            span=new_span,
            chord=new_chord,
            num_profile_points=self.num_profile_points,
            max_dim_m=self.max_dim_m,
        )

    @classmethod
    def random(cls, **kwargs: Any) -> "NacaConfig":
        """Create a random NacaConfig with valid NACA digits and dimensions."""
        max_dim_m: float = float(
            kwargs.get("max_dim_m", DEFAULT_MAX_WING_DIMENSION_M)
        )
        naca_type: int = int(
            kwargs.get("naca_type", np.random.choice([4, 5]))
        )

        span = float(np.random.uniform(0.3, max_dim_m))
        chord = float(np.random.uniform(0.1, max_dim_m / 2))

        if naca_type == 4:
            m = np.random.randint(0, 10)
            p = np.random.randint(1, 10) if m > 0 else 0
            t = np.random.randint(4, 36)
            digits = f"{m}{p}{t:02d}"
        else:
            cl = np.random.randint(1, 6)
            p = np.random.randint(1, 6)
            q = 0  # non-reflexed
            t = np.random.randint(4, 36)
            digits = f"{cl}{p}{q}{t:02d}"

        return cls(digits=digits, span=span, chord=chord, max_dim_m=max_dim_m)

    # ------------------------------------------------------------------
    # Internal profile generation helpers
    # ------------------------------------------------------------------

    def _generate_profile(self) -> list[list[float]]:
        if len(self.digits) == 4:
            return self._naca4_profile()
        elif len(self.digits) == 5:
            return self._naca5_profile()
        raise ValueError(
            f"NACA digits must be 4 or 5 chars, got: "
            f"{self.digits!r}"
        )

    def _thickness(self, t: float, x: np.ndarray) -> np.ndarray:
        """Standard NACA symmetric thickness half-distribution."""
        return (t / 0.2) * (
            0.2969 * np.sqrt(np.maximum(x, 0.0))
            - 0.1260 * x
            - 0.3516 * x**2
            + 0.2843 * x**3
            - 0.1015 * x**4
        )

    def _build_profile(
        self,
        x: np.ndarray,
        yc: np.ndarray,
        yt: np.ndarray,
    ) -> list[list[float]]:
        """Combine camber + thickness into a closed profile."""
        dyc_dx = np.gradient(yc, x)
        theta = np.arctan(dyc_dx)

        xu = x - yt * np.sin(theta)
        yu = yc + yt * np.cos(theta)
        xl = x + yt * np.sin(theta)
        yl = yc - yt * np.cos(theta)

        # Upper surface LE→TE, lower surface TE→LE (skip shared endpoints)
        upper = np.stack([xu, yu], axis=1)
        lower = np.stack([xl, yl], axis=1)
        profile = np.concatenate([upper, lower[-2:0:-1]], axis=0) * self.chord

        return profile.tolist()

    def _naca4_profile(self) -> list[list[float]]:
        m_camber = int(self.digits[0]) / 100.0
        p_pos = int(self.digits[1]) / 10.0
        t_thick = int(self.digits[2:]) / 100.0

        beta = np.linspace(0, np.pi, self.num_profile_points)
        x = (1 - np.cos(beta)) / 2

        yc = np.zeros_like(x)
        if m_camber > 0 and p_pos > 0:
            below = x < p_pos
            yc[below] = (
                (m_camber / p_pos**2)
                * (2 * p_pos * x[below] - x[below] ** 2)
            )
            above = ~below
            yc[above] = (
                (m_camber / (1 - p_pos) ** 2)
                * (
                    1
                    - 2 * p_pos
                    + 2 * p_pos * x[above]
                    - x[above] ** 2
                )
            )

        return self._build_profile(
            x, yc, self._thickness(t_thick, x)
        )

    def _naca5_profile(self) -> list[list[float]]:
        p_digit = int(self.digits[1])
        t_thick = int(self.digits[3:]) / 100.0

        if p_digit not in _NACA5_TABLE:
            raise ValueError(
                "NACA 5-digit second digit must be 1-5, "
                f"got: {p_digit}"
            )

        r, k1 = _NACA5_TABLE[p_digit]

        beta = np.linspace(0, np.pi, self.num_profile_points)
        x = (1 - np.cos(beta)) / 2

        yc = np.where(
            x < r,
            (k1 / 6) * (x**3 - 3 * r * x**2 + r**2 * (3 - r) * x),
            (k1 * r**3 / 6) * (1 - x),
        )

        return self._build_profile(
            x, yc, self._thickness(t_thick, x)
        )
