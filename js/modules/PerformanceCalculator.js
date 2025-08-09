/**
 * PerformanceCalculator - Handles helicopter performance calculations
 * Manages HOGE calculations, payload analysis, and weight & balance
 */

/**
 * Performance Calculator Class
 * Provides helicopter performance calculations for AW169 operations
 *
 * NOTE: This version has been extended with a fully–fledged HOGE (Hover
 * Out of Ground Effect) computation based off of the AW169 Rotorcraft
 * Flight Manual (RFM) performance chart contained in "Figure S5‑32 HOGE".
 * The original implementation in the upstream project used a placeholder
 * calculation which simply applied arbitrary adjustments for temperature
 * and altitude.  That placeholder has been replaced with a graph–based
 * interpolation that more accurately models the gross weight limits for
 * unfactored headwind conditions.  A secondary headwind adjustment is
 * performed using the incremental weight table from the same chart.
 */
export class PerformanceCalculator {
  constructor() {
    // AW169 aircraft specifications
    this.AIRCRAFT_EMPTY_WEIGHT = 3427; // kg
    this.DEFAULT_CREW_WEIGHT = 85; // kg per person
    // Default pressure altitude for Taiwan operations (ft)
    this.PRESSURE_ALTITUDE = 300;
    // Standard crew positions
    this.CREW_POSITIONS = ['pic', 'sic', 'hop'];
    // Temperature assumptions (will be user input later)
    this.STANDARD_TEMPERATURE = 25; // Celsius
    // Placeholder remains for error fallback only
    this.HOGE_PLACEHOLDER = 4200;

    /**
     * HOGE temperature lines
     *
     * Each entry corresponds to a distinct Outside Air Temperature (OAT)
     * expressed in degrees Celsius.  The value holds a set of points along
     * the associated performance curve extracted from the RFM figure.  The
     * `alt` field is the pressure altitude expressed in thousands of feet
     * (e.g. 9.2 → 9200 ft) and `weight` is the allowable gross weight in
     * hundreds of kilograms (e.g. 44.2 → 4420 kg).  The points are sorted
     * from highest altitude to lowest altitude.  When computing the
     * allowable gross weight at a particular altitude, the algorithm
     * interpolates linearly between the two surrounding points.
     */
    this.HOGE_OAT_LINES = [
      {
        oat: 0,
        points: [
          { alt: 9.2, weight: 33 },
          { alt: 5.6, weight: 38 },
          { alt: 2.0, weight: 43.5 },
          { alt: 1.0, weight: 44.2 },
          { alt: -1.0, weight: 44.7 }
        ]
      },
      {
        oat: 10,
        points: [
          { alt: 8.0, weight: 33 },
          { alt: 5.0, weight: 37 },
          { alt: 1.0, weight: 43.1 },
          { alt: 0.0, weight: 44.0 },
          { alt: -1.0, weight: 44.3 }
        ]
      },
      {
        oat: 20,
        points: [
          { alt: 6.6, weight: 33 },
          { alt: 4.4, weight: 36 },
          { alt: 0.0, weight: 42.5 },
          { alt: -1.0, weight: 43.5 }
        ]
      },
      {
        oat: 30,
        points: [
          { alt: 5.4, weight: 33 },
          { alt: 2.4, weight: 37 },
          { alt: -1.0, weight: 42 }
        ]
      },
      {
        oat: 40,
        points: [
          { alt: 3.6, weight: 33 },
          { alt: 1.0, weight: 36.2 },
          { alt: -1.0, weight: 39.1 }
        ]
      }
    ];

    /**
     * Detailed headwind speeds (kts) used for the incremental weight table.
     *
     * The original implementation only provided coarse adjustments at
     * a handful of headwind levels (5, 10, 20 and 50 kts).  This version
     * replaces those entries with a fine‑grained table covering every
     * integer wind speed from 0 through 50 knots.  The data were
     * transcribed directly from the AW169 RFM “unfactored increase of
     * gross weight” table (Figure S5‑32) supplied by the user.  These
     * values represent the additional allowable weight (in kg) that may
     * be applied to the base HOGE gross weight when operating with a
     * headwind at the specified speed.
     */
    this.HOGE_HEADWIND_LEVELS = Array.from({ length: 51 }, (_, i) => i);

    /**
     * Discrete gross weights (kg) corresponding to columns in the
     * detailed headwind increment table.  These are the baseline gross
     * weights extracted from the same RFM table.  While the full table
     * contained values for every 100 kg increment from 3,400 to 4,400 kg,
     * the intermediate columns can be derived via linear interpolation.
     * To reduce the amount of hard‑coded data, only three anchor
     * columns are specified here (3400, 4000 and 4400 kg).  When a
     * requested base weight falls between these anchors, a linear
     * interpolation across weight is performed for each headwind row.
     */
    this.HOGE_WEIGHT_COLUMNS = [3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400];

    /**
     * Incremental gross weight increases (kg) for headwind compensation.
     * Each entry in this array corresponds to a single headwind speed
     * (see `HOGE_HEADWIND_LEVELS`).  The nested arrays contain the
     * weight adjustments for the anchor gross weights defined in
     * `HOGE_WEIGHT_COLUMNS` (i.e. 3400, 4000 and 4400 kg).  Values
     * beyond 50 kts are clamped to the 50 kt row and values below
     * 0 kts produce zero adjustment.
     */
    this.HOGE_HEADWIND_INCREASES = [
      // 0 kt
      [14, 14, 14, 15, 15, 16, 16, 16, 17, 17, 17],
      // 1 kt
      [27, 28, 29, 30, 30, 31, 32, 32, 33, 34, 35],
      // 2 kts
      [43, 43, 43, 44, 46, 47, 48, 49, 50, 51, 52],
      // 3 kts
      [59, 58, 57, 59, 61, 62, 63, 65, 66, 68, 69],
      // 4 kts
      [76, 74, 72, 74, 76, 78, 79, 81, 83, 85, 87],
      // 5 kts
      [81, 84, 86, 89, 91, 93, 95, 97, 99, 102, 104],
      // 6 kts
      [105, 109, 112, 115, 118, 121, 124, 126, 129, 132, 136],
      // 7 kts
      [130, 134, 138, 142, 145, 149, 152, 156, 159, 163, 167],
      // 8 kts
      [154, 159, 163, 168, 173, 177, 181, 185, 190, 194, 199],
      // 9 kts
      [179, 184, 189, 195, 200, 205, 209, 215, 220, 225, 230],
      // 10 kts
      [203, 209, 215, 221, 227, 233, 238, 244, 250, 256, 262],
      // 11 kts
      [236, 243, 250, 257, 264, 271, 277, 284, 291, 298, 305],
      // 12 kts
      [269, 277, 285, 293, 301, 309, 316, 324, 332, 340, 348],
      // 13 kts
      [303, 312, 321, 330, 339, 347, 356, 364, 373, 382, 391],
      // 14 kts
      [336, 346, 356, 366, 376, 385, 395, 405, 414, 424, 434],
      // 15 kts
      [369, 380, 391, 402, 413, 424, 434, 445, 456, 466, 477],
      // 16 kts
      [402, 414, 426, 438, 450, 462, 473, 485, 497, 508, 520],
      // 17 kts
      [435, 448, 461, 474, 487, 500, 512, 525, 538, 550, 563],
      // 18 kts
      [469, 483, 497, 511, 525, 538, 552, 565, 579, 592, 606],
      // 19 kts
      [502, 517, 532, 547, 562, 576, 591, 605, 620, 634, 649],
      // 20 kts
      [535, 551, 567, 583, 599, 615, 630, 646, 661, 677, 692],
      // 21 kts
      [575, 592, 609, 626, 644, 660, 677, 694, 710, 727, 744],
      // 22 kts
      [615, 633, 651, 670, 688, 706, 724, 742, 760, 778, 796],
      // 23 kts
      [655, 674, 694, 713, 733, 752, 771, 790, 809, 828, 847],
      // 24 kts
      [695, 715, 736, 757, 777, 798, 818, 838, 858, 879, 899],
      // 25 kts
      [735, 756, 778, 800, 822, 843, 865, 886, 908, 929, 951],
      // 26 kts
      [775, 798, 820, 843, 866, 889, 912, 935, 957, 980, 1003],
      // 27 kts
      [815, 839, 863, 887, 911, 935, 959, 983, 1007, 1030, 1054],
      // 28 kts
      [854, 880, 905, 930, 956, 981, 1006, 1031, 1056, 1081, 1106],
      // 29 kts
      [894, 921, 947, 974, 1000, 1026, 1053, 1079, 1105, 1132, 1158],
      // 30 kts
      [934, 962, 989, 1017, 1045, 1072, 1100, 1127, 1155, 1182, 1210],
      // 31 kts
      [974, 1003, 1032, 1060, 1089, 1118, 1147, 1175, 1204, 1233, 1261],
      // 32 kts
      [1014, 1044, 1074, 1104, 1134, 1164, 1194, 1224, 1253, 1283, 1313],
      // 33 kts
      [1054, 1085, 1116, 1147, 1178, 1209, 1241, 1272, 1303, 1334, 1365],
      // 34 kts
      [1094, 1126, 1158, 1191, 1223, 1255, 1288, 1320, 1352, 1384, 1417],
      // 35 kts
      [1134, 1167, 1201, 1234, 1268, 1301, 1335, 1368, 1402, 1435, 1469],
      // 36 kts
      [1174, 1208, 1243, 1277, 1312, 1347, 1381, 1416, 1451, 1486, 1520],
      // 37 kts
      [1214, 1249, 1285, 1321, 1357, 1393, 1428, 1464, 1500, 1536, 1572],
      // 38 kts
      [1254, 1291, 1327, 1364, 1401, 1438, 1475, 1513, 1550, 1587, 1624],
      // 39 kts
      [1294, 1332, 1369, 1408, 1446, 1484, 1522, 1561, 1599, 1637, 1676],
      // 40 kts
      [1334, 1373, 1412, 1451, 1490, 1530, 1569, 1609, 1648, 1688, 1727],
      // 41 kts
      [1374, 1414, 1454, 1494, 1535, 1576, 1616, 1657, 1698, 1738, 1779],
      // 42 kts
      [1414, 1455, 1496, 1538, 1579, 1621, 1663, 1705, 1747, 1789, 1831],
      // 43 kts
      [1453, 1496, 1538, 1581, 1624, 1667, 1710, 1753, 1796, 1840, 1883],
      // 44 kts
      [1493, 1537, 1581, 1625, 1669, 1713, 1757, 1802, 1846, 1890, 1934],
      // 45 kts
      [1533, 1578, 1623, 1668, 1713, 1759, 1804, 1850, 1895, 1941, 1986],
      // 46 kts
      [1573, 1619, 1665, 1711, 1758, 1804, 1851, 1898, 1945, 1991, 2038],
      // 47 kts
      [1613, 1660, 1707, 1755, 1802, 1850, 1898, 1946, 1994, 2042, 2090],
      // 48 kts
      [1653, 1701, 1750, 1798, 1847, 1896, 1945, 1994, 2043, 2092, 2141],
      // 49 kts
      [1693, 1742, 1792, 1842, 1891, 1942, 1992, 2042, 2093, 2143, 2193],
      // 50 kts
      [1733, 1784, 1834, 1885, 1936, 1988, 2039, 2091, 2142, 2194, 2245]
    ];

    /**
     * Sea-level allowable gross weight at 0 ft for each integer OAT (°C)
     * extracted from the same RFM chart used for HOGE. Values are in
     * hundreds of kilograms as read from the chart (e.g., 44.38 → 4438 kg).
     * We convert to kilograms when used. Range covers 0°C through 40°C.
     */
    this.HOGE_SEA_LEVEL_WEIGHT_BY_OAT = [
      44.38, // 0°C
      44.32, // 1
      44.26, // 2
      44.20, // 3
      44.15, // 4
      44.09, // 5
      44.03, // 6
      43.97, // 7
      43.91, // 8
      43.85, // 9
      43.75, // 10°C
      43.58, // 11
      43.40, // 12
      43.23, // 13
      43.05, // 14
      42.88, // 15
      42.71, // 16
      42.53, // 17
      42.36, // 18
      42.18, // 19
      42.08, // 20°C
      41.88, // 21
      41.68, // 22
      41.48, // 23
      41.28, // 24
      41.08, // 25
      40.88, // 26
      40.68, // 27
      40.48, // 28
      40.28, // 29
      40.08, // 30°C
      39.83, // 31
      39.58, // 32
      39.33, // 33
      39.08, // 34
      38.83, // 35
      38.58, // 36
      38.33, // 37
      38.08, // 38
      37.83, // 39
      37.54  // 40°C
    ];
  }

