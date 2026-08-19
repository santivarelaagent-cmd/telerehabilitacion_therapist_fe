/**
 * labAngleCalculator.js
 * Responsabilidad: Calcular ángulos espaciales 3D a partir de tripletas de puntos de laboratorio,
 * interpolar series temporales con offset de sincronización y calcular métricas de error (MAE, RMSE).
 */

export class LabAngleCalculator {
  /**
   * Calcula el ángulo en 3D en el vértice P_center formado por P_center->P_left y P_center->P_right.
   * @param {[number, number, number]} pCenter 
   * @param {[number, number, number]} pLeft 
   * @param {[number, number, number]} pRight 
   * @returns {number|null} Ángulo en grados o null si hay puntos inválidos
   */
  static calculate3DAngle(pCenter, pLeft, pRight) {
    if (!pCenter || !pLeft || !pRight) return null;

    const uX = pLeft[0] - pCenter[0];
    const uY = pLeft[1] - pCenter[1];
    const uZ = pLeft[2] - pCenter[2];

    const vX = pRight[0] - pCenter[0];
    const vY = pRight[1] - pCenter[1];
    const vZ = pRight[2] - pCenter[2];

    const dot = uX * vX + uY * vY + uZ * vZ;
    const magU = Math.sqrt(uX * uX + uY * uY + uZ * uZ);
    const magV = Math.sqrt(vX * vX + vY * vY + vZ * vZ);

    if (magU === 0 || magV === 0) return null;

    const cosTheta = Math.min(1, Math.max(-1, dot / (magU * magV)));
    return (Math.acos(cosTheta) * 180) / Math.PI;
  }

  /**
   * Genera la serie temporal de ángulos para un mapeo dado de 3 puntos del laboratorio.
   * @param {Array} labFrames Array de { t, points: { 'Point #1': [x,y,z], ... } }
   * @param {string} centerPoint Nombre del punto central (ej. 'Point #3')
   * @param {string} leftPoint Nombre del punto adyacente 1 (ej. 'Point #2')
   * @param {string} rightPoint Nombre del punto adyacente 2 (ej. 'Point #4')
   * @returns {Array<{ t: number, angle: number|null }>}
   */
  static computeAngleSeries(labFrames, centerPoint, leftPoint, rightPoint) {
    if (!labFrames || !centerPoint || !leftPoint || !rightPoint) return [];

    return labFrames.map(frame => {
      const pCenter = frame.points[centerPoint];
      const pLeft = frame.points[leftPoint];
      const pRight = frame.points[rightPoint];

      const angle = this.calculate3DAngle(pCenter, pLeft, pRight);
      return {
        t: frame.t,
        angle: angle !== null ? Number(angle.toFixed(2)) : null,
      };
    });
  }

  /**
   * Mapea / interpola la serie de ángulos del laboratorio sobre la línea de tiempo de MediaPipe.
   * Aplica un desfase temporal (timeOffset en segundos: t_lab = t_video - timeOffset).
   * @param {Array<number>} targetTimes Tiempos de los frames de MediaPipe (ej. [0, 0.033, 0.066...])
   * @param {Array<{ t: number, angle: number|null }>} labAngleSeries 
   * @param {number} timeOffset Desfase en segundos (positivo = adelantar lab, negativo = retrasar lab)
   * @returns {Array<number|null>} Array de ángulos alineados con targetTimes
   */
  static alignToTargetTimeline(targetTimes, labAngleSeries, timeOffset = 0) {
    if (!targetTimes || targetTimes.length === 0 || !labAngleSeries || labAngleSeries.length === 0) {
      return [];
    }

    const validLab = labAngleSeries.filter(d => d.angle !== null && !isNaN(d.angle));
    if (validLab.length === 0) {
      return targetTimes.map(() => null);
    }

    const aligned = [];
    let lastLabIdx = 0;

    for (const tTarget of targetTimes) {
      // Tiempo correspondiente en los datos de laboratorio
      const tLab = tTarget - timeOffset;

      if (tLab < validLab[0].t || tLab > validLab[validLab.length - 1].t) {
        aligned.push(null);
        continue;
      }

      // Búsqueda binaria o lineal avanzada para encontrar los dos puntos contiguos
      while (lastLabIdx < validLab.length - 1 && validLab[lastLabIdx + 1].t <= tLab) {
        lastLabIdx++;
      }

      const p1 = validLab[lastLabIdx];
      const p2 = validLab[Math.min(lastLabIdx + 1, validLab.length - 1)];

      if (p1.t === p2.t || p1.t === tLab) {
        aligned.push(p1.angle);
      } else {
        // Interpolación lineal entre p1 y p2
        const factor = (tLab - p1.t) / (p2.t - p1.t);
        const interp = p1.angle + factor * (p2.angle - p1.angle);
        aligned.push(Number(interp.toFixed(2)));
      }
    }

    return aligned;
  }

  /**
   * Calcula métricas de error de precisión entre la predicción de MediaPipe y la Referencia de Laboratorio.
   * @param {Array<number|null>} predictedAngles Curva MediaPipe
   * @param {Array<number|null>} referenceAngles Curva Laboratorio
   * @returns {{ mae: string, rmse: string, maxError: string, samples: number }}
   */
  static calculateErrorMetrics(predictedAngles, referenceAngles) {
    if (!predictedAngles || !referenceAngles) {
      return { mae: 'N/A', rmse: 'N/A', maxError: 'N/A', samples: 0 };
    }

    let sumAbsDiff = 0;
    let sumSqDiff = 0;
    let maxDiff = 0;
    let count = 0;

    const len = Math.min(predictedAngles.length, referenceAngles.length);
    for (let i = 0; i < len; i++) {
      const p = predictedAngles[i];
      const r = referenceAngles[i];

      if (p !== null && r !== null && !isNaN(p) && !isNaN(r)) {
        const diff = Math.abs(p - r);
        sumAbsDiff += diff;
        sumSqDiff += diff * diff;
        if (diff > maxDiff) maxDiff = diff;
        count++;
      }
    }

    if (count === 0) {
      return { mae: 'N/A', rmse: 'N/A', maxError: 'N/A', samples: 0 };
    }

    const mae = sumAbsDiff / count;
    const rmse = Math.sqrt(sumSqDiff / count);

    return {
      mae: mae.toFixed(2) + '°',
      rmse: rmse.toFixed(2) + '°',
      maxError: maxDiff.toFixed(2) + '°',
      samples: count,
    };
  }
}
