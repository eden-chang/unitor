"""Service layer.

Functions here take an ``AsyncSession`` and a Pydantic input, perform
business logic, and return a Pydantic output. They never read settings
directly (inject what they need) and never construct sessions themselves
(callers do that). This keeps services trivially testable.
"""
