from pydantic import BaseModel


class VehicleType(BaseModel):
    vertices: list[list[float]] | None
    faces: list[list[int]] | None
    max_dim_m: float | None
    mass_kg: float | None
    orientation: list[float] | None
    wing_density: float | None
    pilot: bool = False
    shape_type: str = "point_cloud"
    naca_params: dict | None = None
    parametric_params: dict | None = None
    shape_params: dict | None = None


class EvolutionRequest(BaseModel):
    population_size: int = 100
    num_generations: int = 10
    survival_weight: float = 0.3
    cloning_weight: float = 0.4
    max_dim_m: float = 4.5
    pilot: bool = False
    mass_kg: float | None = None
    wing_density: float | None = None
    shape_type: str = "point_cloud"
    naca_params: dict | None = None
    parametric_params: dict | None = None


class GenerationResult(BaseModel):
    generation: int
    best_fitness: float
    avg_fitness: float
    best_vehicle: VehicleType
    population_fitness: list[float]


class DropTestVideoResult(BaseModel):
    fitness: float
    fixed_camera_video: str
    track_camera_video: str


class TrajectoryFrame(BaseModel):
    time: float
    position: list[float]
    orientation: list[float]


class DropTestTrajectoryResult(BaseModel):
    fitness: float
    sample_rate: int
    frames: list[TrajectoryFrame]
    vertices: list[list[float]]
    faces: list[list[int]]
