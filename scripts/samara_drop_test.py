"""Drop test the maple samara (helicopter seed) STL mesh.

The STL is in mm, so we scale to meters. The seed is ~97mm long / 2.5g.
We scale the geometry up by 30x to ~3m wingspan (comparable to the other
gliders in this repo) and set mass proportionally so density is preserved.
"""

from pathlib import Path

import fast_simplification
import mujoco
import numpy as np
import trimesh

STL_PATH = Path(__file__).resolve().parents[1] / "assets" / "meshes" / "G3_Maple_Seed_Helicopter.stl"

SCALE_UP = 30.0  # 97mm * 30 ≈ 2.9m wingspan
REAL_MASS_KG = 0.0025
SCALED_MASS_KG = 8.0  # Light wing, comparable to hang-glider wing (~4.5m, density 0.4)
DROP_HEIGHT = 50.0
MAX_SIM_TIME = 30.0
WIND = "5 0 0"  # 5 m/s crosswind (~11 mph light breeze)


def load_and_prepare_mesh() -> trimesh.Trimesh:
    mesh = trimesh.load(str(STL_PATH))

    # Decimate for MuJoCo inline mesh
    target_faces = 300
    if len(mesh.faces) > target_faces:
        verts, faces = fast_simplification.simplify(
            mesh.vertices, mesh.faces,
            target_reduction=1.0 - (target_faces / len(mesh.faces)),
        )
        mesh = trimesh.Trimesh(vertices=verts, faces=faces)

    # mm -> m, then scale up
    mesh.apply_scale(0.001 * SCALE_UP)

    # Center at origin
    mesh.vertices -= mesh.center_mass

    return mesh


def build_xml(mesh: trimesh.Trimesh) -> str:
    verts_str = " ".join(f"{v[0]} {v[1]} {v[2]}" for v in mesh.vertices)
    faces_str = " ".join(f"{f[0]} {f[1]} {f[2]}" for f in mesh.faces)

    return f"""
<mujoco>
    <option density="1.2" viscosity="2e-05" wind="{WIND}"
            timestep="0.002" integrator="implicit"/>
    <worldbody>
        <light name="top" pos="0 0 5"/>
        <camera name="fixed" pos="0 -100 100" euler="40 0 0"/>
        <body name="body" pos="0 0 0" euler="0 45 0">
            <freejoint/>
            <geom name="samara" mass="{SCALED_MASS_KG:.4f}"
                  rgba="0.2 0.6 0.2 0.8" type="mesh"
                  mesh="samara-mesh" fluidshape="ellipsoid"/>
            <camera name="track" pos="0 0 0" xyaxes="1 2 0 0 1 2" mode="track"/>
        </body>
        <body name="platform" pos="0 0 0">
            <geom name="platform-geom" type="box"
                  size="1500 1500 1" rgba="1 1 1 1"
                  pos="0 0 {-DROP_HEIGHT}"/>
        </body>
    </worldbody>
    <asset>
        <mesh name="samara-mesh" vertex="{verts_str}" face="{faces_str}"/>
    </asset>
</mujoco>
"""


def main() -> None:
    mesh = load_and_prepare_mesh()
    print(f"Mesh: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
    print(f"Bounding box: {mesh.bounding_box.extents}")
    print(f"Scaled mass: {SCALED_MASS_KG:.2f} kg (real: {REAL_MASS_KG*1000:.1f}g, scale: {SCALE_UP}x)")

    xml = build_xml(mesh)
    model = mujoco.MjModel.from_xml_string(xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)

    # Give it initial spin around the vertical (z) axis
    body_id = model.body("body").id
    joint_id = model.body(body_id).jntadr[0]
    qvel_start = model.jnt_dofadr[joint_id]
    data.qvel[qvel_start + 3:qvel_start + 6] = [0, 0, 10.0]  # angular vel around z

    print(f"\nRunning drop test (height={DROP_HEIGHT}m, max_time={MAX_SIM_TIME}s)...", flush=True)

    landed = False
    while data.time < MAX_SIM_TIME:
        mujoco.mj_step(model, data)
        if len(data.contact) > 0:
            landed = True
            break

    pos = data.body("body").xpos.tolist()
    horizontal = np.sqrt(pos[0] ** 2 + pos[1] ** 2)
    vertical = abs(pos[2])
    glide_ratio = horizontal / (DROP_HEIGHT + vertical) if (DROP_HEIGHT + vertical) > 0 else 0

    print(f"\nResults:")
    print(f"  Landed: {landed}")
    print(f"  Duration: {data.time:.2f}s")
    print(f"  Final pos: ({pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f})")
    print(f"  Horizontal distance: {horizontal:.2f} m")
    print(f"  Vertical drop: {DROP_HEIGHT + vertical:.2f} m")
    print(f"  Glide ratio: {glide_ratio:.4f}")


if __name__ == "__main__":
    main()
