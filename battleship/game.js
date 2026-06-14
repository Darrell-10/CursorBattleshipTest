/* ================================================================
   BATTLESHIP — game.js
   Complete game logic: setup, drag-drop, battle, win detection
   ================================================================ */

// ── Constants ─────────────────────────────────────────────────
const GRID = 10;
const CELL = 40; // pixels — must match CSS --cell

const FLEET = [
  { id: 'carrier',    name: 'Carrier',    size: 5, color: '#e53935' },
  { id: 'battleship', name: 'Battleship', size: 4, color: '#fb8c00' },
  { id: 'cruiser',    name: 'Cruiser',    size: 3, color: '#43a047' },
  { id: 'submarine',  name: 'Submarine',  size: 3, color: '#8e24aa' },
  { id: 'destroyer',  name: 'Destroyer',  size: 2, color: '#1e88e5' },
];

const ROWS = 'ABCDEFGHIJ';

// ── State ─────────────────────────────────────────────────────
function mkPlayer() {
  return {
    // grid[r][c] = null | shipId
    grid: Array.from({ length: GRID }, () => Array(GRID).fill(null)),
    // ships[id] = { ...fleetEntry, row, col, ori, cells:[{r,c}], hits:Set<'r,c'> }
    ships: {},
    // keys 'r,c' of shots fired AT this player (by opponent)
    shots: new Set(),
    // set of placed ship ids
    placed: new Set(),
  };
}

function freshState() {
  return {
    phase:       'intro',    // intro | transition | setup | battle | gameover
    nextFn:      null,       // continuation after transition screen
    setupIdx:    0,          // 0-based index of player currently setting up
    atkIdx:      0,          // 0-based index of player currently attacking
    ori:         'H',        // 'H' | 'V'  ship orientation
    drag:        null,       // { shipId, grabOff }
    highlighted: [],         // [{r,c}] preview cells highlighted during drag
    selected:    null,       // {r,c} targeted cell in battle
    shotDone:    false,      // has current attacker already fired?
    players:     [mkPlayer(), mkPlayer()],
  };
}

let S = freshState();

// ── Ship helpers ──────────────────────────────────────────────
function shipCells(row, col, size, ori) {
  return Array.from({ length: size }, (_, i) => ({
    r: ori === 'H' ? row     : row + i,
    c: ori === 'H' ? col + i : col,
  }));
}

function inBounds(r, c) { return r >= 0 && r < GRID && c >= 0 && c < GRID; }

function canPlace(pi, id, row, col, ori) {
  const size = FLEET.find(s => s.id === id).size;
  const grid = S.players[pi].grid;
  for (const { r, c } of shipCells(row, col, size, ori)) {
    if (!inBounds(r, c)) return false;
    // cell occupied by a DIFFERENT ship
    if (grid[r][c] !== null && grid[r][c] !== id) return false;
  }
  return true;
}

function doPlace(pi, id, row, col, ori) {
  doRemove(pi, id); // remove previous placement if any
  const p = S.players[pi];
  const entry = FLEET.find(s => s.id === id);
  const cs = shipCells(row, col, entry.size, ori);
  p.ships[id] = { ...entry, row, col, ori, cells: cs, hits: new Set() };
  cs.forEach(({ r, c }) => { p.grid[r][c] = id; });
  p.placed.add(id);
}

function doRemove(pi, id) {
  const p = S.players[pi];
  if (!p.ships[id]) return;
  p.ships[id].cells.forEach(({ r, c }) => { p.grid[r][c] = null; });
  delete p.ships[id];
  p.placed.delete(id);
}

function doRandom(pi) {
  const p = S.players[pi];
  p.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  p.ships = {};
  p.placed = new Set();
  for (const { id } of FLEET) {
    let ok = false;
    for (let attempt = 0; attempt < 3000 && !ok; attempt++) {
      const ori = Math.random() < 0.5 ? 'H' : 'V';
      const r = Math.floor(Math.random() * GRID);
      const c = Math.floor(Math.random() * GRID);
      if (canPlace(pi, id, r, c, ori)) { doPlace(pi, id, r, c, ori); ok = true; }
    }
  }
}

