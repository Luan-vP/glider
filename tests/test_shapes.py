from glider.shapes import (
    NacaConfig,
    ParametricConfig,
    PointCloudConfig,
    ShapeConfig,
)
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
    config = PointCloudConfig.random(
        num_vertices=5, max_dim_m=3.0
    )
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
    profile = [
        [0.0, 0.0],
        [1.0, 0.0],
        [1.0, 1.0],
        [0.0, 1.0],
    ]
    vertices, faces = ShapeConfig._extrude_profile(
        profile, span=2.0
    )
    assert len(vertices) == 8
    assert all(len(v) == 3 for v in vertices)
    assert len(faces) > 0
    for face in faces:
        for idx in face:
            assert 0 <= idx < len(vertices)


# -----------------------------------------------------------
# NacaConfig tests
# -----------------------------------------------------------


def test_naca4_profile_generates_mesh():
    config = NacaConfig(
        digits="2412", span=1.0, chord=0.3
    )
    vertices, faces = config.generate_mesh()
    assert len(vertices) > 0
    assert all(len(v) == 3 for v in vertices)
    assert len(faces) > 0
    for face in faces:
        for idx in face:
            assert 0 <= idx < len(vertices)


def test_naca4_symmetric_profile():
    # Symmetric airfoil (M=0): digits "0012"
    config = NacaConfig(
        digits="0012", span=1.5, chord=0.4
    )
    vertices, faces = config.generate_mesh()
    assert len(vertices) > 0
    assert all(len(v) == 3 for v in vertices)


def test_naca5_profile_generates_mesh():
    config = NacaConfig(
        digits="23012", span=1.2, chord=0.35
    )
    vertices, faces = config.generate_mesh()
    assert len(vertices) > 0
    assert all(len(v) == 3 for v in vertices)
    assert len(faces) > 0
    for face in faces:
        for idx in face:
            assert 0 <= idx < len(vertices)


def test_naca_profile_scaled_by_chord():
    chord = 0.5
    config = NacaConfig(
        digits="2412", span=1.0, chord=chord
    )
    vertices, _ = config.generate_mesh()
    x_coords = [v[0] for v in vertices]
    # allow small floating-point margin
    assert max(x_coords) <= chord * 1.01


def test_naca_profile_extruded_to_span():
    span = 2.0
    config = NacaConfig(
        digits="2412", span=span, chord=0.3
    )
    vertices, _ = config.generate_mesh()
    z_coords = [v[2] for v in vertices]
    assert min(z_coords) == 0.0
    assert abs(max(z_coords) - span) < 1e-9


def test_naca_random_4digit():
    config = NacaConfig.random(
        naca_type=4, max_dim_m=4.5
    )
    assert isinstance(config, NacaConfig)
    assert len(config.digits) == 4
    assert config.digits.isdigit()
    vertices, faces = config.generate_mesh()
    assert len(vertices) > 0


def test_naca_random_5digit():
    config = NacaConfig.random(
        naca_type=5, max_dim_m=4.5
    )
    assert isinstance(config, NacaConfig)
    assert len(config.digits) == 5
    assert config.digits.isdigit()
    vertices, faces = config.generate_mesh()
    assert len(vertices) > 0


def test_naca_mutate_4digit():
    config = NacaConfig(
        digits="2412", span=1.0, chord=0.3
    )
    mutated = config.mutate()
    assert isinstance(mutated, NacaConfig)
    assert len(mutated.digits) == 4
    assert mutated.digits.isdigit()
    assert 0.1 <= mutated.span <= config.max_dim_m
    assert 0.05 <= mutated.chord <= config.max_dim_m / 2


def test_naca_mutate_5digit():
    config = NacaConfig(
        digits="23012", span=1.2, chord=0.35
    )
    mutated = config.mutate()
    assert isinstance(mutated, NacaConfig)
    assert len(mutated.digits) == 5
    assert mutated.digits.isdigit()


def test_naca_mutate_produces_valid_mesh():
    config = NacaConfig(
        digits="2412", span=1.0, chord=0.3
    )
    mutated = config.mutate()
    vertices, faces = mutated.generate_mesh()
    assert len(vertices) > 0
    assert len(faces) > 0


def test_naca_params_dict():
    config = NacaConfig(
        digits="2412",
        span=1.0,
        chord=0.3,
        num_profile_points=40,
    )
    params = config.params_dict()
    assert params["digits"] == "2412"
    assert params["span"] == 1.0
    assert params["chord"] == 0.3
    assert params["num_profile_points"] == 40


def test_naca_is_shape_config():
    assert issubclass(NacaConfig, ShapeConfig)


def test_vehicle_with_naca_config():
    config = NacaConfig(
        digits="2412", span=1.0, chord=0.3
    )
    vehicle = Vehicle(shape_config=config)
    body_xml, asset_xml = vehicle.xml()
    assert "vehicle-wing-mesh" in asset_xml
    assert "vehicle-wing" in body_xml


# -----------------------------------------------------------
# ParametricConfig tests
# -----------------------------------------------------------


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
        assert (
            CAMBER_POSITION_MIN
            <= cfg.camber_position
            <= CAMBER_POSITION_MAX
        )
        assert (
            MAX_THICKNESS_MIN
            <= cfg.max_thickness
            <= MAX_THICKNESS_MAX
        )
        assert SPAN_MIN <= cfg.span <= SPAN_MAX
        assert CHORD_MIN <= cfg.chord <= CHORD_MAX


def test_parametric_generate_profile_2d_shape():
    cfg = _default_parametric()
    profile = cfg._generate_profile_2d()
    assert len(profile) == 2 * cfg.num_profile_points
    for pt in profile:
        assert len(pt) == 2


def test_parametric_generate_mesh_returns_valid():
    cfg = _default_parametric()
    vertices, faces = cfg.generate_mesh()
    n_profile = 2 * cfg.num_profile_points
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
        assert (
            CAMBER_POSITION_MIN
            <= cfg.camber_position
            <= CAMBER_POSITION_MAX
        )
        assert (
            MAX_THICKNESS_MIN
            <= cfg.max_thickness
            <= MAX_THICKNESS_MAX
        )
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
    """Zero camber: upper and lower surfaces symmetric."""
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
    lower = profile[n:][::-1]
    for (xu, yu), (xl, yl) in zip(upper, lower):
        assert abs(xu - xl) < 1e-9
        assert abs(yu + yl) < 1e-9
