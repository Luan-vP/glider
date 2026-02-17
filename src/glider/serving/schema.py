from pydantic import BaseModel


class VehicleType(BaseModel):
    vertices: list[list[float]] | None
    faces: list[list[int]] | None
    max_dim_m: float | None
    mass_kg: float | None
    orientation: list[float] | None
    wing_density: float | None
    pilot: bool = False


class EvolutionRequest(BaseModel):
    population_size: int = 100
    num_generations: int = 10
    survival_weight: float = 0.3
    cloning_weight: float = 0.4
    max_dim_m: float = 4.5
    pilot: bool = False
    mass_kg: float | None = None
    wing_density: float | None = None


class GenerationResult(BaseModel):
    generation: int
    best_fitness: float
    avg_fitness: float
    best_vehicle: VehicleType
    population_fitness: list[float]