// ── DOM helpers ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');
}

// Return the .cell element at (r, c) inside a board-wrap
function boardCell(boardId, r, c) {
  const rows = $(boardId).querySelectorAll('.brow');
  if (!rows[r]) return null;
  const cells = rows[r].querySelectorAll('.cell');
  return cells[c] || null;
}

// ── Board builder ─────────────────────────────────────────────
// Builds 10x10 board with row/col labels inside boardId element.
// onCellClick(r, c, cellEl) — fired on click
// onCellOver(r, c)          — fired on dragover
// onCellDrop(r, c)          — fired on drop
function buildBoard(boardId, onCellClick, onCellOver, onCellDrop) {
  const wrap = $(boardId);
  wrap.innerHTML = '';

  // Column-label header row
  const hdr = document.createElement('div');
  hdr.className = 'col-hdr';
  // blank spacer above the row-labels column
  const spc = document.createElement('div');
  spc.className = 'row-lbl';
  hdr.appendChild(spc);
  for (let c = 0; c < GRID; c++) {
    const d = document.createElement('div');
    d.className = 'col-lbl';
    d.textContent = c + 1;
    hdr.appendChild(d);
  }
  wrap.appendChild(hdr);

  // Rows
  for (let r = 0; r < GRID; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'brow';
    // Row label (A-T)
    const rl = document.createElement('div');
    rl.className = 'row-lbl';
    rl.textContent = ROWS[r];
    rowEl.appendChild(rl);

    for (let c = 0; c < GRID; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell water';
      cell.dataset.r = r;
      cell.dataset.c = c;
      if (onCellClick) cell.addEventListener('click', () => onCellClick(r, c, cell));
      if (onCellOver) {
        cell.addEventListener('dragover', e => { e.preventDefault(); onCellOver(r, c); });
      }
      if (onCellDrop) {
        cell.addEventListener('drop', e => { e.preventDefault(); onCellDrop(r, c); });
      }
      rowEl.appendChild(cell);
    }
    wrap.appendChild(rowEl);
  }

  // Clear highlight when leaving the board entirely
  wrap.addEventListener('dragleave', e => {
    if (!wrap.contains(e.relatedTarget)) clearHighlight();
  });
}

// ── Setup rendering ───────────────────────────────────────────
function renderSetupBoard() {
  const p = S.players[S.setupIdx];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = boardCell('setup-board', r, c);
      if (!cell) continue;
      const id = p.grid[r][c];
      if (id) {
        const f = FLEET.find(x => x.id === id);
        cell.className = 'cell ship';
        cell.style.setProperty('--sc', f.color);
        cell.dataset.sid = id;
        // Allow dragging from the board to reposition
        cell.draggable = true;
        cell.ondragstart = e => onBoardShipDragStart(e, id, r, c);
        cell.ondragend   = () => { clearHighlight(); S.drag = null; };
      } else {
        cell.className = 'cell water';
        cell.style.removeProperty('--sc');
        cell.draggable = false;
        cell.ondragstart = null;
        cell.ondragend   = null;
        delete cell.dataset.sid;
      }
    }
  }
}

