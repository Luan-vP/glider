"""Simulate multiple glider types dropping in wind and export trajectories.

Outputs:
  output/multi_drop_trajectories.json  — trajectory data for Three.js replay
  output/frames/*.png                  — transparent PNG frames for WebM encoding
  output/multi_drop.webm               — transparent WebM video (if ffmpeg available)
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import fast_simplification
import matplotlib.pyplot as plt
import mujoco
import numpy as np
import trimesh

from glider.constants import AIR_DENSITY, AIR_VISCOSITY
from glider.shapes.naca import NacaConfig
from glider.shapes.parametric import ParametricConfig
from glider.surface import spherical_delaunay_surface
from glider.vehicle import Vehicle

ROOT = Path(__file__).resolve().parents[1]
STL_PATH = ROOT / "assets" / "meshes" / "G3_Maple_Seed_Helicopter.stl"
OUTPUT_DIR = ROOT / "output"
FRAMES_DIR = OUTPUT_DIR / "frames"

# Simulation parameters
WIND = "5 0 0"
DROP_HEIGHT = 50.0
MAX_SIM_TIME = 30.0
SAMPLE_RATE = 60
SAMARA_SCALE = 30.0
SAMARA_MASS = 8.0
Y_SPACING = 15.0  # meters between vehicles on Y axis


# -- Vehicle roster ----------------------------------------------------------


def make_samara_vehicle() -> Vehicle:
    mesh = trimesh.load(str(STL_PATH))
    verts, faces = fast_simplification.simplify(
        mesh.vertices, mesh.faces,
        target_reduction=1.0 - (300 / len(mesh.faces)),
    )
    mesh = trimesh.Trimesh(vertices=verts, faces=faces)
    mesh.apply_scale(0.001 * SAMARA_SCALE)
    mesh.vertices -= mesh.center_mass
    return Vehicle(
        vertices=mesh.vertices.tolist(),
        faces=mesh.faces.tolist(),
        mass_kg=SAMARA_MASS,
    )


def make_roster() -> list[tuple[str, Vehicle, str]]:
    """Return list of (label, vehicle, hex_color)."""
    samara = make_samara_vehicle()

    naca_cfg = NacaConfig(digits="2412", span=3.0, chord=0.8)
    naca = Vehicle(shape_config=naca_cfg, mass_kg=8.0)

    para_cfg = ParametricConfig(
        max_camber=0.04, camber_position=0.4,
        max_thickness=0.12, span=3.0, chord=0.8,
    )
    parametric = Vehicle(shape_config=para_cfg, mass_kg=8.0)

    pc = Vehicle(num_vertices=30, max_dim_m=3.0, mass_kg=8.0)
    pc_verts, pc_faces = spherical_delaunay_surface(pc.vertices)
    pc.vertices = pc_verts
    pc.faces = pc_faces

    return [
        ("Samara", samara, "#4CAF50"),
        ("NACA 2412", naca, "#2196F3"),
        ("Parametric", parametric, "#FF9800"),
        ("Point Cloud", pc, "#E91E63"),
    ]


# -- Multi-body XML ----------------------------------------------------------


def _rename_vehicle_xml(body_xml: str, asset_xml: str, idx: int) -> tuple[str, str]:
    """Make body/mesh names unique for vehicle idx."""
    body_xml = re.sub(r'name="body"', f'name="body-{idx}"', body_xml)
    body_xml = re.sub(r'name="vehicle-wing"', f'name="vehicle-wing-{idx}"', body_xml)
    body_xml = re.sub(r'mesh="vehicle-wing-mesh"', f'mesh="vehicle-wing-mesh-{idx}"', body_xml)
    body_xml = re.sub(r'name="track"', f'name="track-{idx}"', body_xml)
    # Offset on Y axis
    body_xml = re.sub(
        r'pos="0 0 0"',
        f'pos="0 {idx * Y_SPACING} 0"',
        body_xml,
        count=1,
    )
    asset_xml = re.sub(
        r'name="vehicle-wing-mesh"',
        f'name="vehicle-wing-mesh-{idx}"',
        asset_xml,
    )
    return body_xml, asset_xml


def build_multi_drop_xml(roster: list[tuple[str, Vehicle, str]]) -> str:
    bodies = []
    assets = []
    for i, (label, vehicle, color) in enumerate(roster):
        body_xml, asset_xml = vehicle.xml()
        body_xml, asset_xml = _rename_vehicle_xml(body_xml, asset_xml, i)
        bodies.append(f"        <!-- {label} -->\n{body_xml}")
        assets.append(asset_xml)

    # Merge all <asset> blocks into one
    mesh_defs = []
    for a in assets:
        for m in re.finditer(r"<mesh [^>]+/>", a):
            mesh_defs.append(f"            {m.group(0)}")

    return f"""
