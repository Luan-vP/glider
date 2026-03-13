from base64 import b64encode
from collections.abc import Generator
from io import BytesIO

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image

from glider import optimization, vehicle, visualization
from glider.constants import WING_DENSITY
from glider.shapes import (
    NacaConfig,
    ParametricConfig,
    ShapeConfig,
)

from .factory import vehicle_from_schema
from .schema import (
    DropTestTrajectoryResult,
    DropTestVideoResult,
    EvolutionRequest,
    GenerationResult,
    TrajectoryFrame,
    VehicleType,
)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3357",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"Hello": "World"}


@app.get("/vehicle/")
async def create_vehicle() -> VehicleType:
    v = vehicle.Vehicle()
    return VehicleType(
        vertices=v.vertices,
        faces=v.faces,
        max_dim_m=v.max_dim_m,
        mass_kg=v.mass_kg,
        orientation=v.orientation,
        wing_density=v.wing_density,
        pilot=v.pilot,
    )


@app.post("/vehicle/drop_test/")
async def drop_test_vehicle(v: VehicleType) -> str:
    test_vehicle = vehicle_from_schema(v)
    return optimization.drop_test_glider(test_vehicle)


@app.post("/vehicle/view/")
async def view_vehicle(v: VehicleType) -> dict[str, str]:
    test_vehicle = vehicle_from_schema(v)
    buf = BytesIO()
    Image.fromarray(
        visualization.view_vehicle(test_vehicle)
    ).save(buf, format="PNG")
    b64_image = b64encode(buf.getvalue())
    return {"data": b64_image.decode("utf-8")}


@app.post("/vehicle/fitness/")
async def vehicle_fitness(v: VehicleType) -> float:
    test_vehicle = vehicle_from_schema(v)
    return optimization.fitness_func(test_vehicle)


@app.post("/vehicle/drop_test_video/")
async def drop_test_video(
    v: VehicleType,
) -> DropTestVideoResult:
    """Run a drop test and return videos from both camera angles."""
    import mujoco

    test_vehicle = vehicle_from_schema(v)

    world_xml = optimization.drop_test_glider(
        test_vehicle, height=optimization.DROP_TEST_HEIGHT
    )

    model = mujoco.MjModel.from_xml_string(world_xml)
    data = mujoco.MjData(model)

    fixed_frames = visualization.render_to_collision(
        model, data, framerate=60, camera_name="fixed", show=False
    )

    mujoco.mj_resetData(model, data)
    track_frames = visualization.render_to_collision(
        model, data, framerate=60, camera_name="track", show=False
    )

    fitness = optimization.fitness_func(test_vehicle)

    fixed_video = visualization.encode_video_to_base64(
        fixed_frames, framerate=60
    )
    track_video = visualization.encode_video_to_base64(
        track_frames, framerate=60
    )

    return DropTestVideoResult(
        fitness=fitness,
        fixed_camera_video=fixed_video,
        track_camera_video=track_video,
    )


@app.post("/vehicle/drop_test_trajectory/")
async def drop_test_trajectory(
    v: VehicleType,
    sample_rate: int = 60,
) -> DropTestTrajectoryResult:
    """Run a drop test and return per-frame trajectory data plus fitness."""
    test_vehicle = vehicle_from_schema(v)

    raw_frames, fitness = optimization.simulate_trajectory(
        test_vehicle, sample_rate=sample_rate
    )

    return DropTestTrajectoryResult(
        fitness=fitness,
        sample_rate=sample_rate,
        frames=[TrajectoryFrame(**f) for f in raw_frames],
        vertices=test_vehicle.vertices,
        faces=test_vehicle.faces,
    )


def _make_initial_vehicle(
    req: EvolutionRequest,
) -> vehicle.Vehicle:
    """Create a single initial Vehicle for the request."""
    wd = (
        req.wing_density
        if req.wing_density is not None
        else WING_DENSITY
    )
    cfg: ShapeConfig

    if req.shape_type == "naca":
        cfg = NacaConfig.random(max_dim_m=req.max_dim_m)
        return vehicle.Vehicle(
            max_dim_m=req.max_dim_m,
            pilot=req.pilot,
            mass_kg=req.mass_kg,
            wing_density=wd,
            shape_config=cfg,
        )
    elif req.shape_type == "parametric":
        cfg = ParametricConfig.random()
        return vehicle.Vehicle(
            max_dim_m=req.max_dim_m,
            pilot=req.pilot,
            mass_kg=req.mass_kg,
            wing_density=wd,
            shape_config=cfg,
        )
    else:
        return vehicle.Vehicle(
            num_vertices=optimization.NUM_GENES,
            max_dim_m=req.max_dim_m,
            pilot=req.pilot,
            mass_kg=req.mass_kg,
            wing_density=wd,
        )


@app.post("/evolution/run")
async def run_evolution(req: EvolutionRequest) -> StreamingResponse:
    def generate() -> Generator[str, None, None]:
        # Create initial population using shape-aware factory
        population = [
            _make_initial_vehicle(req)
            for _ in range(req.population_size)
        ]

        for gen in range(req.num_generations):
            # Run one generation
            ranking, population = optimization.iterate_population(
                population,
                survival_weight=req.survival_weight,
                cloning_weight=req.cloning_weight,
                max_dim_m=req.max_dim_m,
                pilot=req.pilot,
                mass_kg=req.mass_kg,
                shape_type=req.shape_type,
            )

            # Extract results
            best_vehicle, best_fitness = ranking[0]
            all_fitnesses = [score for _, score in ranking]
            avg_fitness = (
                sum(all_fitnesses) / len(all_fitnesses)
            )

            # Create result object (uses to_schema() to include shape params)
            result = GenerationResult(
                generation=gen,
                best_fitness=best_fitness,
                avg_fitness=avg_fitness,
                best_vehicle=VehicleType(**best_vehicle.to_schema()),
                population_fitness=all_fitnesses,
            )

            # Yield SSE-formatted event
            yield f"data: {result.model_dump_json()}\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream"
    )
