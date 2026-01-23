import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const Icon = ({ label, children, className }) => (
  <span
    className={`inline-flex items-center justify-center ${className || ''}`}
    aria-hidden="true"
    title={label}
  >
    {children}
  </span>
);

const Grid = (props) => <Icon {...props}>🟦</Icon>;
const Box = (props) => <Icon {...props}>📦</Icon>;
const Printer = (props) => <Icon {...props}>🖨️</Icon>;
const RefreshCw = (props) => <Icon {...props}>🔄</Icon>;
const Scissors = (props) => <Icon {...props}>✂️</Icon>;
const Plus = (props) => <Icon {...props}>➕</Icon>;
const Trash2 = (props) => <Icon {...props}>🗑️</Icon>;
const RotateCcw = (props) => <Icon {...props}>🔁</Icon>;
const MousePointer2 = (props) => <Icon {...props}>🖱️</Icon>;
const ArrowRight = (props) => <Icon {...props}>➡️</Icon>;
const Calculator = (props) => <Icon {...props}>🧮</Icon>;
const CheckCircle2 = (props) => <Icon {...props}>✅</Icon>;
const AlertCircle = (props) => <Icon {...props}>⚠️</Icon>;
const Move = (props) => <Icon {...props}>↔️</Icon>;

const FlooringCalculator = () => {
  // --- STATE ---

  // Global Settings
  const [unitSystem, setUnitSystem] = useState('imperial'); // 'imperial' or 'metric'
  const [direction, setDirection] = useState('horizontal'); // 'horizontal' or 'vertical'
  const [seed, setSeed] = useState(0); // Seed for random generation
  const [showCutList, setShowCutList] = useState(false);

  // Dimensions (Always stored in INCHES internally)
  const [roomDims, setRoomDims] = useState({ w: 144, l: 192 }); // 12x16 ft default

  // Material Defaults (Inches)
  const [plank, setPlank] = useState({
    width: 7,
    length: 48,
    sqFtPerBox: 20,
    pricePerSqFt: 3.5,
  });

  // Configuration
  const [settings, setSettings] = useState({
    gap: 0.25,
    pattern: 'random', // random, chaos, staggered, grid
    minPlankLength: 6,
    minSliver: 3,
    wasteFactor: 10,
  });

  // Obstacles: { id, w, l, x, y, type: 'island' | 'cutout' }
  // 'island' = object in room (island, cabinet)
  // 'cutout' = structural void (creates L-shapes, hallways)
  const [obstacles, setObstacles] = useState([]);

  // Interaction State
  const [draggingId, setDraggingId] = useState(null);
  const svgRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Output Data
  const [layout, setLayout] = useState([]);
  const [stats, setStats] = useState({
    netSqFt: 0,
    wasteSqFt: 0,
    totalNeeded: 0,
    boxesNeeded: 0,
    totalCost: 0,
  });
  const [optimization, setOptimization] = useState(null);

  // --- HELPERS ---

  const toDisplay = (inches, type) => {
    if (unitSystem === 'imperial') {
      if (type === 'area') return (inches / 144).toFixed(2);
      return (inches / 12).toFixed(2) + "'";
    }
    if (type === 'area') return (inches / 1550).toFixed(2);
    return (inches * 0.0254).toFixed(2) + 'm';
  };

  // --- COLLISION ENGINE ---

  const getObstaclesInRow = (rowY, rowHeight, obstaclesList, isVert, roomWidth) => {
    // Find all obstacles that intersect with this specific row's Y-band
    // If vertical, we are scanning X-bands really, but the logic abstracts this
    const rowStart = rowY;
    const rowEnd = rowY + rowHeight;

    // Filter obstacles that vertically overlap this row
    const relevant = obstaclesList.filter((obs) => {
      // Transform obstacle coords to logical coords based on direction
      const obsY = isVert ? obs.x : obs.y;
      const obsH = isVert ? obs.w : obs.l;
      return obsY < rowEnd && obsY + obsH > rowStart;
    });

    // Sort by their position along the row (X axis)
    return relevant
      .map((obs) => ({
        start: isVert ? obs.y : obs.x,
        end: (isVert ? obs.y : obs.x) + (isVert ? obs.l : obs.w),
        type: obs.type,
      }))
      .sort((a, b) => a.start - b.start);
  };

  const calculateLayout = () => {
    const isVert = direction === 'vertical';
    // Logical dimensions (Width is always the dimension ALONG the planks)
    const roomW = isVert ? roomDims.l : roomDims.w;
    const roomL = isVert ? roomDims.w : roomDims.l;

    const pW = parseFloat(plank.width);
    const pL = parseFloat(plank.length);
    const gap = parseFloat(settings.gap);
    const minLen = parseFloat(settings.minPlankLength);
    const minSliver = parseFloat(settings.minSliver);

    const rows = [];
    let currentY = gap;
    let remainder = 0;

    // We iterate rows down the Logical Height
    while (currentY < roomL - gap) {
      const rowPlanks = [];
      const rowHeight = pW;

      // Get obstacles obstructing this specific row
      const rowObstacles = getObstaclesInRow(currentY, rowHeight, obstacles, isVert, roomW);

      // Define the "Active Zones" for this row.
      // A standard room has 1 zone: [Gap -> RoomWidth-Gap]
      // An island splits it into 2 zones: [Gap -> IslandLeft] and [IslandRight -> RoomWidth-Gap]
      const zones = [];
      let cursor = gap;

      if (rowObstacles.length === 0) {
        zones.push({ start: gap, end: roomW - gap });
      } else {
        rowObstacles.forEach((obs) => {
          // Add zone before obstacle
          if (obs.start > cursor) {
            zones.push({ start: cursor, end: Math.min(obs.start, roomW - gap) });
          }
          // Move cursor past obstacle
          cursor = Math.max(cursor, obs.end);
        });
        // Add final zone after last obstacle
        if (cursor < roomW - gap) {
          zones.push({ start: cursor, end: roomW - gap });
        }
      }

      // Process each Zone
      zones.forEach((zone) => {
        let currentX = zone.start;
        const zoneWidth = zone.end - zone.start;

        if (zoneWidth < minLen) return; // Skip tiny zones

        // --- LOGIC: ROW STARTING PIECE ---
        let startLength = pL;

        if (settings.pattern === 'grid') {
          startLength = pL;
        } else if (settings.pattern === 'staggered') {
          // Check global row index if possible, otherwise alt based on something else
          startLength = rows.length % 2 === 0 ? pL : pL / 2;
        } else if (settings.pattern === 'chaos') {
          startLength = Math.max(minLen, Math.random() * pL);
        } else {
          // 'random' (Pro Mode): Reuse remainder from previous row (or previous zone!)
          startLength = remainder > minLen ? remainder : pL;
          remainder = 0; // Consumed
        }

        // --- LOGIC: SLIVER PREVENTION ---
        // Determine if we need to shift the pattern to avoid a tiny piece at the end of THIS zone
        const firstPieceSpace = Math.min(startLength, zoneWidth);
        const remainingAfterFirst = zoneWidth - firstPieceSpace;
        const numFullPlanksAfter = Math.floor(remainingAfterFirst / pL);
        const theoreticalLastPiece = remainingAfterFirst - numFullPlanksAfter * pL;

        if (theoreticalLastPiece > 0 && theoreticalLastPiece < minSliver) {
          startLength = Math.max(minLen, startLength - minSliver);
        }

        // --- FILL ZONE ---
        let currentPlankLength = startLength;

        while (currentX < zone.end) {
          const spaceRemaining = zone.end - currentX;
          let actualLen = currentPlankLength;
          let isCut = false;

          if (actualLen >= spaceRemaining - 0.01) {
            // Epsilon for float math
            actualLen = spaceRemaining;
            isCut = true;
            // Save remainder for next zone/row
            if (settings.pattern === 'random') {
              remainder = currentPlankLength - actualLen;
            }
          }

          rowPlanks.push({
            x: isVert ? currentY : currentX,
            y: isVert ? currentX : currentY,
            width: isVert ? pW : actualLen,
            height: isVert ? actualLen : pW,
            isCut: isCut,
            isHorizontal: !isVert,
            rawWidth: actualLen,
          });

          currentX += actualLen;
          currentPlankLength = pL; // Reset to full plank
        }
      });

      rows.push(rowPlanks);
      currentY += pW;
    }

    setLayout(rows);
    calculateStats(rows);
  };

  // --- STATS & OPTIMIZATION ---

  const calculateStats = (generatedRows) => {
    const roomSqIn = roomDims.w * roomDims.l;

    // Obstacles Area
    let obstacleSqIn = 0;
    obstacles.forEach((obs) => {
      obstacleSqIn += obs.w * obs.l;
    });

    const netSqFt = (roomSqIn - obstacleSqIn) / 144;
    const wasteSqFt = netSqFt * (settings.wasteFactor / 100);
    const totalNeeded = netSqFt + wasteSqFt;
    const boxes = Math.ceil(totalNeeded / plank.sqFtPerBox);
    const cost = totalNeeded * plank.pricePerSqFt;

    setStats({
      netSqFt: netSqFt.toFixed(2),
      wasteSqFt: wasteSqFt.toFixed(2),
      totalNeeded: totalNeeded.toFixed(2),
      boxesNeeded: boxes,
      totalCost: cost.toFixed(2),
    });

    // Run Optimization (Bin Packing Estimate)
    runOptimization(generatedRows);
  };

  const runOptimization = (rows) => {
    // Collect all required segment lengths from the layout
    const segments = [];
    rows.forEach((row) => {
      row.forEach((p) => segments.push(p.rawWidth));
    });

    // Simple Greedy Bin Packing (First Fit Decreasing)
    // 1. Sort pieces largest to smallest
    segments.sort((a, b) => b - a);

    const bins = []; // Each bin is a full plank length
    const plankLen = parseFloat(plank.length);

    segments.forEach((seg) => {
      // Try to find a bin with space
      let placed = false;
      for (const b of bins) {
        if (b.remaining >= seg) {
          b.remaining -= seg;
          b.parts.push(seg);
          placed = true;
          break;
        }
      }
      // Else create new bin
      if (!placed) {
        bins.push({ remaining: plankLen - seg, parts: [seg] });
      }
    });

    const optimizedBoxes = Math.ceil(
      (bins.length * plank.width * plank.length) / 144 / plank.sqFtPerBox
    );

    setOptimization({
      planksUsed: bins.length,
      optimizedBoxes: optimizedBoxes,
      efficiency: (
        (segments.reduce((a, b) => a + b, 0) / (bins.length * plankLen)) *
        100
      ).toFixed(1),
    });
  };

  useEffect(() => {
    calculateLayout();
  }, [roomDims, plank, settings, obstacles, direction, unitSystem, seed]);

  // --- INTERACTION HANDLERS ---

  const addObstacle = (type) => {
    // Smart placement: find a spot or default to center
    const size = type === 'cutout' ? 48 : 24;
    setObstacles([
      ...obstacles,
      {
        id: Date.now(),
        w: size,
        l: size,
        x: 12,
        y: 12,
        type: type, // 'island' or 'cutout'
        name: type === 'cutout' ? 'Corner Cut' : 'Island',
      },
    ]);
  };

  const updateObstacle = (id, updates) => {
    setObstacles((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const handleMouseDown = (e, id) => {
    e.preventDefault();
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;

    // Calculate offset from top-left of obstacle
    // We need to convert mouse screen coords to SVG coords
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = roomDims.w / svgRect.width;
    const scaleY = roomDims.l / svgRect.height;

    const mouseX = (e.clientX - svgRect.left) * scaleX;
    const mouseY = (e.clientY - svgRect.top) * scaleY;

    dragOffset.current = {
      x: mouseX - obs.x,
      y: mouseY - obs.y,
    };

    setDraggingId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = roomDims.w / svgRect.width;
    const scaleY = roomDims.l / svgRect.height;

    const mouseX = (e.clientX - svgRect.left) * scaleX;
    const mouseY = (e.clientY - svgRect.top) * scaleY;

    let newX = mouseX - dragOffset.current.x;
    let newY = mouseY - dragOffset.current.y;

    // Snap to grid (1 inch)
    newX = Math.round(newX);
    newY = Math.round(newY);

    updateObstacle(draggingId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const presetLShape = () => {
    setRoomDims({ w: 144, l: 144 });
    setObstacles([
      {
        id: Date.now(),
        type: 'cutout',
        x: 72,
        y: 0,
        w: 72,
        l: 72,
        name: 'L-Cut',
      },
    ]);
  };

  // --- RENDER SCALING ---
  const viewWidth = 800;
  const scale = viewWidth / Math.max(roomDims.w, roomDims.l, 1);

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col xl:flex-row print:bg-white"
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Styles for Printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          .print-break { page-break-before: always; }
          .hide-scroll { overflow: visible !important; height: auto !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* --- SIDEBAR (Controls) --- */}
      <div className="w-full xl:w-96 bg-white border-r border-slate-200 h-auto xl:h-screen overflow-y-auto p-6 shadow-xl z-20 no-print">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Grid className="w-5 h-5" /> FloorPlanner Pro
          </h1>
          <button
            onClick={() => setUnitSystem((prev) => (prev === 'imperial' ? 'metric' : 'imperial'))}
            className="text-xs font-bold px-2 py-1 bg-slate-100 rounded border hover:bg-slate-200"
          >
            {unitSystem === 'imperial' ? 'FT/IN' : 'METRIC'}
          </button>
        </div>

        {/* 1. ROOM DIMS */}
        <div className="mb-6 border-b pb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            1. Room Shape
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Max Width ({unitSystem === 'metric' ? 'm' : 'ft'})
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border rounded text-sm"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setRoomDims((p) => ({
                    ...p,
                    w: unitSystem === 'metric' ? val * 39.37 : val * 12,
                  }));
                }}
                value={
                  unitSystem === 'metric'
                    ? (roomDims.w / 39.37).toFixed(2)
                    : (roomDims.w / 12).toFixed(2)
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Max Length ({unitSystem === 'metric' ? 'm' : 'ft'})
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border rounded text-sm"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setRoomDims((p) => ({
                    ...p,
                    l: unitSystem === 'metric' ? val * 39.37 : val * 12,
                  }));
                }}
                value={
                  unitSystem === 'metric'
                    ? (roomDims.l / 39.37).toFixed(2)
                    : (roomDims.l / 12).toFixed(2)
                }
              />
            </div>
          </div>

          {/* Special Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={presetLShape}
              className="flex-1 py-2 bg-slate-100 border rounded text-xs font-bold hover:bg-slate-200"
            >
              Preset: L-Shape
            </button>
            <button
              onClick={() => setRoomDims({ w: 120, l: 120 })}
              className="flex-1 py-2 bg-slate-100 border rounded text-xs font-bold hover:bg-slate-200"
            >
              Preset: Square
            </button>
          </div>

          {/* Obstacles Control */}
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => addObstacle('island')}
                className="flex-1 py-2 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded font-bold flex items-center justify-center gap-1 hover:bg-blue-100"
              >
                <Plus className="w-3 h-3" /> Add Island
              </button>
              <button
                onClick={() => addObstacle('cutout')}
                className="flex-1 py-2 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded font-bold flex items-center justify-center gap-1 hover:bg-slate-200"
              >
                <Plus className="w-3 h-3" /> Add Cutout
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mb-2 italic flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Drag boxes on diagram to position
            </p>

            {obstacles.map((obs, idx) => (
              <div
                key={obs.id}
                className="bg-slate-50 p-2 rounded mt-2 border text-xs group hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        obs.type === 'cutout' ? 'bg-slate-400' : 'bg-red-400'
                      }`}
                    ></div>
                    <span className="font-bold text-slate-500">
                      #{idx + 1} {obs.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setObstacles(obstacles.filter((o) => o.id !== obs.id))}
                    className="text-red-400 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block">W (in)</label>
                    <input
                      type="number"
                      value={obs.w}
                      onChange={(e) =>
                        updateObstacle(obs.id, { w: parseFloat(e.target.value) })
                      }
                      className="p-1 border rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">L (in)</label>
                    <input
                      type="number"
                      value={obs.l}
                      onChange={(e) =>
                        updateObstacle(obs.id, { l: parseFloat(e.target.value) })
                      }
                      className="p-1 border rounded w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. MATERIAL */}
        <div className="mb-6 border-b pb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            2. Material
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Width ({unitSystem === 'metric' ? 'mm' : 'in'})
              </label>
              <input
                type="number"
                value={unitSystem === 'metric' ? (plank.width * 25.4).toFixed(0) : plank.width}
                onChange={(e) =>
                  setPlank({
                    ...plank,
                    width: unitSystem === 'metric' ? e.target.value / 25.4 : e.target.value,
                  })
                }
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Length ({unitSystem === 'metric' ? 'mm' : 'in'})
              </label>
              <input
                type="number"
                value={unitSystem === 'metric' ? (plank.length * 25.4).toFixed(0) : plank.length}
                onChange={(e) =>
                  setPlank({
                    ...plank,
                    length: unitSystem === 'metric' ? e.target.value / 25.4 : e.target.value,
                  })
                }
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Sq{unitSystem === 'metric' ? 'm' : 'Ft'} / Box
              </label>
              <input
                type="number"
                value={plank.sqFtPerBox}
                onChange={(e) => setPlank({ ...plank, sqFtPerBox: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">
                Price / Sq{unitSystem === 'metric' ? 'm' : 'Ft'}
              </label>
              <input
                type="number"
                value={plank.pricePerSqFt}
                onChange={(e) => setPlank({ ...plank, pricePerSqFt: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* 3. CONFIGURATION */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            3. Configuration
          </h2>

          <div className="space-y-4">
            <button
              onClick={() => setDirection((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'))}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 border rounded hover:bg-slate-200 text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" /> Direction: {direction.toUpperCase()}
            </button>

            <div>
              <label className="text-[10px] font-bold block mb-1">Pattern</label>
              <div className="flex gap-2">
                <select
                  value={settings.pattern}
                  onChange={(e) => setSettings({ ...settings, pattern: e.target.value })}
                  className="flex-1 p-2 border rounded bg-white text-sm"
                >
                  <option value="random">Pro Random (Standard)</option>
                  <option value="chaos">Chaos (True Random)</option>
                  <option value="staggered">Brick / 50% Stagger</option>
                  <option value="grid">Grid / Stacked</option>
                </select>
                <button
                  onClick={() => setSeed((s) => s + 1)}
                  className="p-2 border rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Regenerate Layout"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold block mb-1 text-red-500">
                  Min Cut Size (in)
                </label>
                <input
                  type="number"
                  value={settings.minSliver}
                  onChange={(e) => setSettings({ ...settings, minSliver: e.target.value })}
                  className="w-full p-2 border border-red-100 bg-red-50 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold block mb-1">Waste Factor %</label>
                <input
                  type="number"
                  value={settings.wasteFactor}
                  onChange={(e) => setSettings({ ...settings, wasteFactor: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => window.print()}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" /> Export / Print Plan
        </button>
      </div>

      {/* --- MAIN PREVIEW AREA --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Stats Bar */}
        <div className="bg-white border-b p-4 flex flex-wrap gap-6 items-center justify-between shadow-sm z-10 no-print">
          <div className="flex gap-8 items-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Area</div>
              <div className="text-lg font-bold text-slate-800">
                {unitSystem === 'metric'
                  ? (stats.netSqFt / 10.764).toFixed(2)
                  : stats.netSqFt}{' '}
                <span className="text-xs text-slate-400">
                  {unitSystem === 'metric' ? 'm²' : 'sq ft'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Boxes Needed</div>
              <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                {stats.boxesNeeded} <Box className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Cost</div>
              <div className="text-lg font-bold text-green-600">${stats.totalCost}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCutList(!showCutList)}
              className={`text-xs px-3 py-2 rounded font-bold border flex items-center gap-2 transition-colors ${
                showCutList
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Scissors className="w-4 h-4" /> {showCutList ? 'Hide Cut List' : 'Show Cut List'}
            </button>
          </div>
        </div>

        {/* Main Content Scroll Area */}
        <div className="flex-1 bg-slate-200 overflow-auto relative p-4 flex flex-col items-center hide-scroll">
          {/* OPTIMIZER PANEL (Material Saver) */}
          {optimization && (
            <div className="w-full max-w-4xl bg-white p-4 rounded-lg shadow-sm border border-indigo-100 mb-6 flex flex-col md:flex-row gap-6 items-center no-print">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4" /> Material Optimizer
                </h3>
                <p className="text-xs text-slate-500">
                  We compared your layout (Flow method) against a perfect mathematical cut (Bin
                  Packing).
                </p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase">Current Layout</div>
                  <div className="text-xl font-bold text-slate-700">{stats.boxesNeeded} Boxes</div>
                  <div className="text-[10px] text-slate-400">Consistent flow</div>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-xs text-indigo-400 font-bold uppercase">Theoretical Min</div>
                  <div className="text-xl font-bold text-indigo-600">
                    {optimization.optimizedBoxes} Boxes
                  </div>
                  <div className="text-[10px] text-indigo-300">Using every scrap</div>
                </div>
                <div className="h-10 w-px bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase">Efficiency</div>
                  <div className="text-xl font-bold text-green-600">
                    {optimization.efficiency}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualizer Canvas */}
          <div
            className="bg-white shadow-2xl relative transition-all duration-300 print:shadow-none print:border print:mb-8"
            style={{
              width: `${roomDims.w * scale}px`,
              height: `${roomDims.l * scale}px`,
              minWidth: `${roomDims.w * scale}px`,
              minHeight: `${roomDims.l * scale}px`,
              backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              cursor: draggingId ? 'grabbing' : 'default',
            }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${roomDims.w} ${roomDims.l}`}
              className="absolute top-0 left-0"
              onMouseDown={(e) => {
                // If clicking background, deselect
                if (e.target.tagName === 'svg') setDraggingId(null);
              }}
            >
              <defs>
                <pattern
                  id="hatchIsland"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#ef4444" strokeWidth="2" />
                </pattern>
                <pattern
                  id="hatchCutout"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-45)"
                >
                  <rect width="8" height="8" fill="#f1f5f9" />
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Floor Boundary */}
              <rect
                x="0"
                y="0"
                width={roomDims.w}
                height={roomDims.l}
                fill="white"
                stroke="#334155"
                strokeWidth="2"
              />

              {/* Planks */}
              {layout.map((row, rIndex) => (
                <g key={`row-${rIndex}`}>
                  {row.map((p, pIndex) => (
                    <g key={`${rIndex}-${pIndex}`}>
                      <rect
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        fill={p.isCut ? '#fed7aa' : '#fdba74'}
                        stroke="#c2410c"
                        strokeWidth="0.5"
                        opacity="0.9"
                      />
                      {/* Dimensions on Planks */}
                      {p.width > 8 && p.height > 3 && (
                        <text
                          x={p.x + p.width / 2}
                          y={p.y + p.height / 2}
                          fontSize={Math.min(p.height / 2, 8)}
                          fill="#7c2d12"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          pointerEvents="none"
                          className="select-none font-sans"
                        >
                          {Math.round(p.isHorizontal ? p.width : p.height)}"{p.isCut ? '*' : ''}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              ))}

              {/* Obstacles Overlay */}
              {obstacles.map((obs) => (
                <g
                  key={obs.id}
                  transform={`translate(${obs.x}, ${obs.y})`}
                  onMouseDown={(e) => handleMouseDown(e, obs.id)}
                  className="cursor-move hover:opacity-90"
                >
                  <rect
                    width={obs.w}
                    height={obs.l}
                    fill={obs.type === 'cutout' ? 'url(#hatchCutout)' : 'url(#hatchIsland)'}
                    stroke={obs.type === 'cutout' ? '#94a3b8' : '#ef4444'}
                    strokeWidth="2"
                    rx="1"
                  />
                  {/* Size Handle / Label */}
                  <rect x="0" y="0" width={obs.w} height={obs.l} fill="transparent" />
                  <text
                    x={obs.w / 2}
                    y={obs.l / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={obs.type === 'cutout' ? '#64748b' : 'white'}
                    className="select-none pointer-events-none shadow-black drop-shadow-md"
                    style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {obs.type === 'cutout' ? 'CUTOUT' : 'ISLAND'}
                  </text>
                  {/* Drag indicator border if active */}
                  {draggingId === obs.id && (
                    <rect
                      x="-2"
                      y="-2"
                      width={obs.w + 4}
                      height={obs.l + 4}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* External Dimensions Labels */}
            <div className="absolute -top-6 left-0 w-full text-center font-mono text-xs text-slate-500 flex items-center justify-center gap-2 no-print">
              <ArrowRight className="w-4 h-4 rotate-180" />
              {toDisplay(roomDims.w, 'linear')}
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="absolute top-0 -left-6 h-full flex flex-col items-center justify-center font-mono text-xs text-slate-500 gap-2 no-print">
              <ArrowRight className="w-4 h-4 -rotate-90" />
              <span className="-rotate-90 whitespace-nowrap">{toDisplay(roomDims.l, 'linear')}</span>
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Compass */}
            <div className="absolute bottom-2 right-2 p-1 bg-white/90 rounded border backdrop-blur text-[10px] font-bold text-slate-500 no-print flex items-center gap-1 shadow-sm">
              <RotateCcw className={`w-3 h-3 ${direction === 'vertical' ? 'rotate-90' : ''}`} />
              {direction.toUpperCase()}
            </div>
          </div>

          {/* CUT LIST TABLE */}
          {(showCutList ||
            (typeof window !== 'undefined' &&
              window.matchMedia &&
              window.matchMedia('print').matches)) && (
            <div className="w-full max-w-4xl mt-8 print-break print:block">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
                <Scissors className="w-5 h-5" /> Cut List by Row
              </h2>
              <div className="overflow-hidden border rounded-lg text-sm bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3 border-r">Row</th>
                      <th className="p-3 border-r">Start Piece</th>
                      <th className="p-3 border-r">Full Planks</th>
                      <th className="p-3">End Piece</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layout.map((row, i) => {
                      if (row.length === 0) return null;

                      // Grouping for complex rows (like those split by islands)
                      // A row might have multiple start/end pieces if interrupted
                      // For simplicity in this view, we just list the very first and very last,
                      // unless we detect a gap
                      const startPiece = row[0];
                      const endPiece = row[row.length - 1];

                      // Count full pieces
                      const fullCount = row.filter((p) => !p.isCut).length;

                      return (
                        <tr key={i} className="border-b even:bg-slate-50 hover:bg-blue-50">
                          <td className="p-3 border-r font-mono font-bold text-slate-500">
                            {i + 1}
                          </td>
                          <td className="p-3 border-r">
                            {startPiece.isCut ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-700">
                                  {Math.round(startPiece.rawWidth)}"
                                </span>
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                                  CUT
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Full</span>
                            )}
                          </td>
                          <td className="p-3 border-r text-center font-mono">
                            {fullCount > 0 ? fullCount : '-'}
                          </td>
                          <td className="p-3">
                            {endPiece.isCut && endPiece !== startPiece ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-orange-700">
                                  {Math.round(endPiece.rawWidth)}"
                                </span>
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded">
                                  CUT
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                {endPiece === startPiece ? '-' : 'Full'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white border-t p-2 px-6 flex items-center justify-between text-xs text-slate-500 no-print">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-300 border border-orange-700"></div> Full Plank
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-200 border border-orange-700"></div> Cut Piece (*)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 border border-red-500"></div> Island
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-300 border border-slate-400"></div> Cutout (No
              Floor)
            </div>
          </div>
          <div>Scale: 1px ≈ {toDisplay(1 / scale, 'linear')}</div>
        </div>
      </div>
    </div>
  );
};

const rootEl = document.getElementById('flooring-calculator-root');
if (rootEl) {
  createRoot(rootEl).render(<FlooringCalculator />);
}
