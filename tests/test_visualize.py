import glider.visualization as visualization
from glider.constants import FRAME_HEIGHT, FRAME_WIDTH
from glider.vehicle import Vehicle


def test_view_vehicle():
    v = Vehicle(num_vertices=10)

    pixels = visualization.view_vehicle(v)
    assert pixels.shape == (FRAME_HEIGHT, FRAME_WIDTH, 3)
