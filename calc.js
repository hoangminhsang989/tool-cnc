(() => {
  const $ = (id) => document.getElementById(id);

  // Material database: kc (N/mm2 specific cutting force), vcBase (m/min for Carbide rough/finish)
  const MAT_DB = {
    alu:        { name: "Nhôm (Al 6061)",      kc: 750,  vcTurn: 220, vcThread: 120, vcMill: 200, vcDrill: 90,  vcTap: 18, fTurn: 0.22, fzMill: 0.08, fDrill: 0.16 },
    brass:      { name: "Đồng thau (Brass)",   kc: 850,  vcTurn: 180, vcThread: 100, vcMill: 160, vcDrill: 75,  vcTap: 15, fTurn: 0.20, fzMill: 0.07, fDrill: 0.15 },
    cast_iron:  { name: "Gang xám (FC250)",    kc: 1300, vcTurn: 140, vcThread: 75,  vcMill: 120, vcDrill: 45,  vcTap: 10, fTurn: 0.25, fzMill: 0.08, fDrill: 0.18 },
    mild_steel: { name: "Thép mềm (SS400)",    kc: 1800, vcTurn: 160, vcThread: 95,  vcMill: 130, vcDrill: 55,  vcTap: 12, fTurn: 0.22, fzMill: 0.06, fDrill: 0.15 },
    c45:        { name: "Thép C45 / 40X",      kc: 2100, vcTurn: 130, vcThread: 75,  vcMill: 105, vcDrill: 42,  vcTap: 10, fTurn: 0.18, fzMill: 0.05, fDrill: 0.12 },
    inox:       { name: "Inox 304",            kc: 2450, vcTurn: 95,  vcThread: 55,  vcMill: 75,  vcDrill: 26,  vcTap: 6,  fTurn: 0.15, fzMill: 0.04, fDrill: 0.10 },
    hardened:   { name: "Thép sau nhiệt (45-55HRC)", kc: 3200, vcTurn: 65, vcThread: 35, vcMill: 55, vcDrill: 16, vcTap: 4, fTurn: 0.10, fzMill: 0.03, fDrill: 0.06 },
  };

  const CALC_KEY = "cnc_calc_last_v1";
  const TAB_KEY = "cnc_active_tab_v1";
  const CALC_IDS = ["cOp", "cMat", "cToolMat", "cCutType", "cDia", "cVc", "cRpm", "cFz", "cVf", "cFlutes", "cNoseR", "cAp", "cAe", "cCutLen"];

  function saveCalcState() {
    try {
      const data = {};
      CALC_IDS.forEach((id) => { if ($(id)) data[id] = $(id).value; });
      localStorage.setItem(CALC_KEY, JSON.stringify(data));
    } catch {}
  }

  function loadCalcState() {
    try {
      const raw = localStorage.getItem(CALC_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      CALC_IDS.forEach((id) => {
        if ($(id) && data[id] !== undefined) $(id).value = data[id];
      });
      return true;
    } catch {
      return false;
    }
  }

  let lockSync = false;

  const CHIP_FACTORS = {
    carbide:          { vc: 1.00, f: 1.00 },
    cermet:           { vc: 1.25, f: 0.75 },
    carbide_uncoated: { vc: 0.75, f: 0.90 },
    hss:              { vc: 0.35, f: 0.85 },
    cbn:              { vc: 2.10, f: 0.70 },
    pcd:              { vc: 2.40, f: 0.90 },
  };

  function guessMetricPitch(d) {
    if (d <= 3.2) return 0.5;
    if (d <= 4.2) return 0.7;
    if (d <= 5.2) return 0.8;
    if (d <= 6.5) return 1.0;
    if (d <= 8.5) return 1.25;
    if (d <= 10.5) return 1.5;
    if (d <= 12.5) return 1.75;
    if (d <= 16.5) return 2.0;
    return 2.5;
  }

  function applyCalcPreset(keepPitchArg) {
    const keepPitch = keepPitchArg === true;
    const op = $("cOp").value;
    const matKey = $("cMat").value;
    const mat = MAT_DB[matKey] || MAT_DB.mild_steel;
    const toolMat = $("cToolMat").value;
    const cutType = $("cCutType").value; // rough | finish

    if (op === "tapping") {
      const d = Math.max(1, parseFloat($("cDia").value) || 10);
      const vc = mat.vcTap;
      const rpm = Math.max(30, Math.round((vc * 1000) / (Math.PI * d)));
      const p = keepPitch ? Math.max(0.2, parseFloat($("cFz").value) || guessMetricPitch(d)) : guessMetricPitch(d);
      $("cVc").value = vc;
      $("cRpm").value = rpm;
      $("cFz").value = p;
      $("cVf").value = Math.round(rpm * p);
      updateCalc();
      return;
    }

    if (op === "threading" || op === "threading_id") {
      const d = Math.max(2, parseFloat($("cDia").value) || 20);
      const p = keepPitch ? Math.max(0.2, parseFloat($("cFz").value) || guessMetricPitch(d)) : guessMetricPitch(d);
      const chip = CHIP_FACTORS[toolMat] || CHIP_FACTORS.carbide;
      const maxSafeRpm = Math.floor(2200 / p);
      const idFactor = op === "threading_id" ? 0.85 : 1.0;
      const targetRpm = Math.round((mat.vcThread * chip.vc * idFactor * 1000) / (Math.PI * d));
      const rpm = Math.max(80, Math.min(maxSafeRpm, targetRpm));
      const vc = ((Math.PI * d * rpm) / 1000).toFixed(1);
      $("cVc").value = vc;
      $("cRpm").value = rpm;
      $("cFz").value = p;
      $("cVf").value = Math.round(rpm * p);
      updateCalc();
      return;
    }

    const chip = CHIP_FACTORS[toolMat] || CHIP_FACTORS.carbide;
    let vcFactor = chip.vc;
    // CBN is for hardened steel / cast iron; PCD is for non-ferrous (alu / brass)
    if (toolMat === "cbn" && matKey !== "hardened" && matKey !== "cast_iron") vcFactor = 1.1;
    if (toolMat === "pcd" && matKey !== "alu" && matKey !== "brass") vcFactor = 1.0;

    const finishVcFactor = cutType === "finish" ? 1.25 : 1.0;
    const finishFeedFactor = (cutType === "finish" ? 0.55 : 1.0) * chip.f;

    let baseVc = mat.vcTurn;
    let baseF = mat.fTurn;
    if (op === "milling") {
      baseVc = mat.vcMill;
      baseF = mat.fzMill;
    } else if (op === "drilling") {
      baseVc = mat.vcDrill;
      baseF = mat.fDrill;
    } else if (op === "grooving") {
      baseVc = mat.vcTurn * 0.72;
      baseF = matKey === "inox" || matKey === "hardened" ? 0.05 : 0.08;
    }

    const vc = Math.max(5, Math.round(baseVc * vcFactor * finishVcFactor));
    const d = Math.max(0.5, parseFloat($("cDia").value) || 30);
    const rpm = Math.round((vc * 1000) / (Math.PI * d));

    $("cVc").value = vc;
    $("cRpm").value = rpm;

    if (op === "milling") {
      const fz = +(baseF * finishFeedFactor).toFixed(3);
      const z = Math.max(1, parseInt($("cFlutes").value, 10) || 4);
      $("cFz").value = fz;
      $("cVf").value = Math.round(rpm * fz * z);
      $("cAp").value = cutType === "finish" ? 0.3 : +(d * 0.5).toFixed(1);
      $("cAe").value = cutType === "finish" ? +(d * 0.15).toFixed(1) : +(d * 0.6).toFixed(1);
    } else if (op === "drilling") {
      const f = +(baseF * (d < 6 ? 0.65 : d > 16 ? 1.2 : 1.0)).toFixed(3);
      $("cFz").value = f;
      $("cVf").value = Math.round(rpm * f);
    } else if (op === "grooving") {
      const f = +(baseF * (cutType === "finish" ? 0.75 : 1.0)).toFixed(2);
      $("cFz").value = f;
      $("cVf").value = Math.round(rpm * f);
      $("cAp").value = 3.0;
    } else {
      const f = +(baseF * finishFeedFactor).toFixed(2);
      $("cFz").value = f;
      $("cVf").value = Math.round(rpm * f);
      $("cAp").value = cutType === "finish" ? 0.25 : 1.5;
    }
    updateCalc();
  }

  function syncOpFields() {
    const op = $("cOp").value;
    const isThread = op === "tapping" || op === "threading" || op === "threading_id";
    $("cFlutesWrap").style.display = op === "milling" ? "flex" : "none";
    $("cAeWrap").style.display = op === "milling" ? "flex" : "none";
    $("cApWrap").style.display = (op === "drilling" || isThread) ? "none" : "flex";
    $("cNoseWrap").style.display = op === "turning" ? "flex" : "none";

    $("cDiaLabel").textContent = (op === "turning" || op === "grooving") ? "ĐK phôi D (mm)" : (isThread ? "ĐK ren M (mm)" : "ĐK dao / mũi D (mm)");
    $("cFeedLabel").textContent = op === "milling" ? "Bước tiến/răng fz (mm)" : (isThread ? "Bước ren P (mm/vòng)" : "Bước tiến f (mm/vòng)");
    if ($("cApLabel")) $("cApLabel").textContent = op === "grooving" ? "Rộng lưỡi cắt W (mm)" : "Chiều sâu cắt ap (mm)";
    if ($("cTpiBtn")) $("cTpiBtn").style.display = isThread ? "inline" : "none";
  }

  function buildCalcSnippet() {
    const op = $("cOp").value;
    const rpm = Math.round(parseFloat($("cRpm").value) || 1000);
    const fz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
    const vf = Math.round(parseFloat($("cVf").value) || 200);
    const cutLen = Math.max(1, parseFloat($("cCutLen")?.value) || 50);
    if (op === "milling") {
      return `G94 S${rpm} M03\nG01 F${vf}.`;
    }
    if (op === "grooving") {
      const d = Math.max(2, parseFloat($("cDia").value) || 30);
      return `G99 G97 S${rpm} M03\nG00 X${(d + 2).toFixed(1)} Z-${cutLen}.\nG75 R0.5\nG75 X0. P1500 F${fz.toFixed(2)}`;
    }
    if (op === "threading" || op === "threading_id") {
      const d = Math.max(2, parseFloat($("cDia").value) || 20);
      const isId = op === "threading_id";
      const hThread = (isId ? 0.5413 : 0.6134) * fz;
      const xTarget = isId ? d.toFixed(2) : Math.max(0.5, d - 2 * hThread).toFixed(2);
      const xStart = isId ? Math.max(1.0, d - 2 * hThread - 2.0).toFixed(1) : (d + 2).toFixed(1);
      const tPasses = Math.max(4, Math.min(14, Math.ceil(hThread / (isId ? 0.08 : 0.10))));
      const pUm = Math.round(hThread * 1000);
      const qUm = Math.round((hThread / Math.sqrt(tPasses)) * 1000);
      return `G99 G97 S${rpm} M03\nG00 X${xStart} Z3.\nG76 P020060 Q100 R0.05\nG76 X${xTarget} Z-${cutLen}. P${pUm} Q${qUm} F${fz}`;
    }
    if (op === "tapping") {
      return `M29 S${rpm}\nG99 G84 Z-${cutLen}. R3. F${fz}`;
    }
    if (op === "drilling") {
      return `G99 G97 S${rpm} M03\nG83 Z-${cutLen}. Q3000 R2. F${fz.toFixed(3)}`;
    }
    return `G99 G97 S${rpm} M03\nG01 F${fz.toFixed(2)}`;
  }

  function updateCalc() {
    syncOpFields();
    const op = $("cOp").value;
    const mat = MAT_DB[$("cMat").value] || MAT_DB.mild_steel;
    const d = Math.max(0.5, parseFloat($("cDia").value) || 30);
    const rpm = Math.max(1, parseFloat($("cRpm").value) || 1000);
    const vc = (Math.PI * d * rpm) / 1000;
    const fOrFz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
    const flutes = Math.max(1, parseInt($("cFlutes").value, 10) || 4);
    const ap = Math.max(0.05, parseFloat($("cAp").value) || 1.0);
    const ae = Math.max(0.1, parseFloat($("cAe").value) || 10);
    const noseR = Math.max(0.1, parseFloat($("cNoseR").value) || 0.4);

    let vf = 0;
    let mrr = 0; // cm3/min
    if (op === "milling") {
      vf = rpm * fOrFz * flutes;
      mrr = (ap * ae * vf) / 1000;
    } else if (op === "drilling" || op === "tapping" || op === "threading" || op === "threading_id") {
      vf = rpm * fOrFz;
      mrr = (op === "tapping" || op === "threading" || op === "threading_id") ? 0 : (Math.PI * (d * d) / 4) * vf / 1000;
    } else {
      vf = rpm * fOrFz;
      mrr = vc * ap * fOrFz; // cm3/min = (m/min * mm * mm) = cm3/min
    }

    // Power Pc (kW) = (MRR * kc) / (60 * 1000 * eta) with eta=0.8
    const powerKw = (op === "tapping" || op === "threading" || op === "threading_id") ? (rpm * fOrFz * d * 0.002) : (mrr * mat.kc) / (60 * 1000 * 0.8);

    // Theoretical surface roughness Ra (um) for turning: Ra ≈ (f^2 / (32 * r)) * 1000
    const raUm = op === "turning" ? ((fOrFz * fOrFz) / (32 * noseR)) * 1000 : null;

    $("cResRpm").textContent = `${Math.round(rpm)} RPM`;
    $("cResVf").textContent = `${Math.round(vf)} mm/ph`;
    $("cResMrr").textContent = `${mrr.toFixed(1)} cm³/ph`;
    $("cResPower").textContent = `${powerKw.toFixed(2)} kW`;

    const cutLen = Math.max(1, parseFloat($("cCutLen")?.value) || 50);
    const cutSec = Math.max(0.5, (cutLen / Math.max(1, vf)) * 60);
    const timeTxt = cutSec >= 60
      ? `${Math.floor(cutSec / 60)}p ${Math.round(cutSec % 60)}s`
      : `${cutSec.toFixed(1)}s`;

    if (raUm !== null) {
      $("cResExtra").textContent = `Thời gian cắt (L=${cutLen}mm): ${timeTxt} · Độ bóng Ra ≈ ${raUm.toFixed(2)} µm (R=${noseR}) · kc=${mat.kc} N/mm²`;
    } else if (op === "grooving") {
      const partSec = Math.max(0.5, ((d / 2) / Math.max(1, vf)) * 60);
      $("cResExtra").textContent = `Cắt đứt / Rãnh Ø${d} (lưỡi W=${ap}mm): Thời gian tới tâm ≈ ${partSec.toFixed(1)}s · Nhấp bẻ phoi G75 P1500 (1.5mm/nhát)`;
    } else if (op === "milling") {
      $("cResExtra").textContent = `Thời gian cắt (L=${cutLen}mm): ${timeTxt} · f=${(fOrFz * flutes).toFixed(3)} mm/v (${flutes} me) · kc=${mat.kc} N/mm²`;
    } else if (op === "threading") {
      const hThread = 0.6134 * fOrFz;
      const xCore = Math.max(0.5, d - 2 * hThread).toFixed(2);
      const tPasses = Math.max(4, Math.min(14, Math.ceil(hThread / 0.10)));
      $("cResExtra").textContent = `Tiện ren ngoài M${d}×${fOrFz}: Chiều cao H=${hThread.toFixed(3)} mm · Chân ren X_min=${xCore} mm · Chia ~${tPasses} lát (G76)`;
    } else if (op === "threading_id") {
      const hThread = 0.5413 * fOrFz;
      const dHole = Math.max(0.5, d - 2 * hThread).toFixed(2);
      const tPasses = Math.max(4, Math.min(14, Math.ceil(hThread / 0.08)));
      $("cResExtra").textContent = `Tiện ren trong M${d}×${fOrFz}: Tiện lỗ trước Ø${dHole} mm · Chiều cao H=${hThread.toFixed(3)} mm · X_max=${d.toFixed(2)} mm (~${tPasses} lát G76)`;
    } else if (op === "tapping") {
      const drillD = Math.max(0.5, d - fOrFz).toFixed(2);
      $("cResExtra").textContent = `Taro M${d}×${fOrFz}: Khoan lỗ trước Ø${drillD} mm · Thời gian vào/ra (L=${cutLen}mm): ≈${(cutSec * 2).toFixed(1)}s · Chu trình G84 Z-${cutLen}. F${fOrFz}`;
    } else {
      $("cResExtra").textContent = `Thời gian khoan (L=${cutLen}mm): ${timeTxt} · Nếu taro bước P=${fOrFz}mm → Vf=${Math.round(rpm * fOrFz)} mm/ph`;
    }
    saveCalcState();

    const warns = [];
    const toolMat = $("cToolMat").value;
    const matKey = $("cMat").value;
    if (toolMat === "pcd" && matKey !== "alu" && matKey !== "brass") {
      warns.push("Chíp PCD (Kim cương) chỉ dùng cho Nhôm / Đồng / Phi kim — cắt thép sẽ phản ứng nhiệt hỏng chíp ngay!");
    }
    if (toolMat === "cbn" && (matKey === "alu" || matKey === "brass" || matKey === "mild_steel")) {
      warns.push("Chíp CBN chuyên dùng cho thép sau nhiệt (>45 HRC) hoặc gang cứng, không hiệu quả trên nhôm/thép mềm.");
    }
    if (powerKw > 7.5) {
      warns.push(`Công suất cắt Pc = ${powerKw.toFixed(2)} kW khá lớn — kiểm tra công suất motor trục chính hoặc giảm ap / f.`);
    }
    if (op === "turning" && fOrFz > noseR * 0.7) {
      warns.push(`Bước tiến f (${fOrFz}) lớn hơn 0.7 × R mũi dao (${noseR}) — bề mặt dễ bị sọc thô (Ra cao).`);
    }
    if (rpm > 4000) {
      warns.push(`Số vòng quay S = ${Math.round(rpm)} RPM khá cao — kiểm tra giới hạn RPM tối đa của trục chính (nhiều máy tiện chỉ đạt 3000–4000 RPM).`);
    }
    if (op === "tapping" && rpm > 800) {
      warns.push(`Taro ren S = ${Math.round(rpm)} RPM hơi cao — dễ gãy mũi taro nếu máy đồng bộ chậm; khuyến nghị S ≤ 600–800 RPM.`);
    }
    if ((op === "threading" || op === "threading_id") && vf > 2500) {
      const recS = Math.floor(2200 / fOrFz);
      warns.push(`Tốc độ chạy bàn Z khi tiện ren (S × P = ${Math.round(vf)} mm/ph) quá cao, dễ lệch bước ren hoặc báo lỗi servo! Nên giảm S ≤ ${recS} RPM.`);
    }

    const cw = $("cWarningsBox");
    if (cw) {
      if (warns.length === 0) {
        cw.style.display = "none";
        cw.innerHTML = "";
      } else {
        cw.style.display = "flex";
        cw.innerHTML = warns.map((w) => `<div>• ${w}</div>`).join("");
      }
    }

    if ($("cSnippetPreview")) {
      $("cSnippetPreview").textContent = buildCalcSnippet();
    }
  }

  function bindCalcEvents() {
    if (!$("cOp")) return;

    $("cOp").addEventListener("change", applyCalcPreset);
    $("cMat").addEventListener("change", applyCalcPreset);
    $("cToolMat").addEventListener("change", applyCalcPreset);
    $("cCutType").addEventListener("change", applyCalcPreset);

    $("cDia").addEventListener("input", () => {
      if (lockSync) return;
      lockSync = true;
      const d = Math.max(0.5, parseFloat($("cDia").value) || 30);
      const vc = Math.max(1, parseFloat($("cVc").value) || 100);
      const rpm = Math.round((vc * 1000) / (Math.PI * d));
      $("cRpm").value = rpm;
      const op = $("cOp").value;
      const fz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
      const z = op === "milling" ? Math.max(1, parseInt($("cFlutes").value, 10) || 4) : 1;
      $("cVf").value = Math.round(rpm * fz * z);
      lockSync = false;
      updateCalc();
    });

    $("cVc").addEventListener("input", () => {
      if (lockSync) return;
      lockSync = true;
      const d = Math.max(0.5, parseFloat($("cDia").value) || 30);
      const vc = Math.max(1, parseFloat($("cVc").value) || 100);
      const rpm = Math.round((vc * 1000) / (Math.PI * d));
      $("cRpm").value = rpm;
      const op = $("cOp").value;
      const fz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
      const z = op === "milling" ? Math.max(1, parseInt($("cFlutes").value, 10) || 4) : 1;
      $("cVf").value = Math.round(rpm * fz * z);
      lockSync = false;
      updateCalc();
    });

    $("cRpm").addEventListener("input", () => {
      if (lockSync) return;
      lockSync = true;
      const d = Math.max(0.5, parseFloat($("cDia").value) || 30);
      const rpm = Math.max(1, parseFloat($("cRpm").value) || 1000);
      $("cVc").value = ((Math.PI * d * rpm) / 1000).toFixed(1);
      const op = $("cOp").value;
      const fz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
      const z = op === "milling" ? Math.max(1, parseInt($("cFlutes").value, 10) || 4) : 1;
      $("cVf").value = Math.round(rpm * fz * z);
      lockSync = false;
      updateCalc();
    });

    $("cFz").addEventListener("input", () => {
      if (lockSync) return;
      lockSync = true;
      const rpm = Math.max(1, parseFloat($("cRpm").value) || 1000);
      const fz = Math.max(0.001, parseFloat($("cFz").value) || 0.15);
      const op = $("cOp").value;
      const z = op === "milling" ? Math.max(1, parseInt($("cFlutes").value, 10) || 4) : 1;
      $("cVf").value = Math.round(rpm * fz * z);
      lockSync = false;
      updateCalc();
    });

    $("cVf").addEventListener("input", () => {
      if (lockSync) return;
      lockSync = true;
      const rpm = Math.max(1, parseFloat($("cRpm").value) || 1000);
      const vf = Math.max(1, parseFloat($("cVf").value) || 100);
      const op = $("cOp").value;
      const z = op === "milling" ? Math.max(1, parseInt($("cFlutes").value, 10) || 4) : 1;
      $("cFz").value = (vf / (rpm * z)).toFixed(3);
      lockSync = false;
      updateCalc();
    });

    ["cFlutes", "cAp", "cAe", "cNoseR", "cCutLen"].forEach((id) => {
      $(id).addEventListener("input", updateCalc);
      $(id).addEventListener("change", updateCalc);
    });

    $("btnCalcSuggest").addEventListener("click", applyCalcPreset);

    $("btnCalcReset").addEventListener("click", () => {
      $("cOp").value = "turning";
      $("cMat").value = "mild_steel";
      $("cToolMat").value = "carbide";
      $("cCutType").value = "rough";
      $("cDia").value = "30";
      $("cFlutes").value = "4";
      $("cNoseR").value = "0.4";
      $("cCutLen").value = "50";
      try { localStorage.removeItem(CALC_KEY); } catch {}
      applyCalcPreset();
    });

    if ($("cTpiBtn")) {
      $("cTpiBtn").addEventListener("click", () => {
        const val = prompt("Nhập số ren / inch (TPI) để đổi sang mm (vd 11, 14, 16, 20):", "16");
        if (!val) return;
        const tpi = parseFloat(val);
        if (!Number.isFinite(tpi) || tpi <= 0) return;
        const mm = +(25.4 / tpi).toFixed(4);
        $("cFz").value = mm;
        const rpm = Math.max(1, parseFloat($("cRpm").value) || 1000);
        $("cVf").value = Math.round(rpm * mm);
        updateCalc();
      });
    }

    $("btnCalcCopySF").addEventListener("click", async () => {
      const snippet = buildCalcSnippet();
      try {
        await navigator.clipboard.writeText(snippet);
        const t = $("toast");
        if (t) {
          t.textContent = `Đã copy: ${snippet.replace(/\n/g, " | ")}`;
          t.classList.add("show");
          clearTimeout(t._timer);
          t._timer = setTimeout(() => t.classList.remove("show"), 2200);
        }
      } catch {}
    });

    // Tab switching
    const switchTab = (tab) => {
      const isCalc = tab === "calc";
      $("tabKnurl").classList.toggle("active", !isCalc);
      $("tabCalc").classList.toggle("active", isCalc);
      $("knurlView").style.display = isCalc ? "none" : "grid";
      $("calcView").style.display = isCalc ? "grid" : "none";
      $("knurlTopActions").style.display = isCalc ? "none" : "flex";
      try { localStorage.setItem(TAB_KEY, tab); } catch {}
    };

    $("tabKnurl").addEventListener("click", () => switchTab("knurl"));
    $("tabCalc").addEventListener("click", () => switchTab("calc"));

    // Interactive reference tables: click material row or tapping drill cell to apply
    const refTables = document.querySelectorAll("#calcView .ref-table");
    if (refTables[0]) {
      const matOrder = ["alu", "brass", "mild_steel", "c45", "inox", "hardened"];
      refTables[0].querySelectorAll("tbody tr").forEach((tr, idx) => {
        const key = matOrder[idx];
        if (!key) return;
        tr.classList.add("clickable-row");
        tr.title = "Bấm để chọn nhanh vật liệu này";
        tr.addEventListener("click", () => {
          $("cMat").value = key;
          applyCalcPreset();
        });
      });
    }
    if (refTables[1]) {
      refTables[1].querySelectorAll("thead th:not(:first-child)").forEach((th) => {
        const m = th.textContent.trim().match(/^M(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)$/);
        if (!m) return;
        th.classList.add("clickable-cell");
        th.title = `Bấm để tính Taro ${th.textContent.trim()}`;
        th.addEventListener("click", () => {
          $("cOp").value = "tapping";
          $("cDia").value = m[1];
          $("cFz").value = m[2];
          applyCalcPreset(true);
        });
      });
      refTables[1].querySelectorAll("tbody td:not(:first-child)").forEach((td) => {
        const dVal = parseFloat(td.textContent);
        if (!Number.isFinite(dVal)) return;
        td.classList.add("clickable-cell");
        td.title = `Bấm để tính chế độ khoan mũi Ø${dVal} mm`;
        td.addEventListener("click", () => {
          $("cOp").value = "drilling";
          $("cDia").value = dVal;
          applyCalcPreset();
        });
      });
    }

    if (loadCalcState()) updateCalc();
    else applyCalcPreset();

    try {
      if (localStorage.getItem(TAB_KEY) === "calc") switchTab("calc");
    } catch {}
  }

  bindCalcEvents();
})();
