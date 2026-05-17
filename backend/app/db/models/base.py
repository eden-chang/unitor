"""Declarative base for all ORM models."""

from __future__ import annotations

from typing import ClassVar

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Common declarative base.

    Models live in sibling modules and import from here. Naming conventions
    for constraints / indexes go on this class so Alembic auto-generation
    emits stable names.
    """

    # Stable naming for auto-generated constraints — keeps Alembic diffs clean.
    type_annotation_map: ClassVar[dict[type, type]] = {}
