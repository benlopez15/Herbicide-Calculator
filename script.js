// ------------------------------
// CONSTANTS
// ------------------------------
const FT2_PER_ACRE = 43560;
const OZ_TO_ML = 29.5735;
const GAL_TO_ML = 3785.41;
const QT_TO_ML = 946.353;

// ------------------------------
// GPA SYNC (main → calibration)
// ------------------------------
function syncGpa() {
  const gpa = read("gpa");
  document.getElementById("gpaTarget").value = gpa;
}

// ------------------------------
// BOOM WIDTH AUTO-CALC
// ------------------------------
function updateBoomWidth() {
  const spacing = document.getElementById("spacingSelect").value;
  const nozzles = read("nozzlesCal");

  if (!nozzles || nozzles < 1) return;
  if (spacing === "custom") return;

  const spacingInches = parseFloat(spacing);
  const widthFt = (spacingInches * nozzles) / 12;   // CORRECTED FORMULA

  document.getElementById("boomWidthCal").value = widthFt.toFixed(2);
}

// ------------------------------
// BASIC READ FUNCTION
// ------------------------------
function read(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? null : v;
}

// ------------------------------
// UNIT CONVERSION
// ------------------------------
function convertToOz(value, unit) {
  switch (unit) {
    case "ml": return value / OZ_TO_ML;
    case "g": return value / 28.3495;
    case "lbs": return value * 16;
    case "qt": return value * 32;
    case "pt": return value * 16;
    default: return value;
  }
}

function convertFromOz(oz, unit) {
  switch (unit) {
    case "ml": return oz * OZ_TO_ML;
    case "g": return oz * 28.3495;
    case "lbs": return oz / 16;
    case "qt": return oz / 32;
    case "pt": return oz / 16;
    default: return oz;
  }
}

// ------------------------------
// UNIT LABEL UPDATE
// ------------------------------
document.getElementById("unitSelect").addEventListener("change", () => {
  const unit = document.getElementById("unitSelect").value;
  const label = document.getElementById("rateLabel");

  const unitNames = {
    oz: "oz/acre",
    ml: "mL/acre",
    g: "g/acre",
    lbs: "lbs/acre",
    qt: "qt/acre",
    pt: "pt/acre"
  };

  label.textContent = `Herbicide rate (${unitNames[unit]})`;
});

// ------------------------------
// TANK BREAKDOWN
// ------------------------------
function renderTankBreakdown(totalGallons, tankSize, gpa, rateOz, unit, nisPct, msoPct, cocPct, uanQtAcre) {
  const container = document.getElementById("tankBreakdown");
  container.innerHTML = "";

  const totalTanksExact = totalGallons / tankSize;
  const fullTanks = Math.floor(totalTanksExact);
  const hasPartial = totalTanksExact > fullTanks + 1e-6;

  const acresPerFullTank = tankSize / gpa;

  // FULL TANKS
  for (let i = 1; i <= fullTanks; i++) {
    const acres = acresPerFullTank;
    const herbOz = acres * rateOz;

    const tankMl = tankSize * GAL_TO_ML;

    const nisMl = tankMl * (nisPct / 100);
    const msoMl = tankMl * (msoPct / 100);
    const cocMl = tankMl * (cocPct / 100);
    const uanMl = (uanQtAcre * acres) * QT_TO_ML;

    const herbMl = convertFromOz(herbOz, unit);

    const waterMl = tankMl - (herbMl + nisMl + msoMl + cocMl + uanMl);

    const div = document.createElement("div");
    div.className = "result";
    div.innerHTML = `
      <div class="result-label">Tank ${i} (Full)</div>
      <div class="result-value">Herbicide: ${herbMl.toFixed(2)} ${unit}</div>
      <div class="result-note">
        Acres: ${acres.toFixed(3)}<br>
        NIS: ${nisMl.toFixed(0)} mL<br>
        MSO: ${msoMl.toFixed(0)} mL<br>
        COC: ${cocMl.toFixed(0)} mL<br>
        UAN: ${uanMl.toFixed(0)} mL<br>
        <strong>Water: ${waterMl.toFixed(0)} mL</strong>
      </div>
    `;
    container.appendChild(div);
  }

  // PARTIAL TANK
  if (hasPartial) {
    const gallonsFull = fullTanks * tankSize;
    const gallonsPartial = totalGallons - gallonsFull;
    const acresPartial = gallonsPartial / gpa;
    const herbOzPartial = acresPartial * rateOz;

    const tankMlPartial = gallonsPartial * GAL_TO_ML;

    const nisMl = tankMlPartial * (nisPct / 100);
    const msoMl = tankMlPartial * (msoPct / 100);
    const cocMl = tankMlPartial * (cocPct / 100);
    const uanMl = (uanQtAcre * acresPartial) * QT_TO_ML;

    const herbMl = convertFromOz(herbOzPartial, unit);

    const waterMl = tankMlPartial - (herbMl + nisMl + msoMl + cocMl + uanMl);

    const div = document.createElement("div");
    div.className = "result";
    div.innerHTML = `
      <div class="result-label">Tank ${fullTanks + 1} (Partial)</div>
      <div class="result-value">Herbicide: ${herbMl.toFixed(2)} ${unit}</div>
      <div class="result-note">
        Acres: ${acresPartial.toFixed(3)}<br>
        NIS: ${nisMl.toFixed(0)} mL<br>
        MSO: ${msoMl.toFixed(0)} mL<br>
        COC: ${cocMl.toFixed(0)} mL<br>
        UAN: ${uanMl.toFixed(0)} mL<br>
        <strong>Water: ${waterMl.toFixed(0)} mL</strong>
      </div>
    `;
    container.appendChild(div);
  }
}


