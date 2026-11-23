(() => {
  const $ = (id) => document.getElementById(id);

  const MATERIAL_PRESETS = {
    alu:        { vc: 50, fx: 0.10, fz: 0.25 },
    brass:      { vc: 45, fx: 0.10, fz: 0.22 },
    mild_steel: { vc: 30, fx: 0.08, fz: 0.20 },
    c45:        { vc: 22, fx: 0.06, fz: 0.16 },
    inox:       { vc: 15, fx: 0.05, fz: 0.12 },
  };

  const DEFAULTS = {
    controller: "fanuc",
    progNumber: "0105",
    material: "mild_steel",
    surfaceType: "od",
    wcs: "G54",
    dBlank: 30.0,
    zStart: -1.0,
    zEnd: -25.0,
    method: "traverse",
    helixAngle: 45,
    threadIndexMode: "q_angle",
    threadCodeMode: "linear",
    springPass: true,
    passMode: "oneway",
    pattern: "diamond",
    pitch: 1.0,
    depthPerSide: 0.45,
    passes: 2,
    wheelWidth: 8,
    toolCode: "T0505",
    autoDepth: true,
    autoCut: true,
    chamferExit: false,
    preTurn: false,
    preTurnTool: "T0101",
    preTurnChamfer: 0.8,
    preTurnFeed: 0.15,
    spindleRpm: 320,
    feedX: 0.08,
    feedZ: 0.20,
    dwellSec: 1.0,
    xSafe: 50.0,
    zApproach: 3.0,
    spindleDir: "M03",
    coolant: "M08",
    homeReturn: "G28",
    includeProgNum: true,
    includeSafety: true,
    includeWcs: true,
    includeComments: true,
    includeSemicolon: false,
    includeLineNum: false,
  };

  let optimalD0 = 30.0;
  let lastGCode = "";
  let animFrameId = null;
  let animWaypoints = [];

  function fmt(num, dec = 3) {
    return Number(num).toFixed(dec).replace(/\.?0+$/, (m) => (m.includes(".") ? "" : m));
  }

  function fmtCoord(num) {
    return Number(num).toFixed(2);
  }

  function showToast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function readState() {
    return {
      controller: $("controller").value,
      progNumber: ($("progNumber").value || "0105").trim().replace(/^O/i, ""),
      material: $("material").value,
      surfaceType: $("surfaceType").value,
      wcs: $("wcs").value,
      dBlank: Math.max(1, parseFloat($("dBlank").value) || 30),
      zStart: parseFloat($("zStart").value) || 0,
      zEnd: parseFloat($("zEnd").value) || -25,
      method: $("method").value,
      helixAngle: parseFloat($("helixAngle").value) || 45,
      threadIndexMode: $("threadIndexMode").value,
      threadCodeMode: $("threadCodeMode").value,
      springPass: $("springPass").checked,
      passMode: $("passMode").value,
      pattern: $("pattern").value,
      pitch: Math.max(0.1, parseFloat($("pitch").value) || 1.0),
      depthPerSide: Math.max(0.02, parseFloat($("depthPerSide").value) || 0.45),
      passes: Math.max(1, Math.min(10, parseInt($("passes").value, 10) || 1)),
      wheelWidth: Math.max(2, parseFloat($("wheelWidth").value) || 8),
      toolCode: ($("toolCode").value || "T0505").trim().toUpperCase(),
      autoDepth: $("autoDepth").checked,
      chamferExit: $("chamferExit").checked,
      preTurn: $("preTurn").checked,
      preTurnTool: ($("preTurnTool").value || "T0101").trim().toUpperCase(),
      preTurnChamfer: Math.max(0, parseFloat($("preTurnChamfer").value) || 0),
      preTurnFeed: Math.max(0.02, parseFloat($("preTurnFeed").value) || 0.15),
      spindleRpm: Math.max(10, parseInt($("spindleRpm").value, 10) || 300),
      feedX: Math.max(0.01, parseFloat($("feedX").value) || 0.08),
      feedZ: Math.max(0.01, parseFloat($("feedZ").value) || 0.20),
      dwellSec: Math.max(0, parseFloat($("dwellSec").value) || 0),
      xSafe: Math.max(5, parseFloat($("xSafe").value) || 50),
      zApproach: parseFloat($("zApproach").value) || 3.0,
      spindleDir: $("spindleDir").value,
      coolant: $("coolant").value,
      homeReturn: $("homeReturn").value,
      includeProgNum: $("includeProgNum").checked,
      includeSafety: $("includeSafety").checked,
      includeWcs: $("includeWcs").checked,
      includeComments: $("includeComments").checked,
      includeSemicolon: $("includeSemicolon").checked,
      includeLineNum: $("includeLineNum").checked,
    };
  }

  function calcThread60(s) {
    const rad = (s.helixAngle * Math.PI) / 180;
    const lead = (Math.PI * s.dBlank) / Math.tan(rad);
    const starts = Math.max(2, Math.round((Math.PI * s.dBlank * Math.cos(rad)) / s.pitch));
    const actualPitch = (Math.PI * s.dBlank * Math.cos(rad)) / starts;
    const feedMmMin = s.spindleRpm * lead;
    return { lead, starts, actualPitch, feedMmMin };
  }

  function applyAutoCuttingParams() {
    if (!$("autoCut").checked) return;
    const mat = $("material").value;
    const method = $("method").value;
    const dBlank = Math.max(1, parseFloat($("dBlank").value) || 30);
    const pitch = Math.max(0.1, parseFloat($("pitch").value) || 1.0);

    if (method === "thread60") {
      const angle = parseFloat($("helixAngle").value) || 45;
      const lead = (Math.PI * dBlank) / Math.tan((angle * Math.PI) / 180);
      const safeRpm = Math.max(10, Math.min(120, Math.floor(2200 / lead / 5) * 5 || 15));
      const depth = $("autoDepth").checked
        ? pitch * 0.40
        : Math.max(0.05, parseFloat($("depthPerSide").value) || pitch * 0.40);
      const maxApMap = { alu: 0.18, brass: 0.16, mild_steel: 0.12, c45: 0.09, inox: 0.07, custom: 0.10 };
      const maxAp = maxApMap[mat] || 0.10;
      const passes = Math.max(2, Math.min(10, Math.ceil(depth / maxAp)));
      $("spindleRpm").value = safeRpm;
      $("passes").value = passes;
      return;
    }

    const preset = MATERIAL_PRESETS[mat];
    if (!preset) return;

    const pattern = $("pattern").value;
    // Straight: full-width radial contact (Fx lighter); Diagonal: progressive entry (fastest); Diamond: 2 wheels / cross-load (slower S/F, +pass)
    const patMap = {
      straight: { vc: 1.00, fx: 0.90, fz: 1.00, passAdd: 0 },
      diagonal: { vc: 1.08, fx: 1.05, fz: 1.10, passAdd: 0 },
      diamond:  { vc: 0.85, fx: 0.80, fz: 0.85, passAdd: 1 },
    };
    const pm = patMap[pattern] || patMap.straight;

    const rpm = Math.max(40, Math.min(2000, Math.round(((preset.vc * pm.vc * 1000) / (Math.PI * dBlank)) / 10) * 10));
    const pitchScale = pitch >= 1.5 ? 0.85 : pitch <= 0.6 ? 1.1 : 1.0;
    const fx = Math.max(0.03, Math.min(0.20, +(preset.fx * pm.fx * pitchScale).toFixed(2)));
    const fz = Math.max(0.08, Math.min(0.35, +(preset.fz * pm.fz * pitchScale).toFixed(2)));
    const dwell = Math.max(0.3, +((3 * 60) / rpm).toFixed(1));
    const basePasses = (mat === "inox" || mat === "c45" || pitch >= 1.5) ? (pitch >= 1.6 ? 3 : 2) : (pitch <= 0.8 && (mat === "alu" || mat === "brass") ? 1 : 2);
    const passes = Math.min(6, basePasses + (mat === "alu" && pitch <= 0.8 ? 0 : pm.passAdd));

    $("spindleRpm").value = rpm;
    $("feedX").value = fx.toFixed(2);
    $("feedZ").value = fz.toFixed(2);
    $("dwellSec").value = dwell.toFixed(1);
    $("passes").value = passes;
  }

  function syncDepthAndUI(s) {
    if (s.autoDepth) {
      const ratio = s.method === "thread60" ? 0.40 : 0.45;
      const d = +(s.pitch * ratio).toFixed(3);
      $("depthPerSide").value = d;
      $("depthPerSide").disabled = true;
      s.depthPerSide = d;
    } else {
      $("depthPerSide").disabled = false;
    }

    const isPlunge = s.method === "plunge";
    const isThread60 = s.method === "thread60";
    $("thread60Options").style.display = isThread60 ? "grid" : "none";
    $("feedX").disabled = isThread60;
    $("feedZ").disabled = isPlunge || isThread60;
    $("dwellSec").disabled = isThread60;
    $("chamferExit").disabled = isPlunge || isThread60;
    $("passMode").disabled = isPlunge || isThread60;
    $("wheelWidth").disabled = isThread60;
    $("preTurnOptions").style.display = s.preTurn ? "grid" : "none";
    $("progNumber").disabled = !s.includeProgNum;
    $("wcs").disabled = !s.includeWcs;

    document.querySelectorAll("#pitchPresets .chip").forEach((btn) => {
      const p = parseFloat(btn.dataset.pitch);
      btn.classList.toggle("active", Math.abs(p - s.pitch) < 0.001);
    });
  }

  function formatDwell(controller, sec) {
    if (sec <= 0) return null;
    if (controller === "fanuc") {
      return `G04 X${sec.toFixed(1)}`;
    }
    return `G04 P${Math.round(sec * 1000)}`;
  }

  function generateGCode(s) {
    const lines = [];
    const cmt = (txt) => (s.includeComments ? ` (${txt})` : "");
    const feedMode = s.controller === "mach3" ? "G95" : "G99";
    const isId = s.surfaceType === "id";
    const sign = isId ? 1 : -1;
    const xClear = isId ? Math.max(1.0, s.dBlank - 2.0) : s.dBlank + 2.0;
    const xBottom = s.dBlank + sign * 2 * s.depthPerSide;
    const dwellCmd = formatDwell(s.controller, s.dwellSec);
    const zLen = Math.abs(s.zEnd - s.zStart);
    const zDir = s.zEnd < s.zStart ? -1 : 1;

    if (s.includeSemicolon) {
      lines.push(";");
    }
    if (s.includeProgNum) {
      if (s.controller !== "mach3") {
        lines.push("%");
      }
      lines.push(`O${s.progNumber}${cmt("KNURLING PROGRAM")}`);
    }
    if (s.includeComments) {
      lines.push(`(METHOD: ${s.method.toUpperCase()} | PATTERN: ${s.pattern.toUpperCase()} | PITCH: ${s.pitch}MM)`);
      lines.push(`(D0: ${fmtCoord(s.dBlank)}MM | X_MIN: ${fmtCoord(xBottom)}MM | PASSES: ${s.passes})`);
    }

    if (s.includeSafety) {
      lines.push(`G21 G40 G80 ${feedMode}${cmt("MM, CANCEL COMP, FEED/REV")}`);
    }
    if (s.includeWcs && s.wcs) {
      lines.push(`${s.wcs}`);
    }

    if (s.preTurn) {
      const turnRpm = Math.min(2500, Math.max(400, Math.round(s.spindleRpm * 2.5 / 10) * 10));
      if (s.includeComments) lines.push(`(--- OP1: PRE-TURN D0 ${isId ? "ID" : "OD"} ---)`);
      lines.push(`${s.preTurnTool}${cmt(isId ? "ID BORING BAR" : "OD FINISHING TOOL")}`);
      lines.push(`G97 S${turnRpm} ${s.spindleDir}`);
      if (s.coolant !== "none") lines.push(`${s.coolant}`);
      lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(s.zApproach)}`);
      if (s.preTurnChamfer > 0) {
        const xChamferStart = isId ? s.dBlank + 2 * s.preTurnChamfer : Math.max(2, s.dBlank - 2 * s.preTurnChamfer);
        lines.push(`G00 X${fmtCoord(xChamferStart)} Z0.5`);
        lines.push(`G01 Z0.0 F${s.preTurnFeed.toFixed(2)}`);
        lines.push(`G01 X${fmtCoord(s.dBlank)} Z-${s.preTurnChamfer.toFixed(2)}${cmt(`CHAMFER C${s.preTurnChamfer}`)}`);
      } else {
        lines.push(`G00 X${fmtCoord(s.dBlank)} Z0.5`);
      }
      lines.push(`G01 Z${fmtCoord(s.zEnd)} F${s.preTurnFeed.toFixed(2)}${cmt(`TURN TO D0=${fmtCoord(s.dBlank)}`)}`);
      lines.push(`G00 X${fmtCoord(xClear)}`);
      lines.push(`G00 Z${fmtCoord(s.zApproach)}`);
      if (s.coolant !== "none") lines.push("M09");
      lines.push(s.homeReturn === "G28" ? "G28 U0 W0" : `G00 X${fmtCoord(isId ? Math.min(s.xSafe, xClear) : Math.max(s.xSafe, xClear))} Z${fmtCoord(s.zApproach)}`);
      lines.push(`M01${cmt("OPTIONAL STOP - CHECK D0")}`);
      lines.push("");
    }

    lines.push(`${s.toolCode}${cmt(isId ? "ID KNURLING TOOL" : "KNURLING TOOL")}`);
    lines.push(`G97 S${s.spindleRpm} ${s.spindleDir}${cmt("CONSTANT RPM - DO NOT USE G96")}`);
    if (s.coolant !== "none") {
      lines.push(`${s.coolant}${cmt("COOLANT ON")}`);
    }

    lines.push(`G00 X${fmtCoord(isId ? xClear : Math.max(s.xSafe, xClear))} Z${fmtCoord(s.zApproach)}${cmt("SAFE APPROACH")}`);

    if (s.method === "thread60") {
      const t60 = calcThread60(s);
      const leadStr = t60.lead.toFixed(3);
      const leadIn = 2.0;
      const zLeadFwd = s.zStart - zDir * leadIn;
      const zLeadRev = s.zEnd + zDir * leadIn;
      if (s.includeComments) {
        lines.push(`(THREAD-KNURL 60 DEG | LEAD F=${leadStr} | STARTS=${t60.starts} | HELIX=${s.helixAngle} DEG)`);
      }

      let prevDepth = 0;
      const stepZ = t60.lead / t60.starts;
      const totalPasses = s.passes + (s.springPass ? 1 : 0);
      for (let i = 1; i <= totalPasses; i++) {
        const isSpring = s.springPass && i === totalPasses;
        const curDepth = isSpring ? s.depthPerSide : s.depthPerSide * Math.sqrt(i / s.passes);
        const ap = isSpring ? 0 : curDepth - prevDepth;
        prevDepth = curDepth;
        const xPass = s.dBlank + sign * 2 * curDepth;
        if (s.includeComments) {
          lines.push(isSpring
            ? `(--- SPRING PASS X=${fmtCoord(xPass)} AP=0.000MM ---)`
            : `(--- PASS ${i}/${s.passes} X=${fmtCoord(xPass)} AP=${ap.toFixed(3)}MM ---)`);
        }

        if (s.threadCodeMode === "macro") {
          lines.push(`#101 = 0`);
          lines.push(`WHILE [#101 LT ${t60.starts}] DO1`);
          if (s.threadIndexMode === "q_angle") {
            lines.push(`#102 = ROUND[#101 * 360000 / ${t60.starts}]`);
            lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zLeadFwd)}`);
            lines.push(`G00 X${fmtCoord(xPass)}`);
            lines.push(`G32 Z${fmtCoord(s.zEnd)} F${leadStr} Q#102`);
          } else {
            const fwdOp = zDir < 0 ? "+" : "-";
            lines.push(`#102 = ${fmtCoord(zLeadFwd)} ${fwdOp} [#101 * ${stepZ.toFixed(4)}]`);
            lines.push(`G00 X${fmtCoord(xClear)} Z#102`);
            lines.push(`G00 X${fmtCoord(xPass)}`);
            lines.push(`G32 Z${fmtCoord(s.zEnd)} F${leadStr}`);
          }
          lines.push(`G00 X${fmtCoord(xClear)}`);
          lines.push(`#101 = #101 + 1`);
          lines.push(`END1`);

          if (s.pattern === "diamond") {
            if (s.includeComments) lines.push(`(--- REVERSE HELIX FOR DIAMOND ---)`);
            lines.push(`#101 = 0`);
            lines.push(`WHILE [#101 LT ${t60.starts}] DO2`);
            if (s.threadIndexMode === "q_angle") {
              lines.push(`#102 = ROUND[#101 * 360000 / ${t60.starts}]`);
              lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zLeadRev)}`);
              lines.push(`G00 X${fmtCoord(xPass)}`);
              lines.push(`G32 Z${fmtCoord(s.zStart)} F${leadStr} Q#102`);
            } else {
              const revOp = zDir < 0 ? "-" : "+";
              lines.push(`#102 = ${fmtCoord(zLeadRev)} ${revOp} [#101 * ${stepZ.toFixed(4)}]`);
              lines.push(`G00 X${fmtCoord(xClear)} Z#102`);
              lines.push(`G00 X${fmtCoord(xPass)}`);
              lines.push(`G32 Z${fmtCoord(s.zStart)} F${leadStr}`);
            }
            lines.push(`G00 X${fmtCoord(xClear)}`);
            lines.push(`#101 = #101 + 1`);
            lines.push(`END2`);
          }
          continue;
        }

        for (let k = 0; k < t60.starts; k++) {
          if (s.threadIndexMode === "q_angle") {
            const qVal = Math.round((k * 360000) / t60.starts);
            const qStr = s.controller === "mach3" ? "" : ` Q${qVal}`;
            lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zLeadFwd)}`);
            lines.push(`G00 X${fmtCoord(xPass)}`);
            lines.push(`G32 Z${fmtCoord(s.zEnd)} F${leadStr}${qStr}`);
          } else {
            const zShift = zLeadFwd - zDir * ((k * t60.lead) / t60.starts);
            lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zShift)}`);
            lines.push(`G00 X${fmtCoord(xPass)}`);
            lines.push(`G32 Z${fmtCoord(s.zEnd)} F${leadStr}`);
          }
          lines.push(`G00 X${fmtCoord(xClear)}`);
        }

        if (s.pattern === "diamond") {
          if (s.includeComments) lines.push(`(--- REVERSE HELIX FOR DIAMOND ---)`);
          for (let k = 0; k < t60.starts; k++) {
            if (s.threadIndexMode === "q_angle") {
              const qVal = Math.round((k * 360000) / t60.starts);
              const qStr = s.controller === "mach3" ? "" : ` Q${qVal}`;
              lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zLeadRev)}`);
              lines.push(`G00 X${fmtCoord(xPass)}`);
              lines.push(`G32 Z${fmtCoord(s.zStart)} F${leadStr}${qStr}`);
            } else {
              const zShiftRev = zLeadRev + zDir * ((k * t60.lead) / t60.starts);
              lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(zShiftRev)}`);
              lines.push(`G00 X${fmtCoord(xPass)}`);
              lines.push(`G32 Z${fmtCoord(s.zStart)} F${leadStr}`);
            }
            lines.push(`G00 X${fmtCoord(xClear)}`);
          }
        }
      }
    } else if (s.method === "plunge") {
      lines.push(`G00 Z${fmtCoord(s.zStart)}${cmt("POSITION Z")}`);
      lines.push(`G00 X${fmtCoord(xClear)}`);

      for (let i = 1; i <= s.passes; i++) {
        const frac = i / s.passes;
        const xPass = s.dBlank + sign * 2 * s.depthPerSide * frac;
        lines.push(`G01 X${fmtCoord(xPass)} F${s.feedX.toFixed(2)}${cmt(`PLUNGE PASS ${i}/${s.passes}`)}`);
        if (dwellCmd && i === s.passes) {
          lines.push(`${dwellCmd}${cmt(`DWELL ${s.dwellSec}S`)}`);
        }
      }
      lines.push(`G00 X${fmtCoord(xClear)}${cmt("RETRACT X")}`);
    } else if (s.passMode === "zigzag") {
      lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(s.zStart)}${cmt("START POSITION ZIGZAG")}`);
      for (let i = 1; i <= s.passes; i++) {
        const frac = i / s.passes;
        const xPass = s.dBlank + sign * 2 * s.depthPerSide * frac;
        const goingEnd = i % 2 === 1;
        const targetZ = goingEnd ? s.zEnd : s.zStart;
        if (s.includeComments) lines.push(`(--- ZIGZAG PASS ${i}/${s.passes} ---)`);
        lines.push(`G01 X${fmtCoord(xPass)} F${s.feedX.toFixed(2)}${cmt("PLUNGE TO DEPTH")}`);
        if (dwellCmd) lines.push(`${dwellCmd}${cmt("ENGAGE KNURL")}`);
        lines.push(`G01 Z${fmtCoord(targetZ)} F${s.feedZ.toFixed(2)}${cmt(goingEnd ? "TRAVERSE FORWARD" : "TRAVERSE RETURN")}`);
        if (i === s.passes && s.chamferExit) {
          const xExit = isId ? Math.max(1.0, s.dBlank - 1.0) : s.dBlank + 1.0;
          const zExit = targetZ + (goingEnd ? zDir : -zDir) * 1.0;
          lines.push(`G01 X${fmtCoord(xExit)} Z${fmtCoord(zExit)} F${s.feedZ.toFixed(2)}${cmt("45 DEG EXIT")}`);
        } else if (dwellCmd && i === s.passes) {
          lines.push(`${dwellCmd}${cmt("CLEANUP DWELL")}`);
        }
      }
      lines.push(`G00 X${fmtCoord(xClear)}${cmt("RETRACT X")}`);
    } else {
      lines.push(`G00 X${fmtCoord(xClear)} Z${fmtCoord(s.zStart)}${cmt("START POSITION")}`);

      for (let i = 1; i <= s.passes; i++) {
        const frac = i / s.passes;
        const xPass = s.dBlank + sign * 2 * s.depthPerSide * frac;
        if (s.includeComments) lines.push(`(--- PASS ${i}/${s.passes} ---)`);
        lines.push(`G01 X${fmtCoord(xPass)} F${s.feedX.toFixed(2)}${cmt("PLUNGE TO DEPTH")}`);
        if (dwellCmd) {
          lines.push(`${dwellCmd}${cmt("ENGAGE KNURL")}`);
        }
        lines.push(`G01 Z${fmtCoord(s.zEnd)} F${s.feedZ.toFixed(2)}${cmt("TRAVERSE KNURL")}`);
        if (s.chamferExit) {
          const xExit = isId ? Math.max(1.0, s.dBlank - 1.0) : s.dBlank + 1.0;
          const zExit = s.zEnd + zDir * 1.0;
          lines.push(`G01 X${fmtCoord(xExit)} Z${fmtCoord(zExit)} F${s.feedZ.toFixed(2)}${cmt("45 DEG EXIT")}`);
        } else if (dwellCmd) {
          lines.push(`${dwellCmd}${cmt("CLEANUP DWELL")}`);
        }
        lines.push(`G00 X${fmtCoord(xClear)}${cmt("RETRACT X")}`);
        if (i < s.passes) {
          lines.push(`G00 Z${fmtCoord(s.zStart)}${cmt("RETURN Z FOR NEXT PASS")}`);
        }
      }
    }

    lines.push(`G00 Z${fmtCoord(s.zApproach)}${cmt("CLEAR Z")}`);
    if (s.coolant !== "none") {
      lines.push(`M09${cmt("COOLANT OFF")}`);
    }
    lines.push(`M05${cmt("SPINDLE STOP")}`);
    if (s.homeReturn === "G28") {
      lines.push(`G28 U0 W0${cmt("HOME RETURN")}`);
    } else {
      lines.push(`G00 X${fmtCoord(Math.max(s.xSafe, xClear))} Z${fmtCoord(s.zApproach)}${cmt("SAFE PARK")}`);
    }
    lines.push("M30");
    if (s.includeProgNum && s.controller !== "mach3") {
      lines.push("%");
    }
    if (s.includeSemicolon) {
      lines.push(";");
    }

    // Estimate cycle time (seconds)
    const revPerSec = s.spindleRpm / 60;
    let cutSec = 0;
    if (s.method === "thread60") {
      const t60 = calcThread60(s);
      const dirs = s.pattern === "diamond" ? 2 : 1;
      const totalPasses = s.passes + (s.springPass ? 1 : 0);
      const passSec = (zLen + 4) / (t60.lead * revPerSec) + 0.8;
      cutSec = totalPasses * dirs * t60.starts * passSec + 3.0;
    } else if (s.method === "plunge") {
      cutSec = (s.depthPerSide / (s.feedX * revPerSec)) + s.dwellSec + 2.0;
    } else {
      const plungeSec = (s.depthPerSide / s.passes) / (s.feedX * revPerSec);
      const travSec = zLen / (s.feedZ * revPerSec);
      cutSec = s.passes * (plungeSec + travSec + s.dwellSec * 1.5 + 1.2) + 2.0;
    }

    let finalLines = lines;
    if (s.includeLineNum) {
      let n = 10;
      finalLines = lines.map((ln) => {
        const t = ln.trim();
        if (!t || t === "%" || t === ";" || /^O\d+/i.test(t) || /^\(.*\)$/.test(t)) {
          return ln;
        }
        const out = `N${n} ${ln}`;
        n += 10;
        return out;
      });
    }

    return {
      code: finalLines.join("\n"),
      lineCount: finalLines.length,
      xBottom,
      cycleSec: Math.max(1, Math.round(cutSec)),
    };
  }

  function updateMetrics(s, res) {
    $("mXBottom").textContent = `${res.xBottom.toFixed(2)} mm`;
    const isId = s.surfaceType === "id";
    const dFinal = s.method === "thread60"
      ? s.dBlank
      : (isId ? s.dBlank - 0.4 * s.pitch : s.dBlank + 0.4 * s.pitch);
    $("mDFinal").textContent = `${dFinal.toFixed(2)} mm`;

    const vc = (Math.PI * s.dBlank * s.spindleRpm) / 1000;
    $("mVc").textContent = `${vc.toFixed(1)} m/ph`;

    const mins = String(Math.floor(res.cycleSec / 60)).padStart(2, "0");
    const secs = String(res.cycleSec % 60).padStart(2, "0");
    $("mCycleTime").textContent = `${mins}:${secs}`;

    const box = $("trackingBox");
    const txt = $("trackingText");
    const sign = isId ? 1 : -1;
    const pb = $("passBreakdown");
    const passList = [];
    if (s.method === "thread60") {
      const totalP = s.passes + (s.springPass ? 1 : 0);
      for (let i = 1; i <= totalP; i++) {
        const isSp = s.springPass && i === totalP;
        const d = isSp ? s.depthPerSide : s.depthPerSide * Math.sqrt(i / s.passes);
        passList.push(`${isSp ? "Tinh" : `L${i}`}: X${fmtCoord(s.dBlank + sign * 2 * d)}`);
      }
    } else {
      for (let i = 1; i <= s.passes; i++) {
        const d = s.depthPerSide * (i / s.passes);
        passList.push(`L${i}: X${fmtCoord(s.dBlank + sign * 2 * d)}`);
      }
    }
    if (pb) {
      if (passList.length > 1 || s.method === "thread60") {
        pb.style.display = "block";
        pb.textContent = `Chia lát X: ${passList.join(" → ")}`;
      } else {
        pb.style.display = "none";
      }
    }

    if (s.method === "thread60") {
      const t60 = calcThread60(s);
      box.className = "tracking-box ok";
      txt.textContent = `Dao ren 60°: Lead F = ${t60.lead.toFixed(2)} mm/vòng | ${t60.starts} đầu mối | Bước thực = ${t60.actualPitch.toFixed(3)} mm | Tốc độ Z = ${Math.round(t60.feedMmMin)} mm/phút.`;
      $("btnApplyOptD").style.display = "none";
      updateWarnings(s, vc, t60);
      return;
    }

    const teeth = (Math.PI * s.dBlank) / s.pitch;
    const nearest = Math.round(teeth);
    const diff = Math.abs(teeth - nearest);
    optimalD0 = +((nearest * s.pitch) / Math.PI).toFixed(2);

    if (diff <= 0.12) {
      box.className = "tracking-box ok";
      txt.textContent = `Đạt (${teeth.toFixed(2)} răng/chu vi, sai lệch ${diff.toFixed(2)}). Bánh lăn ăn khớp tốt.`;
      $("btnApplyOptD").style.display = "none";
    } else {
      box.className = "tracking-box warn";
      txt.textContent = `Lệch (${teeth.toFixed(2)} răng/chu vi, dễ bị nhảy răng/bóng ma). D0 tối ưu gần nhất: ${optimalD0} mm (${nearest} răng).`;
      $("btnApplyOptD").style.display = "inline-block";
    }

    updateWarnings(s, vc, null);
  }

  function updateWarnings(s, vc, t60) {
    const warns = [];
    if (s.surfaceType === "id" && s.dBlank < 12) {
      warns.push(`Đường kính lỗ D0 = ${s.dBlank} mm khá nhỏ — kiểm tra khoảng thoát cán dao trong lỗ tránh va chạm.`);
    }
    if (s.method === "thread60" && t60) {
      if (t60.feedMmMin > 2800) {
        const recRpm = Math.max(10, Math.floor(2400 / t60.lead / 5) * 5);
        warns.push(`Tốc độ chạy trục Z (S × Lead = ${Math.round(t60.feedMmMin)} mm/phút) quá cao, dễ báo lỗi servo! Nên giảm S ≤ ${recRpm} RPM.`);
      }
      if (s.pattern === "straight") {
        warns.push("Dao ren 60° chỉ tạo được nhám Chéo (Diagonal) hoặc Ca-rô (Diamond), không tạo được nhám Thẳng 0°.");
      }
      if (s.threadIndexMode === "q_angle" && s.controller === "mach3") {
        warns.push("Mach3 không hỗ trợ tham số góc pha Q trong G32 — hãy chuyển 'Chia đầu mối' sang 'Dịch Z_start'.");
      }
      if (s.threadCodeMode === "macro" && s.controller === "mach3") {
        warns.push("Mach3 không hỗ trợ vòng lặp WHILE/DO của Fanuc Macro B — hãy chuyển 'Xuất G32' sang 'Code thẳng'.");
      }
    } else {
      if (s.depthPerSide > s.pitch * 0.6) {
        warns.push(`Chiều sâu ăn (${s.depthPerSide} mm) lớn hơn 0.6 × Pitch — dễ gãy chốt hoặc bẹp đỉnh răng.`);
      }
      if ((s.material === "inox" && vc > 24) || vc > 65) {
        warns.push(`Vận tốc cắt Vc = ${vc.toFixed(1)} m/phút khá cao — dễ dính phôi hoặc cháy bánh lăn.`);
      }
      if (s.method === "traverse" && s.zStart > -0.3 && !s.preTurn) {
        warns.push("Z bắt đầu sát mặt đầu: nên vát mép đầu C0.5–C1.0 (hoặc bật Tiện tinh D0) để bánh lăn vào êm.");
      }
      if (s.passMode === "zigzag" && s.method === "traverse" && s.passes > 1) {
        warns.push("Chế độ Zig-zag chỉ phù hợp với bánh lăn ép (Form knurling) giữ rãnh, không dùng cho dao lăn cắt 1 chiều.");
      }
      const knurlLen = Math.abs(s.zEnd - s.zStart);
      if (s.method === "plunge" && knurlLen > s.wheelWidth + 0.5) {
        warns.push(`Đoạn cần lăn (${fmt(knurlLen, 1)} mm) dài hơn bề rộng bánh lăn (${s.wheelWidth} mm) — nên chuyển sang 'Chạy dọc (Traverse)'.`);
      }
    }

    const wBox = $("warningsBox");
    if (warns.length === 0) {
      wBox.style.display = "none";
      wBox.innerHTML = "";
    } else {
      wBox.style.display = "flex";
      wBox.innerHTML = warns.map((w) => `<div>• ${w}</div>`).join("");
    }
  }

  function renderSvg(s, res) {
    const svg = $("previewSvg");
    const W = 680;
    const H = 265;
    const cy = H * 0.56;

    const zMin = Math.min(s.zStart, s.zEnd, 0) - 6;
    const zMax = Math.max(s.zStart, s.zEnd, s.zApproach, 5) + 6;
    const zSpan = Math.max(15, zMax - zMin);

    const mapZ = (z) => 86 + ((z - zMin) / zSpan) * (W - 155);
    const halfD = Math.min(56, Math.max(26, s.dBlank * 1.0));

    const z0X = mapZ(0);
    const zsX = mapZ(s.zStart);
    const zeX = mapZ(s.zEnd);
    const zaX = mapZ(s.zApproach);

    const knurlLeft = Math.min(zsX, zeX);
    const knurlWidth = Math.max(14, Math.abs(zeX - zsX));
    const stockLeft = Math.min(knurlLeft - 38, 72);
    const stockWidth = Math.max(24, z0X - stockLeft);

    const isId = s.surfaceType === "id";
    const topY = cy - halfD;
    const botY = cy + halfD;
    const xClearY = isId ? cy - 2 : topY - 16;
    const xDepthY = isId ? topY - 6 : topY + 7;
    const knurlLen = Math.abs(s.zEnd - s.zStart);

    // Build knurl pattern lines
    let hatch = "";
    let helixOverlay = "";
    const step = 7;
    if (s.pattern === "straight" && s.method !== "thread60") {
      for (let y = topY + 3; y < botY - 2; y += 6) {
        hatch += `<line x1="${knurlLeft}" y1="${y}" x2="${knurlLeft + knurlWidth}" y2="${y}" stroke="#d97706" stroke-width="1" opacity="0.65"/>`;
      }
    } else {
      const angleDeg = s.method === "thread60" ? s.helixAngle : 45;
      const rad = (angleDeg * Math.PI) / 180;
      const dx = (botY - topY) / Math.tan(rad);
      const startX = knurlLeft - Math.abs(dx) - step;
      const endX = knurlLeft + knurlWidth + Math.abs(dx) + step;
      for (let x = startX; x <= endX; x += step) {
        hatch += `<line x1="${x}" y1="${botY}" x2="${x + dx}" y2="${topY}" stroke="#d97706" stroke-width="1" opacity="0.58"/>`;
        if (s.pattern === "diamond") {
          hatch += `<line x1="${x}" y1="${topY}" x2="${x + dx}" y2="${botY}" stroke="#d97706" stroke-width="1" opacity="0.58"/>`;
        }
      }

      if (s.method === "thread60" && knurlWidth >= 28) {
        const ax = knurlLeft + knurlWidth * 0.35;
        const ay = cy;
        const rArc = 22;
        const ex = ax + Math.cos(-rad) * rArc;
        const ey = ay + Math.sin(-rad) * rArc;
        const lx = ax + Math.cos(-rad) * 34;
        const ly = ay + Math.sin(-rad) * 34;
        helixOverlay = `
          <g>
            <line x1="${ax}" y1="${ay}" x2="${ax + 34}" y2="${ay}" stroke="#0f172a" stroke-width="1.2"/>
            <line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}" stroke="#dc2626" stroke-width="1.6"/>
            <path d="M ${ax + rArc} ${ay} A ${rArc} ${rArc} 0 0 0 ${ex} ${ey}" fill="none" stroke="#0f172a" stroke-width="1.2"/>
            <rect x="${ax + 24}" y="${ay - 19}" width="44" height="15" rx="3" fill="#ffffff" opacity="0.9"/>
            <text x="${ax + 27}" y="${ay - 8}" fill="#0f172a" font-size="10.5" font-family="monospace" font-weight="700">α=${angleDeg}°</text>
          </g>
        `;
      }
    }

    // Tool icon (Knurling wheel OR 60-deg threading insert)
    let wheelHtml = "";
    const toolLabel = isId ? " (ID)" : "";
    if (s.method === "thread60") {
      const tx = zsX;
      const ty = isId ? xClearY + 2 : xClearY - 2;
      if (isId) {
        wheelHtml = `
          <g id="animTool" transform="translate(0,0)">
            <rect x="${tx - 6}" y="${ty + 14}" width="12" height="20" rx="2" fill="#475569"/>
            <polygon points="${tx - 9},${ty + 14} ${tx + 9},${ty + 14} ${tx},${ty}" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
            <text x="${tx + 14}" y="${ty + 18}" fill="#b45309" font-size="11" font-family="sans-serif" font-weight="600">Dao ren 60°${toolLabel} (${s.toolCode})</text>
          </g>
        `;
      } else {
        wheelHtml = `
          <g id="animTool" transform="translate(0,0)">
            <rect x="${tx - 6}" y="${ty - 34}" width="12" height="20" rx="2" fill="#475569"/>
            <polygon points="${tx - 9},${ty - 14} ${tx + 9},${ty - 14} ${tx},${ty}" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
            <text x="${tx + 14}" y="${ty - 14}" fill="#b45309" font-size="11" font-family="sans-serif" font-weight="600">Dao ren 60° (${s.toolCode})</text>
          </g>
        `;
      }
    } else {
      const wheelR = isId ? 12 : 16;
      const wheelWpx = Math.max(14, Math.min(90, (s.wheelWidth / zSpan) * (W - 155)));
      const wheelCx = zsX;
      const wheelCy = isId ? xClearY + wheelR + 2 : xClearY - wheelR - 4;
      const stemY = isId ? wheelCy + wheelR - 2 : wheelCy - wheelR - 14;
      wheelHtml = `
        <g id="animTool" transform="translate(0,0)">
          <rect x="${wheelCx - 5}" y="${stemY}" width="10" height="16" rx="2" fill="#475569"/>
          <rect x="${wheelCx - wheelWpx / 2}" y="${wheelCy - wheelR}" width="${wheelWpx}" height="${wheelR * 2}" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
          <line x1="${wheelCx - wheelWpx / 2}" y1="${wheelCy}" x2="${wheelCx + wheelWpx / 2}" y2="${wheelCy}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>
          <text x="${wheelCx + wheelWpx / 2 + 6}" y="${wheelCy + 4}" fill="#b45309" font-size="11" font-family="sans-serif" font-weight="600">Bánh lăn ${s.wheelWidth}mm (${s.toolCode})</text>
        </g>
      `;
    }

    const dxApp = zaX - zsX;
    const dxEnd = zeX - zsX;
    const dyDepth = xDepthY - xClearY;
    const appOffset = isId ? 0 : -12;
    if (s.method === "plunge") {
      animWaypoints = [
        { x: dxApp, y: appOffset, ms: 400 },
        { x: 0, y: 0, ms: 500 },
        { x: 0, y: dyDepth, ms: 700 },
        { x: 0, y: dyDepth, ms: 450 },
        { x: 0, y: 0, ms: 350 },
        { x: dxApp, y: appOffset, ms: 400 },
        { x: 0, y: 0, ms: 200 },
      ];
    } else {
      animWaypoints = [
        { x: dxApp, y: appOffset, ms: 400 },
        { x: 0, y: 0, ms: 450 },
        { x: 0, y: dyDepth, ms: 500 },
        { x: dxEnd, y: dyDepth, ms: 1300 },
        { x: dxEnd, y: 0, ms: 350 },
        { x: dxApp, y: 0, ms: 450 },
        { x: 0, y: 0, ms: 250 },
      ];
    }

    // Toolpath polyline
    let pathHtml = "";
    const appY = isId ? xClearY : xClearY - 12;
    const lblY = isId ? xDepthY + 13 : xDepthY - 5;
    if (s.method === "thread60") {
      const t60 = calcThread60(s);
      pathHtml = `
        <line x1="${zaX}" y1="${appY}" x2="${zsX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4"/>
        <line x1="${zsX}" y1="${xClearY}" x2="${zsX}" y2="${xDepthY}" stroke="#dc2626" stroke-width="2.0"/>
        <line x1="${zsX}" y1="${xDepthY}" x2="${zeX}" y2="${xDepthY}" stroke="#dc2626" stroke-width="2.5" marker-end="url(#arrowRed)"/>
        <line x1="${zeX}" y1="${xDepthY}" x2="${zeX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4"/>
        <text x="${(zsX + zeX) / 2}" y="${lblY}" fill="#dc2626" font-size="10.5" font-family="monospace" text-anchor="middle">G32 F=${t60.lead.toFixed(1)} (${t60.starts} mối)</text>
      `;
    } else if (s.method === "plunge") {
      pathHtml = `
        <line x1="${zaX}" y1="${appY}" x2="${zsX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4"/>
        <line x1="${zsX}" y1="${xClearY}" x2="${zsX}" y2="${xDepthY}" stroke="#dc2626" stroke-width="2.4" marker-end="url(#arrowRed)"/>
        <line x1="${zsX}" y1="${xDepthY}" x2="${zsX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="5,4"/>
        <text x="${zsX - 8}" y="${lblY}" fill="#dc2626" font-size="10.5" font-family="monospace" text-anchor="end">Fx=${s.feedX}</text>
      `;
    } else {
      pathHtml = `
        <line x1="${zaX}" y1="${appY}" x2="${zsX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4"/>
        <line x1="${zsX}" y1="${xClearY}" x2="${zsX}" y2="${xDepthY}" stroke="#dc2626" stroke-width="2.0"/>
        <line x1="${zsX}" y1="${xDepthY}" x2="${zeX}" y2="${xDepthY}" stroke="#dc2626" stroke-width="2.5" marker-end="url(#arrowRed)"/>
        <line x1="${zeX}" y1="${xDepthY}" x2="${zeX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4"/>
        <line x1="${zeX}" y1="${xClearY}" x2="${zaX}" y2="${xClearY}" stroke="#0284c7" stroke-width="1.4" stroke-dasharray="5,4"/>
        <text x="${(zsX + zeX) / 2}" y="${lblY}" fill="#dc2626" font-size="10.5" font-family="monospace" text-anchor="middle">Fz=${s.feedZ} (${s.passes} pass)</text>
      `;
    }

    // Dimension lines: Diameter D0 (vertical) and Knurl Length L (horizontal)
    const dimDiaX = stockLeft + 14;
    const dimLenY = botY + 26;

    svg.innerHTML = `
      <defs>
        <clipPath id="knurlClip">
          <rect x="${knurlLeft}" y="${topY}" width="${knurlWidth}" height="${halfD * 2}"/>
        </clipPath>
        <marker id="arrowRed" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="#dc2626"/>
        </marker>
        <marker id="dimTick" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <polygon points="0 3, 6 0, 6 6" fill="#475569"/>
        </marker>
      </defs>

      <!-- 3-Jaw Chuck -->
      <rect x="${stockLeft - 20}" y="${topY - 16}" width="20" height="18" rx="2" fill="#94a3b8" stroke="#64748b"/>
      <rect x="${stockLeft - 20}" y="${botY - 2}" width="20" height="18" rx="2" fill="#94a3b8" stroke="#64748b"/>
      <rect x="${stockLeft - 14}" y="${topY - 2}" width="14" height="${halfD * 2 + 4}" fill="#cbd5e1" stroke="#64748b"/>
      <text x="${stockLeft - 24}" y="${cy + 3}" fill="#475569" font-size="10" font-family="sans-serif" text-anchor="end">Mâm cặp</text>

      <!-- Stock -->
      ${isId
        ? `<rect x="${stockLeft}" y="${topY - 16}" width="${stockWidth}" height="16" fill="#cbd5e1" stroke="#475569" stroke-width="1.4"/>
           <rect x="${stockLeft}" y="${botY}" width="${stockWidth}" height="16" fill="#cbd5e1" stroke="#475569" stroke-width="1.4"/>
           <rect x="${stockLeft}" y="${topY}" width="${stockWidth}" height="${halfD * 2}" fill="#f1f5f9" stroke="#64748b" stroke-width="1"/>`
        : `<rect x="${stockLeft}" y="${topY}" width="${stockWidth}" height="${halfD * 2}" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>`
      }

      <!-- Knurl Zone -->
      <rect x="${knurlLeft}" y="${topY}" width="${knurlWidth}" height="${halfD * 2}" fill="rgba(217,119,6,0.14)" stroke="#d97706" stroke-width="1.4"/>
      <g clip-path="url(#knurlClip)">${hatch}</g>

      <!-- Centerline -->
      <line x1="25" y1="${cy}" x2="${W - 20}" y2="${cy}" stroke="#64748b" stroke-width="1" stroke-dasharray="12,4,2,4"/>

      <!-- Z0 Datum -->
      <line x1="${z0X}" y1="18" x2="${z0X}" y2="${H - 22}" stroke="#16a34a" stroke-width="1.2" stroke-dasharray="4,3"/>
      <text x="${z0X + 4}" y="28" fill="#16a34a" font-size="11" font-family="monospace" font-weight="600">Z0 (Mặt đầu)</text>

      <!-- Wheel & Toolpath -->
      ${wheelHtml}
      ${pathHtml}

      <!-- Dimension: Ø D0 -->
      <line x1="${dimDiaX}" y1="${topY}" x2="${dimDiaX}" y2="${botY}" stroke="#0f172a" stroke-width="1"/>
      <line x1="${dimDiaX - 4}" y1="${topY}" x2="${dimDiaX + 4}" y2="${topY}" stroke="#0f172a" stroke-width="1"/>
      <line x1="${dimDiaX - 4}" y1="${botY}" x2="${dimDiaX + 4}" y2="${botY}" stroke="#0f172a" stroke-width="1"/>
      <rect x="${dimDiaX + 4}" y="${cy - 9}" width="64" height="16" rx="3" fill="#f8fafc" opacity="0.9"/>
      <text x="${dimDiaX + 7}" y="${cy + 3}" fill="#0f172a" font-size="11.5" font-family="monospace" font-weight="600">Ø${fmtCoord(s.dBlank)}</text>

      <!-- Dimension: Knurl Length L -->
      <line x1="${zsX}" y1="${botY + 4}" x2="${zsX}" y2="${dimLenY + 5}" stroke="#64748b" stroke-width="0.9" stroke-dasharray="2,2"/>
      <line x1="${zeX}" y1="${botY + 4}" x2="${zeX}" y2="${dimLenY + 5}" stroke="#64748b" stroke-width="0.9" stroke-dasharray="2,2"/>
      <line x1="${knurlLeft}" y1="${dimLenY}" x2="${knurlLeft + knurlWidth}" y2="${dimLenY}" stroke="#0f172a" stroke-width="1.1"/>
      <text x="${(zsX + zeX) / 2}" y="${dimLenY - 5}" fill="#0f172a" font-size="11" font-family="monospace" font-weight="600" text-anchor="middle">L = ${fmt(knurlLen, 1)} mm (P=${s.pitch})</text>
      <text x="${zsX}" y="${dimLenY + 15}" fill="#475569" font-size="10.5" font-family="monospace" text-anchor="middle">Z${fmt(s.zStart, 1)}</text>
      <text x="${zeX}" y="${dimLenY + 15}" fill="#475569" font-size="10.5" font-family="monospace" text-anchor="middle">Z${fmt(s.zEnd, 1)}</text>

      <!-- X_min Callout -->
      <text x="${zeX - 4}" y="${xDepthY + 14}" fill="#b45309" font-size="10.5" font-family="monospace" font-weight="600" text-anchor="end">X_min=${fmtCoord(res.xBottom)}</text>
      ${helixOverlay}
    `;
  }

  function renderKnurlZoom(s) {
    const svg = $("knurlZoomSvg");
    if (!svg) return;
    const vx = 16, vy = 32, vw = 188, vh = 182;
    const isThread = s.method === "thread60";
    const angleDeg = isThread ? s.helixAngle : (s.pattern === "straight" ? 0 : 45);
    const rad = (angleDeg * Math.PI) / 180;
    const pxStep = Math.max(16, Math.min(36, Math.round(s.pitch * 22)));

    let patternHtml = "";
    if (s.pattern === "straight" && !isThread) {
      for (let y = vy; y < vy + vh + pxStep; y += pxStep) {
        patternHtml += `
          <rect x="${vx}" y="${y}" width="${vw}" height="${pxStep * 0.48}" fill="#e2e8f0"/>
          <rect x="${vx}" y="${y + pxStep * 0.48}" width="${vw}" height="${pxStep * 0.52}" fill="#94a3b8"/>
          <line x1="${vx}" y1="${y}" x2="${vx + vw}" y2="${y}" stroke="#475569" stroke-width="1.2"/>
        `;
      }
    } else if (s.pattern === "diagonal" || (s.pattern === "straight" && isThread)) {
      const dx = vh / Math.tan(rad);
      const stepX = pxStep / Math.sin(rad);
      for (let x = vx - Math.abs(dx) - stepX; x <= vx + vw + Math.abs(dx) + stepX; x += stepX) {
        patternHtml += `
          <polygon points="${x},${vy + vh} ${x + stepX * 0.5},${vy + vh} ${x + dx + stepX * 0.5},${vy} ${x + dx},${vy}" fill="#e2e8f0"/>
          <polygon points="${x + stepX * 0.5},${vy + vh} ${x + stepX},${vy + vh} ${x + dx + stepX},${vy} ${x + dx + stepX * 0.5},${vy}" fill="#94a3b8"/>
          <line x1="${x}" y1="${vy + vh}" x2="${x + dx}" y2="${vy}" stroke="#475569" stroke-width="1.2"/>
        `;
      }
    } else {
      // Diamond 3D-shaded pyramids based on helix angle
      const cellW = pxStep / Math.sin(rad);
      const cellH = pxStep / Math.cos(rad);
      const cols = Math.ceil(vw / cellW) + 2;
      const rows = Math.ceil(vh / cellH) + 2;
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const cx = vx + c * cellW + (r % 2 === 0 ? 0 : cellW * 0.5);
          const cy = vy + r * (cellH * 0.5);
          const hw = cellW * 0.5;
          const hh = cellH * 0.5;
          // Top-left bright facet, bottom-right shadow facet
          patternHtml += `
            <polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy}" fill="#f8fafc" stroke="#64748b" stroke-width="0.6"/>
            <polygon points="${cx},${cy - hh} ${cx - hw},${cy} ${cx},${cy}" fill="#e2e8f0" stroke="#64748b" stroke-width="0.6"/>
            <polygon points="${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy}" fill="#cbd5e1" stroke="#64748b" stroke-width="0.6"/>
            <polygon points="${cx + hw},${cy} ${cx},${cy + hh} ${cx},${cy}" fill="#94a3b8" stroke="#64748b" stroke-width="0.6"/>
            <polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}" fill="none" stroke="#475569" stroke-width="1.1"/>
          `;
        }
      }
    }

    const patLabel = s.pattern === "diamond" ? "Ca-rô" : (s.pattern === "straight" && !isThread ? "Thẳng" : "Chéo");
    svg.innerHTML = `
      <defs>
        <clipPath id="zoomClip">
          <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="8"/>
        </clipPath>
      </defs>
      <text x="110" y="21" fill="#0f172a" font-size="11" font-family="sans-serif" font-weight="700" text-anchor="middle">CHIẾU LƯỚI NHÁM (ZOOM)</text>
      <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="8" fill="#cbd5e1" stroke="#64748b" stroke-width="1.4"/>
      <g clip-path="url(#zoomClip)">${patternHtml}</g>
      <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="8" fill="none" stroke="#475569" stroke-width="1.5"/>
      <text x="110" y="234" fill="#0f172a" font-size="11" font-family="monospace" font-weight="600" text-anchor="middle">${patLabel} · Góc ${angleDeg}°</text>
      <text x="110" y="251" fill="#475569" font-size="10.5" font-family="monospace" text-anchor="middle">P=${s.pitch}mm · Sâu=${s.depthPerSide}mm</text>
    `;
  }

  function renderSetupSheet(s, res) {
    const el = $("setupSheet");
    const matName = $("material").options[$("material").selectedIndex]?.text || s.material;
    el.innerHTML = `
      <h1>PHIẾU SETUP LĂN NHÁM CNC — O${s.progNumber}</h1>
      <p class="setup-sub">Hệ ĐK: ${s.controller.toUpperCase()} | Vật liệu: ${matName} | Gốc: ${s.wcs || "Mặc định"}</p>
      <table>
        <tr><th>Dao lăn nhám</th><td>${s.toolCode}</td><th>ĐK phôi D0</th><td>Ø${fmtCoord(s.dBlank)} mm</td></tr>
        <tr><th>Phương pháp</th><td>${s.method.toUpperCase()} (${s.pattern.toUpperCase()})</td><th>Bước nhám Pitch</th><td>${s.pitch} mm</td></tr>
        <tr><th>Tọa độ Z</th><td>Z${fmt(s.zStart, 1)} → Z${fmt(s.zEnd, 1)} mm</td><th>X Đáy răng (Min X)</th><td>X${fmtCoord(res.xBottom)} mm (${s.passes} pass)</td></tr>
        <tr><th>Tốc độ S</th><td>G97 S${s.spindleRpm} ${s.spindleDir}</td><th>Bước tiến F</th><td>Fx ${s.feedX.toFixed(2)} / Fz ${s.feedZ.toFixed(2)} mm/vòng</td></tr>
        ${s.preTurn ? `<tr><th>Tiện tinh D0</th><td>${s.preTurnTool} (F${s.preTurnFeed.toFixed(2)})</td><th>Vát mép đầu</th><td>C${s.preTurnChamfer} mm</td></tr>` : ""}
      </table>
      <pre>${res.code}</pre>
    `;
  }

  function update() {
    if (typeof stopAnimation === "function" && animFrameId) stopAnimation();
    const s = readState();
    syncDepthAndUI(s);
    const res = generateGCode(s);
    lastGCode = res.code;
    $("gcodeOutput").textContent = res.code;
    $("lineCount").textContent = `${res.lineCount} dòng`;
    updateMetrics(s, res);
    renderSvg(s, res);
    renderKnurlZoom(s);
    renderSetupSheet(s, res);
    if (typeof saveLastState === "function") saveLastState(s);
  }

  function downloadFile(ext) {
    const prog = ($("progNumber").value || "0105").trim();
    const blob = new Blob([lastGCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `O${prog}_KNURL.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải O${prog}_KNURL.${ext}`);
  }

  // Event bindings
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => {
      if (["spindleRpm", "feedX", "feedZ", "dwellSec", "passes"].includes(el.id)) {
        $("autoCut").checked = false;
      }
      if (["dBlank", "pitch"].includes(el.id)) {
        applyAutoCuttingParams();
      }
      update();
    });
    el.addEventListener("change", () => {
      if (["material", "autoCut", "dBlank", "pitch", "method", "helixAngle", "pattern"].includes(el.id)) {
        applyAutoCuttingParams();
      }
      update();
    });
  });

  document.querySelectorAll("#pitchPresets .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("pitch").value = btn.dataset.pitch;
      applyAutoCuttingParams();
      update();
    });
  });

  $("btnApplyOptD").addEventListener("click", () => {
    $("dBlank").value = optimalD0.toFixed(2);
    applyAutoCuttingParams();
    update();
    showToast(`Đã cập nhật D0 = ${optimalD0.toFixed(2)} mm`);
  });

  function stopAnimation() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    const tool = $("animTool");
    if (tool) tool.setAttribute("transform", "translate(0,0)");
    $("btnAnimate").textContent = "▶ Chạy thử";
  }

  $("btnAnimate").addEventListener("click", () => {
    if (animFrameId) {
      stopAnimation();
      return;
    }
    const tool = $("animTool");
    if (!tool || animWaypoints.length < 2) return;
    $("btnAnimate").textContent = "■ Dừng";
    let seg = 0;
    let segStart = performance.now();

    function stepAnim(now) {
      if (!animFrameId) return;
      const from = animWaypoints[seg];
      const to = animWaypoints[seg + 1];
      if (!to) {
        stopAnimation();
        return;
      }
      const t = Math.min(1, (now - segStart) / to.ms);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      tool.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      if (t >= 1) {
        seg++;
        segStart = now;
        if (seg >= animWaypoints.length - 1) {
          stopAnimation();
          return;
        }
      }
      animFrameId = requestAnimationFrame(stepAnim);
    }
    animFrameId = requestAnimationFrame(stepAnim);
  });

  $("btnCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastGCode);
      showToast("Đã copy G-Code vào clipboard");
    } catch {
      showToast("Không thể copy tự động, hãy bôi đen và Ctrl+C");
    }
  });

  $("btnDownloadNc").addEventListener("click", () => downloadFile("nc"));
  $("btnDownloadTxt").addEventListener("click", () => downloadFile("txt"));

  const PRESET_KEY = "cnc_knurl_presets_v1";
  const LAST_KEY = "cnc_knurl_last_v1";

  function applyStateObject(data) {
    if (!data || typeof data !== "object") return;
    Object.entries(data).forEach(([k, v]) => {
      const el = $(k);
      if (!el) return;
      if (el.type === "checkbox") el.checked = Boolean(v);
      else el.value = v;
    });
  }

  function saveLastState(s) {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ ...s, autoCut: $("autoCut").checked }));
    } catch {}
  }

  function loadInitialState() {
    try {
      if (location.hash.startsWith("#cfg=")) {
        const raw = decodeURIComponent(location.hash.slice(5));
        const parsed = JSON.parse(atob(raw));
        applyStateObject(parsed);
        return;
      }
      const saved = localStorage.getItem(LAST_KEY);
      if (saved) applyStateObject(JSON.parse(saved));
    } catch {}
  }

  function loadPresetsMap() {
    try {
      return JSON.parse(localStorage.getItem(PRESET_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function refreshPresetSelect(selectedName = "") {
    const sel = $("presetSelect");
    const map = loadPresetsMap();
    const names = Object.keys(map).sort();
    sel.innerHTML = `<option value="">-- Cấu hình đã lưu (${names.length}) --</option>` +
      names.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">${n}</option>`).join("");
    if (selectedName && map[selectedName]) sel.value = selectedName;
  }

  $("btnSavePreset").addEventListener("click", () => {
    const s = readState();
    const defName = `Ø${s.dBlank} P${s.pitch} ${s.material}`;
    const name = prompt("Nhập tên cấu hình để lưu:", defName);
    if (!name || !name.trim()) return;
    const key = name.trim();
    const map = loadPresetsMap();
    map[key] = { ...s, autoCut: $("autoCut").checked };
    localStorage.setItem(PRESET_KEY, JSON.stringify(map));
    refreshPresetSelect(key);
    showToast(`Đã lưu: ${key}`);
  });

  $("presetSelect").addEventListener("change", () => {
    const key = $("presetSelect").value;
    if (!key) return;
    const map = loadPresetsMap();
    const data = map[key];
    if (!data) return;
    applyStateObject(data);
    update();
    showToast(`Đã nạp: ${key}`);
  });

  $("btnDelPreset").addEventListener("click", () => {
    const key = $("presetSelect").value;
    if (!key) return;
    const map = loadPresetsMap();
    delete map[key];
    localStorage.setItem(PRESET_KEY, JSON.stringify(map));
    refreshPresetSelect();
    showToast(`Đã xóa: ${key}`);
  });

  $("btnShareLink").addEventListener("click", async () => {
    try {
      const s = { ...readState(), autoCut: $("autoCut").checked };
      const encoded = encodeURIComponent(btoa(JSON.stringify(s)));
      const url = `${location.origin}${location.pathname}#cfg=${encoded}`;
      await navigator.clipboard.writeText(url);
      showToast("Đã copy link cấu hình");
    } catch {
      showToast("Không thể tạo link chia sẻ");
    }
  });

  $("btnPrintSetup").addEventListener("click", () => {
    window.print();
  });

  $("btnReset").addEventListener("click", () => {
    applyStateObject(DEFAULTS);
    localStorage.removeItem(LAST_KEY);
    if (location.hash) history.replaceState(null, "", location.pathname);
    update();
    showToast("Đã khôi phục thông số mặc định");
  });

  loadInitialState();
  refreshPresetSelect();
  update();
})();
