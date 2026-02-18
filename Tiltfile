# Glider Lab – containerized local dev with Tilt
# Backend on :3356, Frontend on :3357

docker_compose("./docker/docker-compose.dev.yaml")

dc_resource(
    "backend",
    labels=["backend"],
    links=["http://localhost:3356/docs"],
)

dc_resource(
    "frontend",
    labels=["frontend"],
    links=["http://localhost:3357"],
)
