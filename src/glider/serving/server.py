from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
from base64 import b64encode
from io import BytesIO

from .schema import VehicleType, EvolutionRequest, GenerationResult, DropTestVideoResult

from glider import optimization, vehicle, visualization
from glider.constants import THINNESS_PENALTY_WEIGHT, MIN_THICKNESS_RATIO

app = FastAPI()

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/vehicle/")
async def create_vehicle():
    return vehicle.Vehicle()


@app.post("/vehicle/drop_test/")
async def drop_test_vehicle(v: VehicleType):
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    return optimization.drop_test_glider(test_vehicle)


@app.post("/vehicle/view/")
async def view_vehicle(v: VehicleType):
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    bytes = BytesIO()
    Image.fromarray(visualization.view_vehicle(test_vehicle)).save(bytes, format="PNG")
    b64_image = b64encode(bytes.getvalue())
    return {"data": b64_image.decode("utf-8")}


@app.post("/vehicle/fitness/")
async def vehicle_fitness(v: VehicleType) -> float:
    test_vehicle = vehicle.Vehicle(**v.model_dump())
    return optimization.fitness_func(test_vehicle)


@app.post("/vehicle/drop_test_video/")
async def drop_test_video(v: VehicleType) -> DropTestVideoResult:
    """
    Run a drop test and return videos from both camera angles along with fitness score.
    Renders the simulation from 'fixed' (stationary) and 'track' (body-attached) cameras.
    """
    import mujoco

    test_vehicle = vehicle.Vehicle(**v.model_dump())

    # Build the drop test world XML (includes both cameras)
    world_xml = optimization.drop_test_glider(test_vehicle, height=optimization.DROP_TEST_HEIGHT)

    # Create model and data
    model = mujoco.MjModel.from_xml_string(world_xml)
    data = mujoco.MjData(model)

    # Render frames from both cameras until collision
    fixed_frames = visualization.render_to_collision(model, data, framerate=60, camera_name="fixed", show=False)

    # Reset simulation for second camera
    mujoco.mj_resetData(model, data)
    track_frames = visualization.render_to_collision(model, data, framerate=60, camera_name="track", show=False)

    # Calculate fitness (need to reset and run simulation again)
    mujoco.mj_resetData(model, data)
    while len(data.contact) < 1:
        mujoco.mj_step(model, data)

    distance = abs(data.geom("vehicle-wing").xpos[0])
    ratio = optimization.thinness_ratio(test_vehicle.vertices)
    thinness_penalty = 0.0
    if ratio < MIN_THICKNESS_RATIO:
        thinness_penalty = THINNESS_PENALTY_WEIGHT * (
            (MIN_THICKNESS_RATIO - ratio) / MIN_THICKNESS_RATIO
        )
    fitness = distance - thinness_penalty

    # Encode videos to base64
    fixed_video = visualization.encode_video_to_base64(fixed_frames, framerate=60)
    track_video = visualization.encode_video_to_base64(track_frames, framerate=60)

    return DropTestVideoResult(
        fitness=fitness,
        fixed_camera_video=fixed_video,
        track_camera_video=track_video
    )


@app.post("/evolution/run")
async def run_evolution(req: EvolutionRequest):
    def generate():
        # Create initial population
        population = [
            vehicle.Vehicle(
                num_vertices=optimization.NUM_GENES,
                max_dim_m=req.max_dim_m,
                pilot=req.pilot,
                mass_kg=req.mass_kg,
                wing_density=req.wing_density,
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
            avg_fitness = sum(all_fitnesses) / len(all_fitnesses)

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

    return StreamingResponse(generate(), media_type="text/event-stream")