<mujoco>
    <option density="{AIR_DENSITY}" viscosity="{AIR_VISCOSITY}" wind="{WIND}"
            timestep="0.002" integrator="implicit"/>
    <worldbody>
        <light name="top" pos="0 0 5"/>
        <camera name="fixed" pos="0 -{len(roster) * Y_SPACING} 100" euler="40 0 0"/>
{"".join(bodies)}
        <body name="platform" pos="0 0 0">
            <geom name="platform-geom" type="box"
                  size="1500 1500 1" rgba="1 1 1 1"
                  pos="0 0 {-DROP_HEIGHT}"/>
        </body>
    </worldbody>
    <asset>
{chr(10).join(mesh_defs)}
    </asset>
</mujoco>
"""


# -- Simulation ---------------------------------------------------------------


def simulate(
    xml: str, n_vehicles: int
) -> list[list[dict]]:
    """Run simulation, return list of trajectory frame lists per vehicle."""
    model = mujoco.MjModel.from_xml_string(xml)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)

    trajectories: list[list[dict]] = [[] for _ in range(n_vehicles)]
    landed = [False] * n_vehicles

    while data.time < MAX_SIM_TIME and not all(landed):
        mujoco.mj_step(model, data)

        # Check contacts
        for c in range(data.ncon):
            contact = data.contact[c]
            geom1_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, contact.geom1)
            geom2_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, contact.geom2)
            if geom1_name and geom2_name:
                for i in range(n_vehicles):
                    wing_name = f"vehicle-wing-{i}"
                    if wing_name in (geom1_name, geom2_name) and "platform" in (geom1_name, geom2_name):
                        landed[i] = True

        # Sample frames
        for i in range(n_vehicles):
            if not landed[i] and len(trajectories[i]) < data.time * SAMPLE_RATE:
                body_name = f"body-{i}"
                pos = data.body(body_name).xpos.tolist()
                quat = data.body(body_name).xquat.tolist()
                trajectories[i].append({
                    "time": float(data.time),
                    "position": pos,
                    "orientation": quat,
                })

    return trajectories


# -- JSON export --------------------------------------------------------------


def export_json(
    roster: list[tuple[str, Vehicle, str]],
    trajectories: list[list[dict]],
) -> Path:
    data = {
        "wind": [float(x) for x in WIND.split()],
        "sample_rate": SAMPLE_RATE,
        "drop_height": DROP_HEIGHT,
        "vehicles": [],
    }
    for (label, vehicle, color), traj in zip(roster, trajectories):
        data["vehicles"].append({
            "label": label,
            "color": color,
            "vertices": vehicle.vertices,
            "faces": vehicle.faces,
            "frames": traj,
        })

    out = OUTPUT_DIR / "multi_drop_trajectories.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(data, f)
    return out


# -- Transparent frame rendering ----------------------------------------------


def render_frames(
    roster: list[tuple[str, Vehicle, str]],
    trajectories: list[list[dict]],
) -> Path:
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)

    # Find global time range and bounds
    all_frames = [f for traj in trajectories for f in traj]
    if not all_frames:
        print("No trajectory data to render!")
        return FRAMES_DIR

    max_time = max(f["time"] for f in all_frames)
    all_x = [f["position"][0] for f in all_frames]
    all_z = [f["position"][2] for f in all_frames]
    x_margin = max(5, (max(all_x) - min(all_x)) * 0.1)
    z_margin = max(5, (max(all_z) - min(all_z)) * 0.1)
    xlim = (min(all_x) - x_margin, max(all_x) + x_margin)
    zlim = (min(all_z) - z_margin, max(all_z) + z_margin)

    # Generate one frame per sample
    n_frames = max(len(t) for t in trajectories)
    frame_step = max(1, n_frames // 300)  # cap at ~300 frames for speed

    frame_num = 0
    for fi in range(0, n_frames, frame_step):
        fig, ax = plt.subplots(figsize=(12, 8))
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)
        ax.set_xlim(xlim)
        ax.set_ylim(zlim)
        ax.set_aspect("equal")
        ax.axis("off")

        for (label, vehicle, color), traj in zip(roster, trajectories):
            if fi >= len(traj):
                # Vehicle already landed — draw full trail
                trail = traj
            else:
                trail = traj[: fi + 1]

            if not trail:
                continue

            xs = [f["position"][0] for f in trail]
            zs = [f["position"][2] for f in trail]

            # Trail with gradient alpha
            n_pts = len(xs)
            for j in range(1, n_pts):
                alpha = 0.1 + 0.9 * (j / n_pts)
                ax.plot(
                    xs[j - 1: j + 1], zs[j - 1: j + 1],
                    color=color, alpha=alpha, linewidth=2,
                )

            # Current position marker
            ax.plot(xs[-1], zs[-1], "o", color=color, markersize=8)
            ax.annotate(
                label, (xs[-1], zs[-1]),
                textcoords="offset points", xytext=(8, 8),
                fontsize=9, color=color, fontweight="bold",
                alpha=0.9,
            )

        fig.savefig(
            FRAMES_DIR / f"{frame_num:04d}.png",
            transparent=True, dpi=150, bbox_inches="tight", pad_inches=0.1,
        )
        plt.close(fig)
        frame_num += 1

    print(f"Rendered {frame_num} frames to {FRAMES_DIR}")
    return FRAMES_DIR


def encode_webm(frames_dir: Path) -> Path | None:
    out = OUTPUT_DIR / "multi_drop.webm"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", "30",
        "-i", str(frames_dir / "%04d.png"),
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuva420p",
        "-b:v", "2M",
        out,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Encoded WebM: {out} ({out.stat().st_size / 1024:.0f} KB)")
        return out
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"ffmpeg encoding failed: {e}")
        print("Install ffmpeg to generate WebM. Frames are still available in output/frames/")
        return None


# -- Main ---------------------------------------------------------------------


def main() -> None:
    print("Building vehicle roster...", flush=True)
    roster = make_roster()
    for label, vehicle, color in roster:
        print(f"  {label}: {len(vehicle.vertices)} verts, {len(vehicle.faces)} faces")

    print("\nBuilding multi-drop scene XML...", flush=True)
    xml = build_multi_drop_xml(roster)

    print(f"Simulating ({len(roster)} vehicles, wind={WIND}, max_time={MAX_SIM_TIME}s)...", flush=True)
    trajectories = simulate(xml, len(roster))

    for (label, _, _), traj in zip(roster, trajectories):
        if traj:
            end = traj[-1]["position"]
            horiz = np.sqrt(end[0] ** 2 + end[1] ** 2)
            print(f"  {label}: {len(traj)} frames, final=({end[0]:.1f}, {end[1]:.1f}, {end[2]:.1f}), horiz={horiz:.1f}m")
        else:
            print(f"  {label}: no trajectory data")

    print("\nExporting trajectory JSON...", flush=True)
    json_path = export_json(roster, trajectories)
    print(f"  {json_path} ({json_path.stat().st_size / 1024:.0f} KB)")

    print("\nRendering transparent frames...", flush=True)
    frames_dir = render_frames(roster, trajectories)

    print("\nEncoding WebM...", flush=True)
    encode_webm(frames_dir)

    print("\nDone!")


if __name__ == "__main__":
    main()