// ------------------------------
// MAIN HERBICIDE CALCULATOR
// ------------------------------
function calc() {
  const numPlots = read("numPlots");
  const plotLength = read("plotLength");
  const plotWidth = read("plotWidth");
  const rateInput = read("rateInput");
  const unit = document.getElementById("unitSelect").value;

  const tankSize = read("tankSize");
  const gpa = read("gpa");
  const nisPct = read("nisPct");
  const msoPct = read("msoPct");
  const cocPct = read("cocPct");
  const uanQtAcre = read("uanQtAcre");

  const rateOz = convertToOz(rateInput, unit);

  const plotAreaFt2 = plotLength * plotWidth;
  const plotAreaAc = plotAreaFt2 / FT2_PER_ACRE;

  const totalAreaAc = plotAreaAc * numPlots;
  const totalGallons = totalAreaAc * gpa;

  const tanksExact = totalGallons / tankSize;
  const fullTanks = Math.floor(tanksExact);
  const hasPartial = tanksExact > fullTanks + 1e-6;
  const tanksNeeded = hasPartial ? fullTanks + 1 : fullTanks;

  const herbTotalOz = totalAreaAc * rateOz;
  const herbFullTankOz = (tankSize / gpa) * rateOz;

  let herbPartialTankOz = 0;
  if (hasPartial) {
    const gallonsFull = fullTanks * tankSize;
    const gallonsPartial = totalGallons - gallonsFull;
    const acresPartial = gallonsPartial / gpa;
    herbPartialTankOz = acresPartial * rateOz;
  }

  const tankMl = tankSize * GAL_TO_ML;
  const nisFullMl = tankMl * (nisPct / 100);
  const msoFullMl = tankMl * (msoPct / 100);
  const cocFullMl = tankMl * (cocPct / 100);
  const uanQtFullTank = uanQtAcre * (tankSize / gpa);
  const uanFullMl = uanQtFullTank * QT_TO_ML;

  document.getElementById("totalPlots").textContent = numPlots;
  document.getElementById("totalAreaAc").textContent = totalAreaAc.toFixed(3) + " ac";
  document.getElementById("totalGallons").textContent = totalGallons.toFixed(2) + " gal";
  document.getElementById("tanksNeeded").textContent =
    tanksNeeded + " tanks (" + tanksExact.toFixed(2) + " exact)";

  document.getElementById("herbTotal").textContent =
    convertFromOz(herbTotalOz, unit).toFixed(2) + " " + unit;

  document.getElementById("herbFullTank").textContent =
    convertFromOz(herbFullTankOz, unit).toFixed(2) + " " + unit;

  document.getElementById("herbPartialTank").textContent =
    hasPartial
      ? convertFromOz(herbPartialTankOz, unit).toFixed(2) + " " + unit
      : "No partial tank";

  document.getElementById("nisFullMl").textContent = nisFullMl.toFixed(0) + " mL";
  document.getElementById("msoFullMl").textContent = msoFullMl.toFixed(0) + " mL";
  document.getElementById("cocFullMl").textContent = cocFullMl.toFixed(0) + " mL";
  document.getElementById("uanFullMl").textContent = uanFullMl.toFixed(0) + " mL";

  renderTankBreakdown(
    totalGallons,
    tankSize,
    gpa,
    rateOz,
    unit,
    nisPct,
    msoPct,
    cocPct,
    uanQtAcre
  );
}

