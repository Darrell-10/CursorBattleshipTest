# Battleship Game Skill

An **MCP (Model Context Protocol) tool** that lets any AI agent generate a
fully-playable two-player Battleship web game on demand.

Give an agent access to this skill and it can create the game with a single
tool call — no code generation required.

---

## What gets generated

Three files are written to the directory you specify:

| File | Purpose |
|---|---|
| `index.html` | Game shell — four screen sections wired together |
| `style.css` | Dark naval theme, animations, responsive layout |
| `game.js` | All game logic (placement, drag-drop, battle, win detection) |

**Game features:**
- 10 × 10 grid (rows A–J, columns 1–10)
- 5 ships per player — Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Drag-and-drop ship placement on desktop; touch-drag on iOS / Android
- Ships can be repositioned freely until **Confirm Fleet** is clicked
- Privacy transition screens between turns (same-screen two-player)
- Hit / miss / sunk visual feedback, fleet health bars, shot-accuracy stats
- Fully responsive — works on phones without any install

---

## Quick start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run as MCP server (stdio transport — for Cursor, Claude Desktop, etc.)
python battleship_skill.py

# 3. Or call the function directly from Python
python - <<'EOF'
from battleship_skill import create_battleship_game
print(create_battleship_game("./my-battleship-game"))
EOF
```

---

## Using with Cursor

Add the server to your MCP config (`.cursor/mcp.json` or user settings):

```json
{
  "mcpServers": {
    "battleship-skill": {
      "command": "python",
      "args": ["/absolute/path/to/battleship-skill/battleship_skill.py"]
    }
  }
}
```

Once configured, any agent in Cursor can call `create_battleship_game` to
instantly scaffold the game.

---

## Using with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or the equivalent on your OS:

```json
{
  "mcpServers": {
    "battleship-skill": {
      "command": "python",
      "args": ["/absolute/path/to/battleship-skill/battleship_skill.py"]
    }
  }
}
```

---

## Using with the OpenAI / Anthropic API directly

The file `tool_schema.json` contains a ready-to-use function tool definition
compatible with both the OpenAI and Anthropic APIs.

### OpenAI (Python)

```python
import json, subprocess, openai
from pathlib import Path

schema = json.loads(Path("tool_schema.json").read_text())
client = openai.OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    tools=[schema],
    messages=[{"role": "user", "content": "Create a Battleship game in ./output"}],
)

# Handle the tool call
tool_call = response.choices[0].message.tool_calls[0]
args = json.loads(tool_call.function.arguments)

from battleship_skill import create_battleship_game
result = create_battleship_game(**args)
print(result)
```

### Anthropic (Python)

```python
import json, anthropic
from pathlib import Path

schema = json.loads(Path("tool_schema.json").read_text())
# Convert OpenAI schema format → Anthropic format
tool = {
    "name": schema["function"]["name"],
    "description": schema["function"]["description"],
    "input_schema": schema["function"]["parameters"],
}

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    tools=[tool],
    messages=[{"role": "user", "content": "Create a Battleship game in ./output"}],
)

# Handle the tool call
block = next(b for b in response.content if b.type == "tool_use")
from battleship_skill import create_battleship_game
result = create_battleship_game(**block.input)
print(result)
```

---

## Calling the tool

The tool accepts one parameter:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `output_dir` | string | yes | Path where the three game files are written. Created if it doesn't exist. |

**Example tool call (JSON):**

```json
{
  "name": "create_battleship_game",
  "parameters": {
    "output_dir": "./battleship-game"
  }
}
```

**Example response:**

```
Battleship game created successfully!

Output directory : /home/user/battleship-game
Files written    :
  /home/user/battleship-game/index.html
  /home/user/battleship-game/style.css
  /home/user/battleship-game/game.js

── How to play ──────────────────────────────────────────
Open directly : file:///home/user/battleship-game/index.html
Serve locally : python3 -m http.server 8080 --directory /home/user/battleship-game
  Then visit  : http://localhost:8080

Works on any modern desktop or mobile browser.
```

---

## Project layout

```
battleship-skill/
├── battleship_skill.py   # MCP server + create_battleship_game() function
├── tool_schema.json      # OpenAI / Anthropic compatible tool definition
├── requirements.txt      # Python dependencies (mcp)
├── README.md             # This file
└── templates/            # Bundled game source files
    ├── index.html
    ├── style.css
    └── game.js
```

---

## Requirements

- Python 3.10+
- `mcp >= 1.9.0` (`pip install -r requirements.txt`)
