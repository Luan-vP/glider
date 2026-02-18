import json

import pytest
from fastapi.testclient import TestClient

from glider.serving.schema import GenerationResult
from glider.serving.server import app


@pytest.fixture
def client():
    return TestClient(app)


def test_evolution_run_endpoint(client):
    """Test the POST /evolution/run endpoint with a small population."""
    # Small population for faster testing
    request_data = {
        "population_size": 5,
        "num_generations": 2,
        "survival_weight": 0.3,
        "cloning_weight": 0.4,
        "max_dim_m": 4.5,
        "pilot": False,
        "mass_kg": None,
        "wing_density": None,
    }

    response = client.post("/evolution/run", json=request_data)

    # Verify response status and content type
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    # Parse SSE events
    events = []
    for line in response.text.split("\n\n"):
        if line.startswith("data: "):
            json_data = line[6:]  # Remove "data: " prefix
            events.append(json.loads(json_data))

    # Verify we received the expected number of events
    assert len(events) == 2, f"Expected 2 events, got {len(events)}"

    # Verify each event is a valid GenerationResult
    for i, event_data in enumerate(events):
        result = GenerationResult(**event_data)
        assert result.generation == i
        assert isinstance(result.best_fitness, float)
        assert result.best_fitness > 0
        assert isinstance(result.avg_fitness, float)
        assert result.avg_fitness > 0
        assert result.best_vehicle is not None
        assert len(result.population_fitness) == 5


def test_evolution_run_with_pilot(client):
    """Test evolution endpoint with pilot enabled."""
    request_data = {
        "population_size": 3,
        "num_generations": 1,
        "pilot": True,
    }

    response = client.post("/evolution/run", json=request_data)
    assert response.status_code == 200

    # Parse SSE event
    events = []
    for line in response.text.split("\n\n"):
        if line.startswith("data: "):
            json_data = line[6:]
            events.append(json.loads(json_data))

    assert len(events) == 1
    result = GenerationResult(**events[0])
    assert result.generation == 0
    assert result.best_vehicle.pilot is True


def test_evolution_run_default_parameters(client):
    """Test evolution endpoint with default parameters."""
    # Only override population and generations for faster testing
    request_data = {
        "population_size": 4,
        "num_generations": 1,
    }

    response = client.post("/evolution/run", json=request_data)
    assert response.status_code == 200

    # Verify defaults were applied
    events = []
    for line in response.text.split("\n\n"):
        if line.startswith("data: "):
            json_data = line[6:]
            events.append(json.loads(json_data))

    assert len(events) == 1
    result = GenerationResult(**events[0])
    assert result.best_vehicle.pilot is False
    assert len(result.population_fitness) == 4
