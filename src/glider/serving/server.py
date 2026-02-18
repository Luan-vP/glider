from base64 import b64encode
from collections.abc import Generator
from io import BytesIO
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image

from glider import optimization, vehicle, visualization
from glider.constants import WING_DENSITY

from .schema import (
    DropTestVideoResult,
    EvolutionRequest,
    GenerationResult,
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
async def create_vehicle() -> Any:
    return vehicle.Vehicle()


@app.post("/vehicle/drop_test/")
async def drop_test_vehicle(v: VehicleType) -> str:
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    return optimization.drop_test_glider(test_vehicle)


@app.post("/vehicle/view/")
async def view_vehicle(v: VehicleType) -> dict[str, str]:
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    buf = BytesIO()
    Image.fromarray(
        visualization.view_vehicle(test_vehicle)
    ).save(buf, format="PNG")
    b64_image = b64encode(buf.getvalue())
    return {"data": b64_image.decode("utf-8")}


@app.post("/vehicle/fitness/")
async def vehicle_fitness(v: VehicleType) -> float:
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    return optimization.fitness_func(test_vehicle)


@app.post("/vehicle/drop_test_video/")
async def drop_test_video(
    v: VehicleType,
) -> DropTestVideoResult:
    """Run a drop test and return videos from both camera angles."""
    import mujoco

    test_vehicle = vehicle.Vehicle(**v.model_dump())

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


@app.post("/evolution/run")
async def run_evolution(req: EvolutionRequest) -> StreamingResponse:
    def generate() -> Generator[str, None, None]:
        # Create initial population
        population = [
            vehicle.Vehicle(
                num_vertices=optimization.NUM_GENES,
                max_dim_m=req.max_dim_m,
                pilot=req.pilot,
                mass_kg=req.mass_kg,
                wing_density=(
                    req.wing_density
                    if req.wing_density is not None
                    else WING_DENSITY
                ),
            )
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
            )

            # Extract results
            best_vehicle, best_fitness = ranking[0]
            all_fitnesses = [score for _, score in ranking]
            avg_fitness = (
                sum(all_fitnesses) / len(all_fitnesses)
            )

            # Create result object
            result = GenerationResult(
                generation=gen,
                best_fitness=best_fitness,
                avg_fitness=avg_fitness,
                best_vehicle=VehicleType(
                    vertices=best_vehicle.vertices,
                    faces=best_vehicle.faces,
                    max_dim_m=best_vehicle.max_dim_m,
                    mass_kg=best_vehicle.mass_kg,
                    orientation=best_vehicle.orientation,
                    wing_density=best_vehicle.wing_density,
                    pilot=best_vehicle.pilot,
                ),
                population_fitness=all_fitnesses,
            )

            # Yield SSE-formatted event
            yield f"data: {result.model_dump_json()}\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream"
    )