function renderTray() {
  const p = S.players[S.setupIdx];
  const tray = $('tray-ships');
  tray.innerHTML = '';

  for (const ship of FLEET) {
    const placed = p.placed.has(ship.id);
    const item = document.createElement('div');
    item.className = 'tray-item' + (placed ? ' placed' : '');
    item.dataset.sid = ship.id;

    const lbl = document.createElement('div');
    lbl.className = 'tray-lbl';
    lbl.textContent = `${ship.name} (${ship.size})`;
    item.appendChild(lbl);

    const seg = document.createElement('div');
    seg.className = S.ori === 'H' ? 'seg-h' : 'seg-v';
    for (let i = 0; i < ship.size; i++) {
      const s = document.createElement('div');
      s.className = 'seg';
      s.style.background = ship.color;
      seg.appendChild(s);
    }
    item.appendChild(seg);

    // All tray items are draggable — placed ones are re-draggable to reposition
    item.draggable = true;
    item.addEventListener('dragstart', e => onTrayDragStart(e, ship));
    item.addEventListener('dragend', () => { clearHighlight(); S.drag = null; });
    tray.appendChild(item);
  }
}

// ── Drag-and-drop ─────────────────────────────────────────────
function onTrayDragStart(e, ship) {
  // Calculate which cell within the ship the user grabbed
  const seg = e.currentTarget.querySelector('.seg-h, .seg-v');
  if (!seg) { S.drag = { shipId: ship.id, grabOff: 0 }; return; }
  const rect = seg.getBoundingClientRect();
  const SEG = 22; // seg cell width/height including gap
  let grabOff;
  if (S.ori === 'H') {
    grabOff = Math.floor((e.clientX - rect.left) / SEG);
  } else {
    grabOff = Math.floor((e.clientY - rect.top)  / SEG);
  }
  grabOff = Math.max(0, Math.min(ship.size - 1, grabOff));
  S.drag = { shipId: ship.id, grabOff };

  // Custom ghost image that matches the board cell size
  const ghost = makeDragGhost(ship);
  document.body.appendChild(ghost);
  const ox = S.ori === 'H' ? grabOff * (CELL + 2) + CELL / 2 : CELL / 2;
  const oy = S.ori === 'H' ? CELL / 2 : grabOff * (CELL + 2) + CELL / 2;
  e.dataTransfer.setDragImage(ghost, ox, oy);
  requestAnimationFrame(() => { if (ghost.parentNode) document.body.removeChild(ghost); });

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ship.id);
}

// Drag initiated by grabbing a ship cell directly on the setup board
function onBoardShipDragStart(e, id, r, c) {
  const p = S.players[S.setupIdx];
  const ship = p.ships[id];
  if (!ship) return;

  // Adopt the stored orientation of this ship
  S.ori = ship.ori;
  $('orient-badge').textContent = S.ori === 'H' ? '→ HORIZONTAL' : '↓ VERTICAL';
  renderTray();

  // Grab offset = index of the grabbed cell within the ship
  const grabOff = S.ori === 'H' ? c - ship.col : r - ship.row;
  S.drag = { shipId: id, grabOff: Math.max(0, grabOff) };

  const ghost = makeDragGhost(FLEET.find(x => x.id === id));
  document.body.appendChild(ghost);
  const ox = S.ori === 'H' ? grabOff * (CELL + 2) + CELL / 2 : CELL / 2;
  const oy = S.ori === 'H' ? CELL / 2 : grabOff * (CELL + 2) + CELL / 2;
  e.dataTransfer.setDragImage(ghost, ox, oy);
  requestAnimationFrame(() => { if (ghost.parentNode) document.body.removeChild(ghost); });

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
}

function makeDragGhost(ship) {
  const ghost = document.createElement('div');
  ghost.style.cssText = [
    'position:absolute', 'top:-9999px', 'left:-9999px',
    `display:flex`, `flex-direction:${S.ori === 'H' ? 'row' : 'column'}`,
    'gap:2px', 'pointer-events:none',
  ].join(';');
  for (let i = 0; i < ship.size; i++) {
    const s = document.createElement('div');
    s.style.cssText = [
      `width:${CELL}px`, `height:${CELL}px`,
      `background:${ship.color}`, 'border-radius:4px',
      'border:1px solid rgba(255,255,255,.2)',
    ].join(';');
    ghost.appendChild(s);
  }
  return ghost;
}

