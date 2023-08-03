import numpy as np
import trimesh

import constants


def box_wing_xml(size: list = [15, 0.3, 30], density=23) -> str:
    return f"""<geom name="main_wing" type="box" size="{" ".join([str(dim) for dim in size])}" density="{density}" rgba="{constants.WING_RGBA}" pos="0 0 0"/>"""


def to_vertex_list(points: list) -> str:
    str_points = []

    for point in points:
        str_points.append(" ".join([str(coord) for coord in list(point)]))
    return " ".join(str_points)


def delta_wing_coords(
    wing_span_m=6, wing_chord_m=2, wing_tip_trail_m=4, thickness=0.5
) -> np.ndarray:
    # Leading point is at (0, 0, 0)
    # Trailing point is at (wing_chord_m, 0, 0)
    # Wing tip is at (wing_tip_trail_m, 0, wing_span_m / 2)

    # Create vertex array
    vertices = np.array(
        [
            [0, 0, 0],  # Leading edge top (root)
            [0, thickness, 0],  # Leading edge bottom
            [wing_chord_m, 0, 0],  # Trailing edge top
            [wing_chord_m, thickness, 0],  # Trailing edge bottom
            [wing_tip_trail_m, 0, wing_span_m / 2],  # Wing tip left top
            [wing_tip_trail_m, thickness, wing_span_m / 2],  # Wing tip left bottom
            [wing_tip_trail_m, 0, -wing_span_m / 2],  # Wing tip right top
            [wing_tip_trail_m, thickness, -wing_span_m / 2],  # Wing tip right bottom
        ]
    )

    return vertices


def mesh_geom(name: str = "delta-wing") -> str:
    geom = f"""<geom name="{name}" type="mesh" mesh="{name}-mesh"/>"""
    return geom


def delta_wing_asset(vertices=None) -> str:
    if vertices is None:
        vertices = delta_wing_coords()
    asset = f"""
    <asset>
        <mesh name="delta-wing-mesh" vertex="{to_vertex_list(vertices)}"/>
    </asset>"""

    return asset


def asset_from_stl(filename: str, name: str = "delta-wing"):
    mesh = trimesh.load(
        filename,
        file_type="stl",
    )
    vertices = mesh.vertices
    asset = f"""
    <asset>
        <mesh name="{name}-mesh" vertex="{to_vertex_list(vertices)}"/>
    </asset>"""

    return asset


def load_stl_from_file(filename: str):
    # Load the STL file and wrap it into a mesh object.

    with open(filename, "r", encoding="latin-1") as f:
        mesh = trimesh.load(f, file_type="stl")

    return mesh


if __name__ == "__main__":
    load_stl_from_file("./worlds/5th_Delta_S_int_P.stl")