// ------------------------------
// CALIBRATION ENGINE
// ------------------------------
function calibrate() {
  const secPer100 = read("secPer100");
  const boomWidthFt = read("boomWidthCal");
  const nozzles = read("nozzlesCal");
  const gpaTarget = read("gpaTarget");
  const catchMlNozzle = read("catchMl");

  if (!secPer100 || !boomWidthFt || !nozzles || !gpaTarget || !catchMlNozzle) {
    document.getElementById("calMessage").textContent =
      "Missing calibration inputs.";
    return;
  }

  // Speed
  const speedFtSec = 100 / secPer100;
  const mph = speedFtSec * 0.681818;

  document.getElementById("speedFtSec").textContent =
    speedFtSec.toFixed(2) + " ft/sec";
  document.getElementById("speedMph").textContent =
    mph.toFixed(2) + " mph";

  // Width in inches
  const widthIn = boomWidthFt * 12;

  // Required total GPM
  const requiredGpmTotal = (gpaTarget * mph * widthIn) / 5940;

  // Expected total mL in 30 sec
  const expectedTotalMl30s = (requiredGpmTotal * GAL_TO_ML) / 2;

  // Expected per nozzle
  const expectedPerNozzleMl30s = expectedTotalMl30s / nozzles;

  // Actual per nozzle
  const actualMlNozzle30s = catchMlNozzle;

  // Actual total GPM
  const actualMlTotal30s = actualMlNozzle30s * nozzles;
  const actualMlMinTotal = actualMlTotal30s * 2;
  const actualGpmTotal = actualMlMinTotal / GAL_TO_ML;

  // Actual GPA
  const actualGpa =
    (5940 * actualGpmTotal) / (mph * widthIn);

  // Write results
  document.getElementById("expectedCatchTotal").textContent =
    expectedTotalMl30s.toFixed(0) + " mL";

  document.getElementById("expectedCatchNozzle").textContent =
    expectedPerNozzleMl30s.toFixed(1) + " mL";

  document.getElementById("actualMlNozzle").textContent =
    actualMlNozzle30s.toFixed(1) + " mL";

  document.getElementById("actualGpa").textContent =
    actualGpa.toFixed(1) + " GPA";

  // Pressure helper
  const diff = actualGpa - gpaTarget;
  const msg = document.getElementById("calMessage");

  if (Math.abs(diff) < 0.5) {
    msg.textContent = "Calibration good — your nozzle output matches your walking speed.";
  } else if (diff > 2) {
    msg.textContent = "Spraying WAY too heavy — decrease regulator pressure significantly.";
  } else if (diff > 0.5) {
    msg.textContent = "Spraying too heavy — decrease regulator pressure slightly.";
  } else if (diff < -2) {
    msg.textContent = "Spraying WAY too light — increase regulator pressure significantly.";
  } else {
    msg.textContent = "Spraying too light — increase regulator pressure slightly.";
  }
}

// ------------------------------
// EVENT LISTENERS
// ------------------------------
document.getElementById("spacingSelect").addEventListener("change", updateBoomWidth);
document.getElementById("nozzlesCal").addEventListener("input", updateBoomWidth);

document.getElementById("calcBtn").addEventListener("click", calc);
document.getElementById("calibrateBtn").addEventListener("click", calibrate);

// ------------------------------
// RESET BUTTON
// ------------------------------
document.getElementById("resetBtn").addEventListener("click", () => {
  // Main calculator defaults
  document.getElementById("numPlots").value = 224;
  document.getElementById("plotLength").value = 16;
  document.getElementById("plotWidth").value = 5;
  document.getElementById("rateInput").value = 12;
  document.getElementById("unitSelect").value = "oz";
  document.getElementById("tankSize").value = 3;
  document.getElementById("gpa").value = 20;
  document.getElementById("nisPct").value = 0.5;
  document.getElementById("msoPct").value = 0.5;
  document.getElementById("cocPct").value = 2;
  document.getElementById("uanQtAcre").value = 4;

  // Calibration defaults
  document.getElementById("secPer100").value = 25;
  document.getElementById("nozzlesCal").value = 6;
  document.getElementById("spacingSelect").value = "20";
  document.getElementById("catchMl").value = 300;

  // Sync GPA + boom width
  syncGpa();
  updateBoomWidth();

  // Clear results
  document.querySelectorAll(".result-value").forEach(el => el.textContent = "–");
  document.getElementById("tankBreakdown").innerHTML = "";
  document.getElementById("calMessage").textContent = "–";
});

// ------------------------------
// INITIAL RUN
// ------------------------------
calc();
syncGpa();
updateBoomWidth();
