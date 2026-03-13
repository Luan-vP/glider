from glider.constants import (
    DEFAULT_MAX_WING_DIMENSION_M,
    WING_DENSITY,
)
from glider.shapes import (
    NacaConfig,
    ParametricConfig,
    PointCloudConfig,
    ShapeConfig,
)
from glider.vehicle import Vehicle

from .schema import VehicleType


def vehicle_from_schema(v: VehicleType) -> Vehicle:
    """Construct a Vehicle from a VehicleType schema object.

    Raises ValueError for unknown shape_type values.
    """
    shape_type = v.shape_type
    max_dim = (
        v.max_dim_m
        if v.max_dim_m is not None
        else DEFAULT_MAX_WING_DIMENSION_M
    )
    wing_density = (
        v.wing_density
        if v.wing_density is not None
        else WING_DENSITY
    )

    cfg: ShapeConfig

    if shape_type == "point_cloud":
        if v.shape_params is not None:
            vertices = v.shape_params.get(
                "vertices", v.vertices
            )
            pc_max = v.shape_params.get(
                "max_dim_m", v.max_dim_m
            )
        else:
            vertices = v.vertices
            pc_max = v.max_dim_m

        cfg = PointCloudConfig(
            vertices=vertices or [],
            max_dim_m=(
                pc_max
                if pc_max is not None
                else DEFAULT_MAX_WING_DIMENSION_M
            ),
        )
        return Vehicle(
            max_dim_m=max_dim,
            mass_kg=v.mass_kg,
            orientation=v.orientation or [0.0, 0.0, 0.0],
            wing_density=wing_density,
            pilot=v.pilot,
            shape_config=cfg,
        )

    if shape_type == "naca":
        params = v.naca_params or {}
        cfg = NacaConfig(
            digits=str(params.get("digits", "0012")),
            span=float(params.get("span", 2.0)),
            chord=float(params.get("chord", 0.5)),
            max_dim_m=max_dim,
        )
        return Vehicle(
            max_dim_m=max_dim,
            mass_kg=v.mass_kg,
            orientation=v.orientation or [0.0, 0.0, 0.0],
            wing_density=wing_density,
            pilot=v.pilot,
            shape_config=cfg,
        )

    if shape_type == "parametric":
        params = v.parametric_params or {}
        cfg = ParametricConfig(
            max_camber=float(
                params.get("max_camber", 0.02)
            ),
            camber_position=float(
                params.get("camber_position", 0.4)
            ),
            max_thickness=float(
                params.get("max_thickness", 0.12)
            ),
            span=float(params.get("span", 2.0)),
            chord=float(params.get("chord", 0.5)),
        )
        return Vehicle(
            max_dim_m=max_dim,
            mass_kg=v.mass_kg,
            orientation=v.orientation or [0.0, 0.0, 0.0],
            wing_density=wing_density,
            pilot=v.pilot,
            shape_config=cfg,
        )

    raise ValueError(
        f"Unknown shape_type: {shape_type!r}. "
        "Supported: 'point_cloud', 'naca', 'parametric'."
    )