function clearHighlight() {
  for (const { r, c } of S.highlighted) {
    const cell = boardCell('setup-board', r, c);
    if (cell) cell.classList.remove('drag-ok', 'drag-no');
  }
  S.highlighted = [];
}

function onSetupDragOver(r, c) {
  if (!S.drag) return;
  const { shipId, grabOff } = S.drag;
  const ship = FLEET.find(x => x.id === shipId);
  const startR = S.ori === 'H' ? r          : r - grabOff;
  const startC = S.ori === 'H' ? c - grabOff : c;
  const preview = shipCells(startR, startC, ship.size, S.ori);
  const ok = canPlace(S.setupIdx, shipId, startR, startC, S.ori);

  clearHighlight();
  for (const { r: pr, c: pc } of preview) {
    const cell = boardCell('setup-board', pr, pc);
    if (cell) {
      cell.classList.add(ok ? 'drag-ok' : 'drag-no');
      S.highlighted.push({ r: pr, c: pc });
    }
  }
}

function onSetupDrop(r, c) {
  if (!S.drag) return;
  const { shipId, grabOff } = S.drag;
  const ship = FLEET.find(x => x.id === shipId);
  const startR = S.ori === 'H' ? r          : r - grabOff;
  const startC = S.ori === 'H' ? c - grabOff : c;
  if (canPlace(S.setupIdx, shipId, startR, startC, S.ori)) {
    doPlace(S.setupIdx, shipId, startR, startC, S.ori);
    renderSetupBoard();
    renderTray();
    $('btn-ready').disabled = S.players[S.setupIdx].placed.size < FLEET.length;
  }
  clearHighlight();
  S.drag = null;
}

// Click a placed ship cell to lift it back to the tray without re-placing
function onSetupCellClick(r, c, cell) {
  // Ignore if we just finished a drag (dragend fires before click sometimes)
  if (S.drag) return;
  const id = cell.dataset.sid;
  if (!id) return;
  doRemove(S.setupIdx, id);
  renderSetupBoard();
  renderTray();
  $('btn-ready').disabled = S.players[S.setupIdx].placed.size < FLEET.length;
}

// ── Show setup screen ─────────────────────────────────────────
function showSetup(pi) {
  S.phase = 'setup';
  S.setupIdx = pi;
  S.ori = 'H';
  $('setup-label').textContent = `Player ${pi + 1} — Place Your Ships`;
  $('orient-badge').textContent = '→ HORIZONTAL';
  $('btn-ready').disabled = true;
  showScreen('setup');
  buildBoard('setup-board', onSetupCellClick, onSetupDragOver, onSetupDrop);
  renderSetupBoard();
  renderTray();
}

// ── Battle rendering ──────────────────────────────────────────
function renderBattleBoard() {
  const def = S.players[1 - S.atkIdx];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = boardCell('battle-board', r, c);
      if (!cell) continue;
      const key = `${r},${c}`;
      cell.className = 'cell';
      cell.style.removeProperty('--sc');

      if (def.shots.has(key)) {
        cell.classList.add('shot');
        const id = def.grid[r][c];
        if (id) {
          const ship = def.ships[id];
          cell.classList.add(ship.hits.size === ship.size ? 'sunk' : 'hit');
        } else {
          cell.classList.add('miss');
        }
      } else {
        cell.classList.add('water', 'attackable');
      }
      if (S.selected && S.selected.r === r && S.selected.c === c) {
        cell.classList.add('targeted');
      }
    }
  }
}

