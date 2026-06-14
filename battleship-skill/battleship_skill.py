#!/usr/bin/env python3
"""
battleship_skill.py — MCP Server

Exposes a single tool: create_battleship_game
An AI agent calls this tool to generate a fully playable two-player
Battleship web game (HTML + CSS + JS) in any directory on the host machine.

Running as an MCP server:
    python battleship_skill.py

Using as a plain Python function:
    from battleship_skill import create_battleship_game
    result = create_battleship_game("/path/to/output")
    print(result)
"""

import os
import shutil
from pathlib import Path
from typing import Annotated

from mcp.server.fastmcp import FastMCP

# ── Paths ─────────────────────────────────────────────────────
SKILL_DIR     = Path(__file__).parent.resolve()
TEMPLATES_DIR = SKILL_DIR / "templates"

# ── MCP server ─────────────────────────────────────────────────
mcp = FastMCP(name="battleship-skill")

# ── Tool ───────────────────────────────────────────────────────
@mcp.tool()
def create_battleship_game(
    output_dir: Annotated[
        str,
        "Directory where the game files will be written. "
        "Created automatically if it does not exist.",
    ],
) -> str:
    """
    Create a complete two-player Battleship web game.

    Generates three files — index.html, style.css, game.js — ready to open
    in any modern browser (desktop or mobile).

    Game features
    -------------
    * 10 x 10 grid (columns 1-10, rows A-J)
    * 5 ships per player: Carrier (5), Battleship (4), Cruiser (3),
      Submarine (3), Destroyer (2)
    * Drag-and-drop ship placement on desktop; touch-drag on iOS / Android
    * Ships can be freely repositioned until the player clicks Confirm Fleet
    * Privacy transition screens prevent peeking between turns
    * Hit / miss / sunk visual feedback, fleet health bars, accuracy stats
    * Responsive layout — works on phones without any install

    Returns a human-readable summary with the created file paths and a
    command to serve the game locally.
    """
    out = Path(output_dir).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)

    if not TEMPLATES_DIR.exists():
        raise FileNotFoundError(
            f"Templates directory not found: {TEMPLATES_DIR}\n"
            "Make sure the 'templates/' folder is next to battleship_skill.py."
        )

    game_files = ("index.html", "style.css", "game.js")
    created: list[str] = []

    for fname in game_files:
        src = TEMPLATES_DIR / fname
        if not src.exists():
            raise FileNotFoundError(f"Missing template file: {src}")
        dst = out / fname
        shutil.copy2(src, dst)
        created.append(str(dst))

    index_path = out / "index.html"

    lines = [
        "Battleship game created successfully!",
        "",
        f"Output directory : {out}",
        "Files written    :",
        *[f"  {f}" for f in created],
        "",
        "── How to play ──────────────────────────────────────────",
        f"Open directly : file://{index_path}",
        f"Serve locally : python3 -m http.server 8080 --directory {out}",
        "  Then visit  : http://localhost:8080",
        "",
        "Works on any modern desktop or mobile browser.",
    ]
    return "\n".join(lines)


# ── Entry point ────────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
