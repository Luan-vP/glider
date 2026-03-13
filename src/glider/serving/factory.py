from glider.constants import DEFAULT_MAX_WING_DIMENSION_M, WING_DENSITY
from glider.shapes import PointCloudConfig
from glider.vehicle import Vehicle

from .schema import VehicleType


def vehicle_from_schema(v: VehicleType) -> Vehicle:
    """Construct a Vehicle from a VehicleType schema object.

    Raises ValueError for unknown shape_type values.
    """
    shape_type = v.shape_type

    if shape_type == "point_cloud":
        if v.shape_params is not None:
            vertices = v.shape_params.get("vertices", v.vertices)
            max_dim_m = v.shape_params.get("max_dim_m", v.max_dim_m)
        else:
            vertices = v.vertices
            max_dim_m = v.max_dim_m

        shape_config = PointCloudConfig(
            vertices=vertices or [],
            max_dim_m=(
                max_dim_m if max_dim_m is not None else DEFAULT_MAX_WING_DIMENSION_M
            ),
        )
        return Vehicle(
            max_dim_m=v.max_dim_m,
            mass_kg=v.mass_kg,
            orientation=v.orientation or [0.0, 0.0, 0.0],
            wing_density=v.wing_density if v.wing_density is not None else WING_DENSITY,
            pilot=v.pilot,
            shape_config=shape_config,
        )

    raise ValueError(
        f"Unknown shape_type: {shape_type!r}. Supported types: 'point_cloud'."
    )