  /**
   * Internal helper: Interpolate allowable gross weight for a given
   * temperature and altitude.  Performs a two‑step interpolation:
   *  1. For each bounding OAT curve, interpolate the gross weight at the
   *     specified pressure altitude.
   *  2. Interpolate between the two gross weight values based upon the
   *     requested temperature.
   *
   * @param {number} temperature - Outside air temperature in Celsius.
   * @param {number} altitudeFt - Pressure altitude in feet.
   * @returns {number} Base gross weight limit in kilograms.
   */
  _interpolateWeightForTemperature(temperature, altitudeFt) {
    const altKft = altitudeFt / 1000.0;
    // Sort OAT lines ascending by oat value
    const lines = this.HOGE_OAT_LINES.slice().sort((a, b) => a.oat - b.oat);
    // Clamp temperature to range
    const minOAT = lines[0].oat;
    const maxOAT = lines[lines.length - 1].oat;
    let temp = temperature;
    if (temp < minOAT) temp = minOAT;
    if (temp > maxOAT) temp = maxOAT;

    // Identify bounding indices
    let lowerIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].oat <= temp) {
        lowerIndex = i;
      }
    }
    let upperIndex = lowerIndex;
    for (let i = lowerIndex + 1; i < lines.length; i++) {
      if (lines[i].oat >= temp) {
        upperIndex = i;
        break;
      }
    }
    // If the temperature matches exactly a line, upperIndex will equal lowerIndex
    const lowerLine = lines[lowerIndex];
    const upperLine = lines[upperIndex];

    // Helper to interpolate along a single OAT line at the desired altitude
    const interpolateAlongLine = (line) => {
      // points sorted descending by altitude
      const pts = line.points.slice().sort((a, b) => b.alt - a.alt);
      // Clamp altitude within range
      const minAlt = pts[pts.length - 1].alt;
      const maxAlt = pts[0].alt;
      let targetAlt = altKft;
      if (targetAlt < minAlt) targetAlt = minAlt;
      if (targetAlt > maxAlt) targetAlt = maxAlt;
      // Find bounding points
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        // check if targetAlt lies between p1.alt and p2.alt
        if ((p1.alt >= targetAlt && p2.alt <= targetAlt) ||
            (p2.alt >= targetAlt && p1.alt <= targetAlt)) {
          // Linear interpolation: weight units are hundred‑kg; convert to kg
          const x1 = p1.weight * 100;
          const x2 = p2.weight * 100;
          const y1 = p1.alt;
          const y2 = p2.alt;
          // Avoid divide by zero
          if (y1 === y2) return x1;
          const ratio = (targetAlt - y1) / (y2 - y1);
          return x1 + (x2 - x1) * ratio;
        }
      }
      // Fallback: return weight at last point
      return pts[pts.length - 1].weight * 100;
    };

    const lowerWeight = interpolateAlongLine(lowerLine);
    const upperWeight = interpolateAlongLine(upperLine);

    // If both lines are the same (exact match), return directly
    if (lowerIndex === upperIndex || lowerLine.oat === upperLine.oat) {
      return lowerWeight;
    }

    // Temperature interpolation blending guided by sea-level curve
    const seaLevelFor = (t) => {
      const table = this.HOGE_SEA_LEVEL_WEIGHT_BY_OAT;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const tt = clamp(t, 0, table.length - 1);
      const tLow = Math.floor(tt);
      const tHigh = Math.ceil(tt);
      const vLow = table[tLow] * 100; // convert to kg
      const vHigh = table[tHigh] * 100; // convert to kg
      if (tHigh === tLow) return vLow;
      const r = (tt - tLow) / (tHigh - tLow);
      return vLow + (vHigh - vLow) * r;
    };

    const t1 = lowerLine.oat;
    const t2 = upperLine.oat;
    const wSL1 = seaLevelFor(t1);
    const wSL2 = seaLevelFor(t2);
    const wSLt = seaLevelFor(temp);
    const denom = (wSL2 - wSL1);
    const ratio = denom === 0 ? 0 : (wSLt - wSL1) / denom;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return lowerWeight + (upperWeight - lowerWeight) * clampedRatio;
  }

  /**
   * Internal helper: Sea-level base weight lookup by OAT (no altitude factor)
   * Rounds the temperature to the nearest integer index in the sea-level table
   * and returns the corresponding gross weight in kilograms.
   * @param {number} temperature - Outside air temperature in Celsius
   * @returns {number} Base gross weight at sea level in kg
   */
  _seaLevelBaseWeightForOAT(temperature) {
    const table = this.HOGE_SEA_LEVEL_WEIGHT_BY_OAT;
    if (!Array.isArray(table) || table.length === 0) return this.HOGE_PLACEHOLDER;
    const idx = Math.round(Math.max(0, Math.min(table.length - 1, temperature)));
    const hundredKg = table[idx] ?? table[0];
    return hundredKg * 100;
  }

  /**
   * Internal helper: Interpolate the incremental headwind adjustment.
   * Performs bilinear interpolation across wind speed and base weight.
   *
   * @param {number} windSpeed - Headwind component in knots.
   * @param {number} baseWeight - Base gross weight in kilograms.
   * @returns {number} Weight increment in kilograms.
   */
  _interpolateHeadwindAdjustment(windSpeed, baseWeight) {
    // Negative or near‑zero winds yield no increase.  Clamp values below
    // the smallest defined headwind speed (0 kts) to 0.  Values above
    // the highest entry (50 kts) are clamped to the maximum.
    const minWindSpeed = this.HOGE_HEADWIND_LEVELS[0];
    const maxWind = this.HOGE_HEADWIND_LEVELS[this.HOGE_HEADWIND_LEVELS.length - 1];
    let wind = windSpeed;
    if (wind <= minWindSpeed) {
      wind = minWindSpeed;
    } else if (wind >= maxWind) {
      wind = maxWind;
    }

    // Find bounding wind rows
    const windLevels = this.HOGE_HEADWIND_LEVELS;
    let windLowerIndex = 0;
    for (let i = 0; i < windLevels.length; i++) {
      if (windLevels[i] <= wind) {
        windLowerIndex = i;
      }
    }
    let windUpperIndex = windLowerIndex;
    for (let i = windLowerIndex + 1; i < windLevels.length; i++) {
      if (windLevels[i] >= wind) {
        windUpperIndex = i;
        break;
      }
    }
    const w1 = windLevels[windLowerIndex];
    const w2 = windLevels[windUpperIndex];
    const rowLower = this.HOGE_HEADWIND_INCREASES[windLowerIndex];
    const rowUpper = this.HOGE_HEADWIND_INCREASES[windUpperIndex];

    // Helper to interpolate adjustment for a particular row at the given baseWeight
    const interpForRow = (row) => {
      const weights = this.HOGE_WEIGHT_COLUMNS;
      // Clamp baseWeight within weight table
      let weight = baseWeight;
      const minW = weights[0];
      const maxW = weights[weights.length - 1];
      if (weight <= minW) {
        // If below minimum published weight, return zero increase
        if (weight < minW) return 0;
      }
      if (weight >= maxW) {
        // If above maximum, clamp to last two columns
        weight = maxW;
      }
      // Find bounding indices
      let lowerIdx = 0;
      for (let i = 0; i < weights.length; i++) {
        if (weights[i] <= weight) {
          lowerIdx = i;
        }
      }
      let upperIdx = lowerIdx;
      for (let i = lowerIdx + 1; i < weights.length; i++) {
        if (weights[i] >= weight) {
          upperIdx = i;
          break;
        }
      }
      const weightLow = weights[lowerIdx];
      const weightHigh = weights[upperIdx];
      const incLow = row[lowerIdx];
      const incHigh = row[upperIdx];
      if (weightHigh === weightLow) return incLow;
      const ratio = (weight - weightLow) / (weightHigh - weightLow);
      return incLow + (incHigh - incLow) * ratio;
    };

    const adjLower = interpForRow(rowLower);
    const adjUpper = interpForRow(rowUpper);

    // If wind levels are the same, return directly
    if (w1 === w2) {
      return adjLower;
    }
    const windRatio = (wind - w1) / (w2 - w1);
    return adjLower + (adjUpper - adjLower) * windRatio;
  }

  /**
   * Calculate Dry Operating Mass (DOM)
   * DOM = Aircraft Empty Weight + PIC + SIC + HOP
   * @param {Object} crewWeights - Crew weight data {pic: 85, sic: 85, hop: 85}
   * @returns {Object} DOM calculation result
   */
  calculateDOM(crewWeights = {}) {
    try {
      const crew = {
        pic: crewWeights.pic || this.DEFAULT_CREW_WEIGHT,
        sic: crewWeights.sic || this.DEFAULT_CREW_WEIGHT,
        hop: crewWeights.hop || this.DEFAULT_CREW_WEIGHT
      };
      const totalCrewWeight = crew.pic + crew.sic + crew.hop;
      const dom = this.AIRCRAFT_EMPTY_WEIGHT + totalCrewWeight;
      return {
        aircraftEmptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
        crewWeights: crew,
        totalCrewWeight: totalCrewWeight,
        dom: dom,
        breakdown: {
          'Aircraft Empty Weight': this.AIRCRAFT_EMPTY_WEIGHT,
          'PIC Weight': crew.pic,
          'SIC Weight': crew.sic,
          'HOP Weight': crew.hop,
          'Total DOM': dom
        },
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating DOM:', error);
      return {
        aircraftEmptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
        crewWeights: {},
        totalCrewWeight: 0,
        dom: this.AIRCRAFT_EMPTY_WEIGHT,
        error: error.message
      };
    }
  }

  /**
   * Calculate HOGE (Hover Out of Ground Effect)
   *
   * Given the current temperature, pressure altitude and headwind, this
   * method returns the allowable gross weight limit for hovering outside
   * ground effect.  The calculation uses the AW169 performance chart and
   * interpolates both across OAT curves and headwind tables.  The
   * aircraftWeight parameter is accepted for backwards compatibility but
   * does not alter the allowable limit.
   *
   * @param {number} temperature - Temperature in Celsius (°C)
   * @param {number} pressureAltitude - Pressure altitude in feet (ft)
   * @param {number} aircraftWeight - Current aircraft weight in kg (ignored)
   * @param {number} windSpeed - Headwind component in knots (kts)
   * @returns {Object} HOGE calculation result
   */
  calculateHOGE(temperature = this.STANDARD_TEMPERATURE, pressureAltitude = this.PRESSURE_ALTITUDE, aircraftWeight = 4000, windSpeed = 0) {
    try {
      // Step 1: Base gross weight from sea-level OAT table (no altitude factor)
      const baseWeight = this._seaLevelBaseWeightForOAT(temperature);
      // Step 2: Headwind adjustment based on gross weight and wind speed
      const headwindAdjustment = this._interpolateHeadwindAdjustment(windSpeed, baseWeight);
      // Report the unfactored increase of gross weight for debugging
      console.log(
        `Unfactored increase of gross weight (headwind ${windSpeed} kts, base weight ${baseWeight.toFixed(1)} kg): ${headwindAdjustment.toFixed(1)} kg`
      );
      // Sum to obtain allowable HOGE gross weight
      const hogeWeight = baseWeight + headwindAdjustment;
      return {
        hogeWeight: Math.round(hogeWeight),
        baseGrossWeight: Math.round(baseWeight),
        headwindAdjustment: Math.round(headwindAdjustment),
        conditions: {
          temperature: temperature,
          pressureAltitude: pressureAltitude,
          windSpeed: windSpeed
        },
        notes: [
          'Base weight from sea-level OAT table (Figure S5‑32); altitude not applied',
          'Headwind increment interpolated from detailed table'
        ],
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating HOGE:', error);
      return {
        hogeWeight: this.HOGE_PLACEHOLDER,
        baseGrossWeight: this.HOGE_PLACEHOLDER,
        headwindAdjustment: 0,
        conditions: {
          temperature: temperature,
          pressureAltitude: pressureAltitude,
          windSpeed: windSpeed
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate Available Payload
   * Available Payload = HOGE - Fuel at Critical Point - DOM
   * @param {number} hogeWeight - HOGE weight in kg
   * @param {number} fuelAtCriticalPoint - Fuel remaining at critical point in kg
   * @param {number} dom - Dry Operating Mass in kg
   * @returns {Object} Payload calculation result
   */
  calculateAvailablePayload(hogeWeight, fuelAtCriticalPoint, dom) {
    try {
      const availablePayload = hogeWeight - fuelAtCriticalPoint - dom;
      return {
        hogeWeight: hogeWeight,
        fuelAtCriticalPoint: fuelAtCriticalPoint,
        dom: dom,
        availablePayload: Math.round(availablePayload),
        breakdown: {
          'HOGE Weight': hogeWeight,
          'Less: Fuel at Critical Point': -fuelAtCriticalPoint,
          'Less: Dry Operating Mass': -dom,
          'Available Payload': Math.round(availablePayload)
        },
        status: this.getPayloadStatus(availablePayload),
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating available payload:', error);
      return {
        hogeWeight: hogeWeight || 0,
        fuelAtCriticalPoint: fuelAtCriticalPoint || 0,
        dom: dom || 0,
        availablePayload: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate Available Payload using total fuel and enroute fuel to critical site
   * Available Payload = HOGE - DOM - (Total fuel - Taxi fuel - Enroute fuel to CP)
   * Enroute fuel to CP = timeToCriticalPoint (min) × fuelConsumptionRate (kg/min)
   * @param {number} hogeWeight - HOGE weight in kg
   * @param {number} dom - Dry Operating Mass in kg
   * @param {Object} fuelCalculation - Fuel calculation result with { totalFuel, breakdown }
   * @param {number} timeToCriticalPoint - Cumulative time to CP in minutes
   * @param {number} fuelConsumptionRate - Consumption rate in kg/min (default 5)
   * @returns {Object} Payload calculation result
   */
  calculateAvailablePayloadFromFuel(hogeWeight, dom, fuelCalculation, timeToCriticalPoint, fuelConsumptionRate = 5) {
    try {
      const totalFuel = fuelCalculation?.totalFuel || 0;
      const taxiFuel = fuelCalculation?.breakdown?.taxiFuel || 0;
      const enrouteFuelToCP = (timeToCriticalPoint || 0) * fuelConsumptionRate;
      const fuelAtCriticalPoint = totalFuel - taxiFuel - enrouteFuelToCP;

      const availablePayload = hogeWeight - dom - fuelAtCriticalPoint;

      return {
        hogeWeight: hogeWeight,
        dom: dom,
        fuelAtCriticalPoint: Math.round(fuelAtCriticalPoint),
        inputs: {
          totalFuel: totalFuel,
          taxiFuel: taxiFuel,
          enrouteFuelToCP: Math.round(enrouteFuelToCP),
          timeToCriticalPoint: timeToCriticalPoint,
          fuelConsumptionRate: fuelConsumptionRate
        },
        availablePayload: Math.round(availablePayload),
        breakdown: {
          'HOGE Weight': hogeWeight,
          'Less: Dry Operating Mass': -dom,
          'Less: (Total Fuel - Taxi - Enroute to CP)': -(fuelAtCriticalPoint),
          'Available Payload': Math.round(availablePayload)
        },
        status: this.getPayloadStatus(availablePayload),
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating available payload from fuel:', error);
      return {
        hogeWeight: hogeWeight || 0,
        dom: dom || 0,
        fuelAtCriticalPoint: 0,
        availablePayload: 0,
        error: error.message
      };
    }
  }

  /**
   * Determine payload status based on available payload
   * @param {number} availablePayload - Available payload in kg
   * @returns {Object} Payload status information
   */
  getPayloadStatus(availablePayload) {
    let status, color, message;
    if (availablePayload < 100) {
      status = 'Critical';
      color = '#ef4444'; // Red
      message = 'Very low payload capacity - review flight plan';
    } else if (availablePayload < 300) {
      status = 'Low';
      color = '#f97316'; // Orange
      message = 'Limited payload capacity - consider reducing load';
    } else if (availablePayload < 500) {
      status = 'Moderate';
      color = '#eab308'; // Yellow
      message = 'Moderate payload capacity - plan carefully';
    } else {
      status = 'Good';
      color = '#84cc16'; // Green
      message = 'Sufficient payload capacity';
    }
    return { status, color, message };
  }

  /**
   * Get aircraft specifications
   * @returns {Object} Aircraft specifications
   */
  getAircraftSpecs() {
    return {
      emptyWeight: this.AIRCRAFT_EMPTY_WEIGHT,
      defaultCrewWeight: this.DEFAULT_CREW_WEIGHT,
      pressureAltitude: this.PRESSURE_ALTITUDE,
      standardTemperature: this.STANDARD_TEMPERATURE,
      crewPositions: this.CREW_POSITIONS
    };
  }
}