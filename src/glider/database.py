from collections.abc import Generator
from typing import Any

import pymongo
from pymongo.database import Database

current_data_version = 'v1'


def get_db() -> Generator[Database[Any], None, None]:
    try:
        client: pymongo.MongoClient[Any] = pymongo.MongoClient("mongodb://mongo:27017/")
        db = client["gliders"]
        yield db
    finally:
        client.close()


def write(
    db: Database[Any],
    data: dict[str, Any],
    data_version: str = current_data_version,
) -> None:
    db[f"data-{data_version}"].insert_one(data)
