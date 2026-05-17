"""Config helpers."""

from __future__ import annotations

import re

from app.config import build_cors_origin_regex


def test_exact_origins_pass_through() -> None:
    exact, regex = build_cors_origin_regex(["http://localhost:5173", "https://app.unitor.app"])
    assert exact == ["http://localhost:5173", "https://app.unitor.app"]
    assert regex is None


def test_wildcard_origin_becomes_regex() -> None:
    exact, regex = build_cors_origin_regex(["https://*.vercel.app"])
    assert exact == []
    assert regex is not None
    rx = re.compile(regex)
    assert rx.match("https://my-pr-1.vercel.app")
    assert rx.match("https://abc.vercel.app")
    # Wildcard is single-label only; should not match cross-domain.
    assert not rx.match("https://evil.vercel.app.attacker.com")
    # Must use https; the literal scheme is preserved.
    assert not rx.match("http://my-pr.vercel.app")


def test_mixed_exact_and_wildcard() -> None:
    exact, regex = build_cors_origin_regex(
        ["http://localhost:5173", "https://*.vercel.app", "https://app.unitor.app"]
    )
    assert exact == ["http://localhost:5173", "https://app.unitor.app"]
    assert regex is not None
    rx = re.compile(regex)
    assert rx.match("https://staging-pr-42.vercel.app")
