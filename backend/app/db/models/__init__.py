"""SQLAlchemy ORM models.

The schema lives in ``../../alembic/versions/`` (canonical, per ADR 0006).
These ORM models mirror the migration state so application code has typed
access to rows. When a migration adds a column, the matching model field
must land in the same PR.

Re-exports make ``from app.db.models import User, Enrollment`` work.
"""

from __future__ import annotations

from app.db.models.base import Base
from app.db.models.compatibility import CompatibilityCache
from app.db.models.enrollment import Enrollment, RosterEntry
from app.db.models.group import Group, GroupApplicationQuestion, GroupMembership
from app.db.models.profile import Profile, ProfileLink, ProfileScheduleSlot, ProfileSkill
from app.db.models.tenancy import Course, CourseSkill, Section, University
from app.db.models.user import User

__all__ = [
    "Base",
    "CompatibilityCache",
    "Course",
    "CourseSkill",
    "Enrollment",
    "Group",
    "GroupApplicationQuestion",
    "GroupMembership",
    "Profile",
    "ProfileLink",
    "ProfileScheduleSlot",
    "ProfileSkill",
    "RosterEntry",
    "Section",
    "University",
    "User",
]