function renderFleetStatus() {
  const def = S.players[1 - S.atkIdx];
  const list = $('fleet-list');
  list.innerHTML = '';

  let hits = 0, misses = 0;
  for (const key of def.shots) {
    const [r, c] = key.split(',').map(Number);
    if (def.grid[r][c]) hits++; else misses++;
  }
  $('tally-hits').textContent   = `● ${hits} hit${hits !== 1 ? 's' : ''}`;
  $('tally-misses').textContent = `○ ${misses} miss${misses !== 1 ? 'es' : ''}`;

  for (const ship of FLEET) {
    const sh = def.ships[ship.id];
    const sunk = sh && sh.hits.size === ship.size;

    const item = document.createElement('div');
    item.className = `fleet-item ${sunk ? 'sunk' : 'afloat'}`;
    item.style.setProperty('--sc', ship.color);

    const name = document.createElement('div');
    name.className = 'fi-name';
    name.textContent = ship.name;
    item.appendChild(name);

    const bar = document.createElement('div');
    bar.className = 'fi-bar';
    for (let i = 0; i < ship.size; i++) {
      const seg = document.createElement('div');
      seg.className = 'fi-seg';
      if (sh) {
        const k = `${sh.cells[i].r},${sh.cells[i].c}`;
        if (sh.hits.has(k)) seg.classList.add('damaged');
      }
      bar.appendChild(seg);
    }
    item.appendChild(bar);
    list.appendChild(item);
  }
}

function onBattleCellClick(r, c) {
  if (S.shotDone) return;
  const def = S.players[1 - S.atkIdx];
  const key = `${r},${c}`;
  if (def.shots.has(key)) return; // already fired here

  S.selected = { r, c };
  $('target-coord').textContent = `${ROWS[r]}${c + 1}`;
  $('btn-fire').disabled = false;
  renderBattleBoard();
}

// ── Show battle screen ────────────────────────────────────────
function showBattle(pi) {
  S.phase     = 'battle';
  S.atkIdx    = pi;
  S.selected  = null;
  S.shotDone  = false;

  $('battle-label').textContent = `Player ${pi + 1}'s Turn — Choose Your Target`;
  $('battle-feedback').textContent = '';
  $('battle-feedback').className = 'battle-feedback';
  $('target-coord').textContent = '—';
  $('btn-fire').disabled = true;
  $('btn-fire').classList.remove('hidden');
  $('btn-endturn').classList.add('hidden');
  $('turn-result').textContent = '';

  showScreen('battle');
  buildBoard('battle-board', (r, c, cell) => onBattleCellClick(r, c), null, null);
  renderBattleBoard();
  renderFleetStatus();
}

// ── Fire ──────────────────────────────────────────────────────
function doFire() {
  if (!S.selected || S.shotDone) return;
  const { r, c } = S.selected;
  const def = S.players[1 - S.atkIdx];
  const key = `${r},${c}`;

  def.shots.add(key);
  S.shotDone = true;

  const id = def.grid[r][c];
  let resultClass, msg;

  if (id) {
    const ship = def.ships[id];
    ship.hits.add(key);
    if (ship.hits.size === ship.size) {
      resultClass = 'sunk';
      msg = `💥 YOU SUNK THE ${ship.name.toUpperCase()}!`;
    } else {
      resultClass = 'hit';
      msg = `🎯 HIT! — ${ROWS[r]}${c + 1}`;
    }
  } else {
    resultClass = 'miss';
    msg = `💧 Miss — ${ROWS[r]}${c + 1}`;
  }

  const fb = $('battle-feedback');
  fb.textContent = msg;
  fb.className = `battle-feedback ${resultClass}`;
  $('turn-result').textContent = msg;

  $('btn-fire').classList.add('hidden');
  $('btn-endturn').classList.remove('hidden');

  renderBattleBoard();
  renderFleetStatus();

  // Win check
  const allSunk = Object.values(def.ships).every(s => s.hits.size === s.size);
  if (allSunk) setTimeout(() => showGameOver(S.atkIdx), 900);
}

// ── Transition screen ─────────────────────────────────────────
function goTransition(icon, title, msg, fn) {
  S.phase  = 'transition';
  S.nextFn = fn;
  $('tr-icon').textContent  = icon;
  $('tr-title').textContent = title;
  $('tr-msg').textContent   = msg;
  showScreen('transition');
}

