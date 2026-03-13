from glider.shapes import ParametricConfig, PointCloudConfig, ShapeConfig
from glider.vehicle import Vehicle
from glider.shapes.parametric import (
    CAMBER_POSITION_MAX,
    CAMBER_POSITION_MIN,
    CHORD_MAX,
    CHORD_MIN,
    MAX_CAMBER_MAX,
    MAX_CAMBER_MIN,
    MAX_THICKNESS_MAX,
    MAX_THICKNESS_MIN,
    SPAN_MAX,
    SPAN_MIN,
)


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


# ---------------------------------------------------------------------------
# ParametricConfig tests
# ---------------------------------------------------------------------------


def _default_parametric() -> ParametricConfig:
    return ParametricConfig(
        max_camber=0.04,
        camber_position=0.4,
        max_thickness=0.12,
        span=2.0,
        chord=1.0,
        num_profile_points=20,
    )


def test_parametric_random_within_bounds():
    for _ in range(20):
        cfg = ParametricConfig.random(num_profile_points=20)
        assert MAX_CAMBER_MIN <= cfg.max_camber <= MAX_CAMBER_MAX
        assert CAMBER_POSITION_MIN <= cfg.camber_position <= CAMBER_POSITION_MAX
        assert MAX_THICKNESS_MIN <= cfg.max_thickness <= MAX_THICKNESS_MAX
        assert SPAN_MIN <= cfg.span <= SPAN_MAX
        assert CHORD_MIN <= cfg.chord <= CHORD_MAX


def test_parametric_generate_profile_2d_shape():
    cfg = _default_parametric()
    profile = cfg._generate_profile_2d()
    # Should have 2 * num_profile_points points (upper + lower, sharing LE/TE)
    assert len(profile) == 2 * cfg.num_profile_points
    for pt in profile:
        assert len(pt) == 2


def test_parametric_generate_mesh_returns_valid_vertices_and_faces():
    cfg = _default_parametric()
    vertices, faces = cfg.generate_mesh()
    n_profile = 2 * cfg.num_profile_points
    # _extrude_profile duplicates profile points at z=0 and z=span
    assert len(vertices) == 2 * n_profile
    assert all(len(v) == 3 for v in vertices)
    assert len(faces) > 0
    for face in faces:
        for idx in face:
            assert 0 <= idx < len(vertices)


def test_parametric_generate_mesh_z_extents():
    cfg = _default_parametric()
    vertices, _ = cfg.generate_mesh()
    zs = [v[2] for v in vertices]
    assert min(zs) == 0.0
    assert max(zs) == cfg.span


def test_parametric_generate_mesh_x_within_chord():
    cfg = _default_parametric()
    vertices, _ = cfg.generate_mesh()
    xs = [v[0] for v in vertices]
    # x values should be within chord bounds (allow small numerical overshoot)
    assert min(xs) >= -cfg.chord * 0.05
    assert max(xs) <= cfg.chord * 1.05


def test_parametric_mutate_returns_parametric_config():
    cfg = _default_parametric()
    mutated = cfg.mutate()
    assert isinstance(mutated, ParametricConfig)


def test_parametric_mutate_stays_within_bounds():
    cfg = _default_parametric()
    for _ in range(50):
        cfg = cfg.mutate()
        assert MAX_CAMBER_MIN <= cfg.max_camber <= MAX_CAMBER_MAX
        assert CAMBER_POSITION_MIN <= cfg.camber_position <= CAMBER_POSITION_MAX
        assert MAX_THICKNESS_MIN <= cfg.max_thickness <= MAX_THICKNESS_MAX
        assert SPAN_MIN <= cfg.span <= SPAN_MAX
        assert CHORD_MIN <= cfg.chord <= CHORD_MAX


def test_parametric_params_dict():
    cfg = _default_parametric()
    d = cfg.params_dict()
    assert d["max_camber"] == cfg.max_camber
    assert d["camber_position"] == cfg.camber_position
    assert d["max_thickness"] == cfg.max_thickness
    assert d["span"] == cfg.span
    assert d["chord"] == cfg.chord
    assert d["num_profile_points"] == cfg.num_profile_points


def test_vehicle_with_parametric_config():
    cfg = _default_parametric()
    v = Vehicle(shape_config=cfg)
    assert v.shape_config is cfg
    assert len(v.vertices) > 0
    assert len(v.faces) > 0


def test_vehicle_with_parametric_config_xml():
    cfg = _default_parametric()
    v = Vehicle(shape_config=cfg)
    body_xml, asset_xml = v.xml()
    assert "vehicle-wing-mesh" in asset_xml
    assert "vehicle-wing" in body_xml


def test_parametric_symmetric_profile_zero_camber():
    """With zero camber the upper and lower surfaces should be symmetric about y=0."""
    cfg = ParametricConfig(
        max_camber=0.0,
        camber_position=0.4,
        max_thickness=0.12,
        span=2.0,
        chord=1.0,
        num_profile_points=20,
    )
    profile = cfg._generate_profile_2d()
    n = cfg.num_profile_points
    upper = profile[:n]
    lower = profile[n:][::-1]  # reverse lower back to LE→TE order
    for (xu, yu), (xl, yl) in zip(upper, lower):
        assert abs(xu - xl) < 1e-9, "x coords should match for zero camber"
        assert abs(yu + yl) < 1e-9, "y coords should be symmetric"
