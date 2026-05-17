"""Idempotent dev seed.

Populates the demo data the UI/prototype expects:

* University of Toronto
* CSC318 (Winter 2026) with sections L0101, L0201, L0301
* The 8-skill catalog from the original prototype
* (Optional) a roster entry for you so signup works
* (Optional) a small set of placeholder classmates so Discovery has content

Usage::

    uv run python -m scripts.seed_dev                    # seed everything except your email
    uv run python -m scripts.seed_dev --email me@x.com   # also add your email to the roster
    uv run python -m scripts.seed_dev --no-classmates    # skip the placeholder roster
    uv run python -m scripts.seed_dev --reset            # wipe seeded rows first

Connects via the **session pooler** (``DATABASE_DIRECT_URL``) using the
service role so it bypasses RLS. Safe to re-run; uses ``ON CONFLICT``
to upsert.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine
from uuid_utils import uuid7

from app.config import get_settings

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

UNIVERSITY = {
    "short_name": "UofT",
    "name": "University of Toronto",
    "email_domain": "mail.utoronto.ca",
    "timezone": "America/Toronto",
}

_TORONTO = ZoneInfo("America/Toronto")
# 11:59pm Toronto on Mar 15, stored as UTC-aware datetime.
COURSE_DEADLINE = datetime(2026, 3, 15, 23, 59, 0, tzinfo=_TORONTO).astimezone(UTC)

COURSE = {
    "code": "CSC318",
    "name": "The Design of Interactive Computational Media",
    "department": "Computer Science",
    "semester": "winter-2026",
    "invite_code": "W543M7",
    "min_group_size": 4,
    "max_group_size": 6,
    "deadline_at": COURSE_DEADLINE,
    "timezone": "America/Toronto",
    "state": "active",
}

SECTIONS = ("L0101", "L0201", "L0301")

# Skill catalog from the prototype (App.tsx ≈ L817).
SKILLS = (
    ("UI Design", 0),
    ("Frontend Dev", 1),
    ("Backend", 2),
    ("User Research", 3),
    ("Prototyping", 4),
    ("Data Analysis", 5),
    ("UX Writing", 6),
    ("Project Mgmt", 7),
)

# Optional placeholder classmates so Discovery has content while we're testing.
# Names mirror the original prototype personas. Emails are throwaway addresses
# that won't actually receive mail; they exist only as roster claims.
CLASSMATES = (
    ("Jesse Nguyen", "jesse.nguyen.demo@mail.utoronto.ca", "L0201"),
    ("Priya Sharma", "priya.sharma.demo@mail.utoronto.ca", "L0101"),
    ("Marcus Lee", "marcus.lee.demo@mail.utoronto.ca", "L0101"),
    ("Aisha Khan", "aisha.khan.demo@mail.utoronto.ca", "L0301"),
    ("Sofia Rodriguez", "sofia.rodriguez.demo@mail.utoronto.ca", "L0201"),
    ("David Park", "david.park.demo@mail.utoronto.ca", "L0201"),
    ("Lisa Wang", "lisa.wang.demo@mail.utoronto.ca", "L0101"),
    ("Wei Zhang", "wei.zhang.demo@mail.utoronto.ca", "L0201"),
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@dataclass
class Ids:
    university_id: str
    course_id: str
    sections: dict[str, str]  # code -> id
    skills: dict[str, str]  # skill_name -> id


def _u7() -> str:
    """Return a UUIDv7 as a string."""
    return str(uuid7())


async def _wipe(conn: AsyncConnection) -> None:
    """Remove the seeded UofT/CSC318 rows. Cascades down to children."""
    await conn.execute(
        text(
            """
            DELETE FROM courses
            WHERE university_id IN (
                SELECT id FROM universities WHERE short_name = :u
            )
            AND code = :code
            AND semester = :sem
            """
        ),
        {"u": UNIVERSITY["short_name"], "code": COURSE["code"], "sem": COURSE["semester"]},
    )
    await conn.execute(
        text("DELETE FROM universities WHERE short_name = :u"),
        {"u": UNIVERSITY["short_name"]},
    )


async def _upsert_university(conn: AsyncConnection) -> str:
    """Insert or fetch UofT. Returns its id."""
    existing = await conn.execute(
        text("SELECT id FROM universities WHERE short_name = :s"),
        {"s": UNIVERSITY["short_name"]},
    )
    row = existing.first()
    if row:
        return str(row[0])

    new_id = _u7()
    await conn.execute(
        text(
            """
            INSERT INTO universities (id, name, short_name, email_domain, timezone)
            VALUES (:id, :name, :short_name, :email_domain, :timezone)
            """
        ),
        {"id": new_id, **UNIVERSITY},
    )
    return new_id


async def _upsert_course(conn: AsyncConnection, university_id: str) -> str:
    existing = await conn.execute(
        text(
            """
            SELECT id FROM courses
            WHERE university_id = :u AND code = :code AND semester = :sem
            """
        ),
        {"u": university_id, "code": COURSE["code"], "sem": COURSE["semester"]},
    )
    row = existing.first()
    if row:
        return str(row[0])

    new_id = _u7()
    await conn.execute(
        text(
            """
            INSERT INTO courses (
                id, university_id, code, name, department, semester, invite_code,
                min_group_size, max_group_size, deadline_at, timezone, state
            )
            VALUES (
                :id, :university_id, :code, :name, :department, :semester, :invite_code,
                :min_group_size, :max_group_size, :deadline_at, :timezone, :state
            )
            """
        ),
        {"id": new_id, "university_id": university_id, **COURSE},
    )
    return new_id


async def _upsert_sections(conn: AsyncConnection, course_id: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for code in SECTIONS:
        existing = await conn.execute(
            text("SELECT id FROM sections WHERE course_id = :c AND code = :code"),
            {"c": course_id, "code": code},
        )
        row = existing.first()
        if row:
            out[code] = str(row[0])
            continue
        new_id = _u7()
        await conn.execute(
            text(
                """
                INSERT INTO sections (id, course_id, code) VALUES (:id, :c, :code)
                """
            ),
            {"id": new_id, "c": course_id, "code": code},
        )
        out[code] = new_id
    return out


async def _upsert_skills(conn: AsyncConnection, course_id: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for name, order in SKILLS:
        existing = await conn.execute(
            text(
                """
                SELECT id FROM course_skills
                WHERE course_id = :c AND lower(skill_name) = lower(:n)
                """
            ),
            {"c": course_id, "n": name},
        )
        row = existing.first()
        if row:
            out[name] = str(row[0])
            continue
        new_id = _u7()
        await conn.execute(
            text(
                """
                INSERT INTO course_skills (id, course_id, skill_name, display_order)
                VALUES (:id, :c, :name, :order)
                """
            ),
            {"id": new_id, "c": course_id, "name": name, "order": order},
        )
        out[name] = new_id
    return out


async def _upsert_roster_entry(
    conn: AsyncConnection,
    *,
    course_id: str,
    section_id: str,
    email: str,
    name: str,
) -> None:
    existing = await conn.execute(
        text(
            """
            SELECT id FROM roster_entries
            WHERE course_id = :c AND lower(email) = lower(:e) AND removed_at IS NULL
            """
        ),
        {"c": course_id, "e": email},
    )
    if existing.first():
        return
    new_id = _u7()
    await conn.execute(
        text(
            """
            INSERT INTO roster_entries (id, course_id, section_id, email, name)
            VALUES (:id, :c, :s, :e, :n)
            """
        ),
        {"id": new_id, "c": course_id, "s": section_id, "e": email.lower(), "n": name},
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


async def seed(*, my_email: str | None, with_classmates: bool, reset: bool) -> None:
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_DIRECT_URL)

    async with engine.begin() as conn:
        if reset:
            print("[seed] --reset: wiping existing UofT/CSC318 rows…")
            await _wipe(conn)

        print("[seed] upserting university…")
        university_id = await _upsert_university(conn)

        print("[seed] upserting course (CSC318 Winter 2026)…")
        course_id = await _upsert_course(conn, university_id)

        print("[seed] upserting sections…")
        sections = await _upsert_sections(conn, course_id)

        print("[seed] upserting course_skills (8)…")
        skills = await _upsert_skills(conn, course_id)

        ids = Ids(university_id, course_id, sections, skills)

        if with_classmates:
            print(f"[seed] upserting {len(CLASSMATES)} placeholder classmates…")
            for name, email, section_code in CLASSMATES:
                await _upsert_roster_entry(
                    conn,
                    course_id=course_id,
                    section_id=sections[section_code],
                    email=email,
                    name=name,
                )

        if my_email:
            print(f"[seed] adding {my_email} to roster (section {SECTIONS[0]})…")
            await _upsert_roster_entry(
                conn,
                course_id=course_id,
                section_id=sections[SECTIONS[0]],
                email=my_email,
                name=my_email.split("@")[0],
            )

    await engine.dispose()
    print()
    print("[seed] done.")
    print(f"  university  : {ids.university_id}")
    print(f"  course      : {ids.course_id} (invite code: {COURSE['invite_code']})")
    print(f"  sections    : {', '.join(f'{c}={i}' for c, i in ids.sections.items())}")
    print(f"  skills      : {len(ids.skills)}")
    if my_email:
        print(f"  roster: {my_email} added to {SECTIONS[0]}")
    print()
    print("Next: sign up at the frontend with this email; the FastAPI bootstrap")
    print("flow (when implemented) will match the roster entry and create an")
    print("enrollment.")


def _strict_email(value: str) -> str:
    if "@" not in value or "." not in value.split("@")[-1]:
        raise argparse.ArgumentTypeError(f"not a valid email: {value!r}")
    return value


def main(argv: Iterable[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument(
        "--email",
        type=_strict_email,
        default=None,
        help="Your university email — added to the CSC318 roster so signup works.",
    )
    p.add_argument(
        "--no-classmates",
        dest="classmates",
        action="store_false",
        default=True,
        help="Skip seeding placeholder classmates (default: add 8).",
    )
    p.add_argument(
        "--reset",
        action="store_true",
        help="Wipe existing UofT/CSC318 rows before seeding.",
    )
    args = p.parse_args(list(argv) if argv is not None else None)

    try:
        asyncio.run(
            seed(
                my_email=args.email,
                with_classmates=args.classmates,
                reset=args.reset,
            )
        )
    except KeyboardInterrupt:
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
