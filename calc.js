(() => {
  const $ = (id) => document.getElementById(id);

  // Material database: kc (N/mm2 specific cutting force), vcBase (m/min for Carbide rough/finish)
  const MAT_DB = {
    alu:        { name: "Nhôm (Al 6061)",      kc: 750,  vcTurn: 220, vcMill: 200, vcDrill: 90,  fTurn: 0.22, fzMill: 0.08, fDrill: 0.16 },
    brass:      { name: "Đồng thau (Brass)",   kc: 850,  vcTurn: 180, vcMill: 160, vcDrill: 75,  fTurn: 0.20, fzMill: 0.07, fDrill: 0.15 },
    cast_iron:  { name: "Gang xám (FC250)",    kc: 1300, vcTurn: 140, vcMill: 120, vcDrill: 45,  fTurn: 0.25, fzMill: 0.08, fDrill: 0.18 },
    mild_steel: { name: "Thép mềm (SS400)",    kc: 1800, vcTurn: 160, vcMill: 130, vcDrill: 55,  fTurn: 0.22, fzMill: 0.06, fDrill: 0.15 },
    c45:        { name: "Thép C45 / 40X",      kc: 2100, vcTurn: 130, vcMill: 105, vcDrill: 42,  fTurn: 0.18, fzMill: 0.05, fDrill: 0.12 },
    inox:       { name: "Inox 304",            kc: 2450, vcTurn: 95,  vcMill: 75,  vcDrill: 26,  fTurn: 0.15, fzMill: 0.04, fDrill: 0.10 },
    hardened:   { name: "Thép sau nhiệt (45-55HRC)", kc: 3200, vcTurn: 65, vcMill: 55, vcDrill: 16, fTurn: 0.10, fzMill: 0.03, fDrill: 0.06 },
  };

  let lockSync = false;

  const CHIP_FACTORS = {
    carbide:          { vc: 1.00, f: 1.00 },
    cermet:           { vc: 1.25, f: 0.75 },
    carbide_uncoated: { vc: 0.75, f: 0.90 },
    hss:              { vc: 0.35, f: 0.85 },
    cbn:              { vc: 2.10, f: 0.70 },
    pcd:              { vc: 2.40, f: 0.90 },
  };

  function applyCalcPreset() {
    const op = $("cOp").value;
    const matKey = $("cMat").value;
    const mat = MAT_DB[matKey] || MAT_DB.mild_steel;
    const toolMat = $("cToolMat").value;
    const cutType = $("cCutType").value; // rough | finish

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
    $("cFlutesWrap").style.display = op === "milling" ? "flex" : "none";
    $("cAeWrap").style.display = op === "milling" ? "flex" : "none";
    $("cApWrap").style.display = op === "drilling" ? "none" : "flex";
    $("cNoseWrap").style.display = op === "turning" ? "flex" : "none";

    $("cDiaLabel").textContent = op === "turning" ? "ĐK phôi D (mm)" : "ĐK dao / mũi D (mm)";
    $("cFeedLabel").textContent = op === "milling" ? "Bước tiến/răng fz (mm)" : "Bước tiến f (mm/vòng)";
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
    } else if (op === "drilling") {
      vf = rpm * fOrFz;
      mrr = (Math.PI * (d * d) / 4) * vf / 1000;
    } else {
      vf = rpm * fOrFz;
      mrr = vc * ap * fOrFz; // cm3/min = (m/min * mm * mm) = cm3/min
    }

    // Power Pc (kW) = (MRR * kc) / (60 * 1000 * eta) with eta=0.8
    const powerKw = (mrr * mat.kc) / (60 * 1000 * 0.8);

    // Theoretical surface roughness Ra (um) for turning: Ra ≈ (f^2 / (32 * r)) * 1000
    const raUm = op === "turning" ? ((fOrFz * fOrFz) / (32 * noseR)) * 1000 : null;

    $("cResRpm").textContent = `${Math.round(rpm)} RPM`;
    $("cResVf").textContent = `${Math.round(vf)} mm/ph`;
    $("cResMrr").textContent = `${mrr.toFixed(1)} cm³/ph`;
    $("cResPower").textContent = `${powerKw.toFixed(2)} kW`;

    if (raUm !== null) {
      $("cResExtra").textContent = `Độ bóng lý thuyết Ra ≈ ${raUm.toFixed(2)} µm (với R mũi = ${noseR} mm) · Lực cắt riêng kc = ${mat.kc} N/mm²`;
    } else if (op === "milling") {
      $("cResExtra").textContent = `Bước tiến/vòng f = ${(fOrFz * flutes).toFixed(3)} mm/vòng (${flutes} me) · Lực cắt riêng kc = ${mat.kc} N/mm²`;
    } else {
      $("cResExtra").textContent = `Khoan Ø${d} mm: Vf = ${Math.round(vf)} mm/ph · Nếu taro bước P=${fOrFz} mm thì Vf = ${Math.round(rpm * fOrFz)} mm/ph`;
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

    ["cFlutes", "cAp", "cAe", "cNoseR"].forEach((id) => {
      $(id).addEventListener("input", updateCalc);
    });

    $("btnCalcSuggest").addEventListener("click", applyCalcPreset);

    // Tab switching
    const switchTab = (tab) => {
      const isCalc = tab === "calc";
      $("tabKnurl").classList.toggle("active", !isCalc);
      $("tabCalc").classList.toggle("active", isCalc);
      $("knurlView").style.display = isCalc ? "none" : "grid";
      $("calcView").style.display = isCalc ? "grid" : "none";
      $("knurlTopActions").style.display = isCalc ? "none" : "flex";
    };

    $("tabKnurl").addEventListener("click", () => switchTab("knurl"));
    $("tabCalc").addEventListener("click", () => switchTab("calc"));

    applyCalcPreset();
  }

  bindCalcEvents();
})();
