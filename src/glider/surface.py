from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import trimesh


def spherical_delaunay_surface(
    vertices: Iterable[Iterable[float]],
    center: Iterable[float] | None = None,
    rounding_decimals: int = 6,
) -> tuple[list[list[float]], list[list[int]]]:
    """
    Build a star-shaped surface by triangulating directions on the unit sphere.

    Uses a convex hull of normalized direction vectors as a spherical
    triangulation. This is a practical stand-in for spherical Delaunay without
    pulling in heavier dependencies.
    """
    points = np.asarray(list(vertices), dtype=float)
    if points.ndim != 2 or points.shape[0] < 4:
        return points.tolist(), []

    if center is None:
        center_vec = points.mean(axis=0)
    else:
        center_vec = np.asarray(center, dtype=float)

    directions = points - center_vec
    norms = np.linalg.norm(directions, axis=1)
    valid = norms > 1e-12
    if np.count_nonzero(valid) < 4:
        return points.tolist(), []

    directions = directions[valid] / norms[valid][:, None]
    original_indices = np.nonzero(valid)[0]

    # Collapse near-duplicate directions to keep hull stable.
    rounded = np.round(directions, decimals=rounding_decimals)
    unique_dirs, unique_idx = np.unique(rounded, axis=0, return_index=True)
    if unique_dirs.shape[0] < 4:
        return points.tolist(), []

    hull = trimesh.convex.convex_hull(unique_dirs)
    faces = original_indices[unique_idx][hull.faces]

    return points.tolist(), faces.tolist()
