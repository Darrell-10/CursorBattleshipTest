# CursorBattleshipTest

> A two-player Battleship web game, an MCP agent skill that generates it, and a skills portfolio — all in one repo.

---

## What's inside

| Folder | What it is | Live link |
|---|---|---|
| [`battleship/`](./battleship/) | The playable web game | [▶ Play now](https://darrell-10.github.io/CursorBattleshipTest/battleship/) |
| [`battleship-skill/`](./battleship-skill/) | MCP tool an AI agent calls to create the game | — |
| [`portfolio/`](./portfolio/) | Skills portfolio showcasing the tool | [🌐 View portfolio](https://darrell-10.github.io/CursorBattleshipTest/) |

---

## Battleship Game

A complete browser-based two-player Battleship game — no install, no server, no dependencies.

**Features**
- 10 × 10 grid · 5 ships per player (Carrier, Battleship, Cruiser, Submarine, Destroyer)
- Drag-and-drop ship placement on desktop; touch-drag on iOS & Android
- Freely reposition ships before clicking **Confirm Fleet**
- Privacy transition screens between turns (same-screen two-player)
- Hit / miss / sunk visual feedback, fleet health bars, shot-accuracy stats

**Run locally**
```bash
cd battleship
python3 -m http.server 8080
# open http://localhost:8080
```

---

## Battleship Skill (MCP Tool)

An [MCP](https://modelcontextprotocol.io) server that lets any AI agent generate the Battleship game with a single tool call.

**Use directly in Python**
```python
from battleship_skill.battleship_skill import create_battleship_game

print(create_battleship_game("./my-game"))
# → writes index.html, style.css, game.js to ./my-game
```

**Add to Cursor**
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "battleship-skill": {
      "command": "python",
      "args": ["/path/to/battleship-skill/battleship_skill.py"]
    }
  }
}
```

**Deploy to Claude Connectors Directory (MCPB)**
```bash
npm install -g @modelcontextprotocol/mcpb
cd battleship-skill
mcpb validate   # check the manifest
mcpb pack       # → battleship-skill-1.0.0.mcpb
# Submit via Claude.ai → Admin Settings → Connectors → Submit
```

See [`battleship-skill/README.md`](./battleship-skill/README.md) for full usage docs including OpenAI and Anthropic API examples.

---

## Skills Portfolio

A dark-themed web portfolio at the repo's GitHub Pages root, showcasing the Battleship skill with a demo link, source link, feature list, and quick-start code tabs.

👉 **[darrell-10.github.io/CursorBattleshipTest](https://darrell-10.github.io/CursorBattleshipTest/)**

---

## Repo structure

```
CursorBattleshipTest/
├── battleship/              # Web game (HTML + CSS + JS)
│   ├── index.html
│   ├── style.css
│   └── game.js
├── battleship-skill/        # MCP agent skill
│   ├── battleship_skill.py  #   MCP server entry point
│   ├── manifest.json        #   MCPB bundle manifest
│   ├── icon.png             #   Connectors Directory icon
│   ├── tool_schema.json     #   OpenAI / Anthropic tool definition
│   ├── requirements.txt
│   ├── README.md
│   └── templates/           #   Game files the skill copies on invocation
│       ├── index.html
│       ├── style.css
│       └── game.js
├── portfolio/               # Skills portfolio web page
│   ├── index.html
│   └── portfolio.css
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Game front-end | HTML5 · CSS3 · Vanilla JavaScript |
| MCP server | Python 3.10+ · [FastMCP](https://github.com/modelcontextprotocol/python-sdk) |
| Bundle format | MCPB 0.4 (Claude Desktop Extension) |
| Hosting | GitHub Pages (`gh-pages` branch) |
