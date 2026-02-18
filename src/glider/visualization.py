from io import BytesIO
from typing import Any

import matplotlib.pyplot as plt
import mediapy as media
import mujoco
import numpy as np
import pandas as pd
from PIL import Image

from .constants import AIR_DENSITY, AIR_VISCOSITY


def wrap_glider(glider_xml: str, glider_asset: str, wind: str = "0 0 0") -> str:
    world_xml = f"""
<mujoco>
    <option density="{AIR_DENSITY}" viscosity="{AIR_VISCOSITY}" wind="{wind}"/>
    <worldbody>
        <light name="sideN" pos="0 1 10"/>
        <light name="sideE" pos="1 0 10"/>
        <light name="sideS" pos="0 -1 10"/>
        <light name="sideW" pos="-1 0 10"/>
        <!-- Body -->
        {glider_xml}
    </worldbody>

    {glider_asset}
</mujoco>

"""

    return world_xml


def render_initial_pixels(
    model,
    data,
) -> np.ndarray:
    renderer = mujoco.Renderer(model)

    mujoco.mj_step(model, data)

    renderer.update_scene(data)
    pixels = renderer.render()
    return pixels


def view_vehicle(vehicle: Any):
    world_xml = wrap_glider(*vehicle.xml())

    model = mujoco.MjModel.from_xml_string(world_xml)
    data = mujoco.MjData(model)

    return render_initial_pixels(model, data)


def graph_population(ranking: list[tuple[Any, float]]) -> np.ndarray:
    """
    Graph the fitness of a population, return the figure as a numpy array.
    For creating animated gifs of the population evolution over time.
    """

    df = pd.DataFrame(ranking, columns=["Vehicle", "Fitness"])
    df.plot.hist(bins=20)
    plt.xticks(range(0, 80, 10))
    plt.xlabel("Fitness")
    plt.yticks(range(0, 50, 10))
    plt.ylabel("Count")
    plt.legend().remove()

    buf = BytesIO()
    plt.savefig(buf, format="png")
    buf.seek(0)
    im = Image.open(
        buf,
        formats=["png"],
    )
    plt.close()

    return np.asarray(im)[:, :, :3]


def render_to_collision(
    model, data, framerate=60, camera_name="fixed", show=True
) -> list[np.ndarray]:
    renderer = mujoco.Renderer(model)
    frames: list[np.ndarray] = []
    mujoco.mj_resetData(model, data)  # Reset state and time.
    while len(data.contact) < 1:  # Render until landing
        mujoco.mj_step(model, data)
        if len(frames) < data.time * framerate:
            renderer.update_scene(data, camera_name)
            pixels = renderer.render()
            frames.append(pixels)
    if show:
        media.show_video(frames, fps=framerate)

    return frames


def render_xml_to_collision(
    world_xml: str, framerate=60, camera_name="fixed", show=True
) -> list[np.ndarray] | None:
    model = mujoco.MjModel.from_xml_string(world_xml)
    data = mujoco.MjData(model)
    renderer = mujoco.Renderer(model)
    mujoco.mj_resetData(model, data)  # Reset state and time.

    frames: list[np.ndarray] = []
    while len(data.contact) < 1:  # Render until landing
        mujoco.mj_step(model, data)
        if len(frames) < data.time * framerate:
            renderer.update_scene(data, camera_name)
            pixels = renderer.render()
            frames.append(pixels)
    if show:
        media.show_video(frames, fps=framerate)
        return None

    return frames


def render_for_time_secs(
    model, data, duration=5, framerate=60, show=True
) -> list[np.ndarray]:
    renderer = mujoco.Renderer(model)
    frames: list[np.ndarray] = []

    mujoco.mj_step(model, data)
    while data.time < duration:
        mujoco.mj_step(model, data)
        if len(frames) < data.time * framerate:
            renderer.update_scene(data)
            pixels = renderer.render()
            frames.append(pixels)
    if show:
        media.show_video(frames, fps=framerate)

    return frames


def encode_video_to_base64(frames: list[np.ndarray], framerate: int = 60) -> str:
    """
    Encode a list of frames as an mp4 video and return as base64 string.

    Args:
        frames: List of numpy arrays representing video frames
        framerate: Frames per second for the video

    Returns:
        Base64-encoded mp4 video string
    """
    import tempfile
    from base64 import b64encode

    # Write video to temporary file (mediapy expects file path, not BytesIO)
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
        tmp_path = tmp_file.name

    try:
        media.write_video(tmp_path, frames, fps=framerate, codec='h264')

        # Read the video file and encode to base64
        with open(tmp_path, 'rb') as f:
            video_bytes = f.read()
        b64_video = b64encode(video_bytes)

        return b64_video.decode('utf-8')
    finally:
        # Clean up temporary file
        import os
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