// ── Game over ─────────────────────────────────────────────────
function showGameOver(winnerIdx) {
  S.phase = 'gameover';
  const def = S.players[1 - winnerIdx];
  let totalHits = 0;
  const totalShots = def.shots.size;
  for (const key of def.shots) {
    const [r, c] = key.split(',').map(Number);
    if (def.grid[r][c]) totalHits++;
  }
  const acc = totalShots > 0 ? Math.round(totalHits / totalShots * 100) : 0;

  $('go-title').textContent = `Player ${winnerIdx + 1} Wins! 🏆`;
  $('go-sub').textContent   = `All of Player ${2 - winnerIdx}'s ships have been sunk!`;
  $('go-stats').innerHTML = `
    <div class="stat"><span class="sval">${totalShots}</span><span class="slbl">Shots Fired</span></div>
    <div class="stat"><span class="sval">${totalHits}</span><span class="slbl">Hits</span></div>
    <div class="stat"><span class="sval">${totalShots - totalHits}</span><span class="slbl">Misses</span></div>
    <div class="stat"><span class="sval">${acc}%</span><span class="slbl">Accuracy</span></div>
  `;
  showScreen('gameover');
}

// ── Event wiring ──────────────────────────────────────────────

// Intro → setup
$('btn-start').addEventListener('click', () =>
  goTransition('🚢', 'Player 1 — Get Ready!',
    'You are about to place your fleet.\nKeep your positions secret from Player 2!',
    () => showSetup(0))
);

// Transition continue
$('btn-continue').addEventListener('click', () => {
  if (S.nextFn) { const fn = S.nextFn; S.nextFn = null; fn(); }
});

// Rotate
$('btn-rotate').addEventListener('click', () => {
  S.ori = S.ori === 'H' ? 'V' : 'H';
  $('orient-badge').textContent = S.ori === 'H' ? '→ HORIZONTAL' : '↓ VERTICAL';
  renderTray();
});

// R key shortcut for rotate (setup screen only)
document.addEventListener('keydown', e => {
  if (S.phase === 'setup' && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
    $('btn-rotate').click();
  }
});

// Random placement
$('btn-random').addEventListener('click', () => {
  doRandom(S.setupIdx);
  renderSetupBoard();
  renderTray();
  $('btn-ready').disabled = false;
});

// Clear board
$('btn-clear').addEventListener('click', () => {
  const p = S.players[S.setupIdx];
  p.grid   = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  p.ships  = {};
  p.placed = new Set();
  renderSetupBoard();
  renderTray();
  $('btn-ready').disabled = true;
});

// Ready → pass to player 2 or start battle
$('btn-ready').addEventListener('click', () => {
  if (S.setupIdx === 0) {
    goTransition('🔒', 'Fleet Deployed!',
      "Pass the device to Player 2.\nDon't let them see your ship positions!",
      () => goTransition('🚢', 'Player 2 — Get Ready!',
        'You are about to place your fleet.\nKeep your positions secret!',
        () => showSetup(1))
    );
  } else {
    goTransition('⚔️', 'Battle Begins!',
      'Both fleets are in position.\nPass the device to Player 1 to open fire!',
      () => showBattle(0)
    );
  }
});

// Fire
$('btn-fire').addEventListener('click', doFire);

// End turn → transition to next player's attack
$('btn-endturn').addEventListener('click', () => {
  const next = 1 - S.atkIdx;
  goTransition('🔄', `Player ${S.atkIdx + 1}'s Turn is Over`,
    `Pass the device to Player ${next + 1}.\nDon't show them the current board!`,
    () => showBattle(next)
  );
});

// Play again
$('btn-again').addEventListener('click', () => {
  S = freshState();
  showScreen('intro');
});

// ── Boot ──────────────────────────────────────────────────────
showScreen('intro');
