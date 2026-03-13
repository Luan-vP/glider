from glider.shapes import PointCloudConfig, ShapeConfig
from glider.vehicle import Vehicle


def test_shape_config_is_abstract():
    assert issubclass(PointCloudConfig, ShapeConfig)


def test_point_cloud_random():
    config = PointCloudConfig.random(num_vertices=10, max_dim_m=2.0)
    assert isinstance(config, PointCloudConfig)
    assert len(config.vertices) == 10
    assert config.max_dim_m == 2.0


def test_point_cloud_generate_mesh():
    config = PointCloudConfig.random(num_vertices=8)
    vertices, faces = config.generate_mesh()
    assert len(vertices) == 8
    assert faces == []
    for v in vertices:
        assert len(v) == 3


def test_point_cloud_mutate():
    config = PointCloudConfig.random(num_vertices=8)
    mutated = config.mutate()
    assert isinstance(mutated, PointCloudConfig)
    assert len(mutated.vertices) == len(config.vertices)


def test_point_cloud_params_dict():
    config = PointCloudConfig.random(num_vertices=5, max_dim_m=3.0)
    params = config.params_dict()
    assert "vertices" in params
    assert "max_dim_m" in params
    assert params["max_dim_m"] == 3.0


def test_vehicle_with_shape_config():
    config = PointCloudConfig.random(num_vertices=10)
    vehicle = Vehicle(shape_config=config)
    assert len(vehicle.vertices) == 10
    assert vehicle.shape_config is config


def test_vehicle_shape_config_xml():
    config = PointCloudConfig.random(num_vertices=10)
    vehicle = Vehicle(shape_config=config)
    body_xml, asset_xml = vehicle.xml()
    assert "vehicle-wing-mesh" in asset_xml
    assert "vehicle-wing" in body_xml


def test_vehicle_shape_config_mutate():
    config = PointCloudConfig.random(num_vertices=8)
    vehicle = Vehicle(shape_config=config)
    new_vertices = vehicle.mutate()
    assert len(new_vertices) == len(vehicle.vertices)


def test_extrude_profile():
    profile = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
    vertices, faces = ShapeConfig._extrude_profile(profile, span=2.0)
    assert len(vertices) == 8
    assert all(len(v) == 3 for v in vertices)
    assert len(faces) > 0
    for face in faces:
        for idx in face:
            assert 0 <= idx < len(vertices)
