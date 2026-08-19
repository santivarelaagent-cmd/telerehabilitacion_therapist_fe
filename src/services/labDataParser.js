/**
 * labDataParser.js
 * Responsabilidad: Parsear archivos de datos de laboratorio / MoCap (.txt o .csv)
 * Formato esperado:
 *   Frame number,740
 *   First frame,1
 *   Point frequency,60
 *   Analog frequency,60
 *   
 *   Time,Point #1,,,Point #2,,,Point #3,,,Point #4,,,Point #5,,,Point #6,,
 *   s,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm,cm
 *   ,X,Y,Z,X,Y,Z,X,Y,Z,X,Y,Z,X,Y,Z,X,Y,Z
 *   0,33.29,37.84,100.19,...
 */

export function parseLabFile(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('El contenido del archivo no es válido.');
  }

  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 5) {
    throw new Error('El archivo no contiene suficientes líneas de datos.');
  }

  const metadata = {
    totalFrames: 0,
    firstFrame: 1,
    frequency: 60,
    analogFrequency: 60,
  };

  let headerIndex = -1;
  let pointsHeaderLine = null;

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    if (lower.startsWith('frame number')) {
      const parts = line.split(',');
      if (parts[1]) metadata.totalFrames = parseInt(parts[1], 10) || 0;
    } else if (lower.startsWith('first frame')) {
      const parts = line.split(',');
      if (parts[1]) metadata.firstFrame = parseInt(parts[1], 10) || 1;
    } else if (lower.startsWith('point frequency')) {
      const parts = line.split(',');
      if (parts[1]) metadata.frequency = parseFloat(parts[1]) || 60;
    } else if (lower.startsWith('analog frequency')) {
      const parts = line.split(',');
      if (parts[1]) metadata.analogFrequency = parseFloat(parts[1]) || 60;
    } else if (line.startsWith('Time') || lower.startsWith('time,')) {
      headerIndex = i;
      pointsHeaderLine = line;
      break;
    }
  }

  if (headerIndex === -1 || !pointsHeaderLine) {
    throw new Error('No se encontró el encabezado de tiempo y puntos (Time, Point #1, ...).');
  }

  // Identificar los puntos presentes en la cabecera
  // Time,Point #1,,,Point #2,,,Point #3,,,Point #4,,,Point #5,,,Point #6,,
  const rawHeaders = pointsHeaderLine.split(',').map(s => s.trim());
  const pointColumns = []; // Array de { name, xCol, yCol, zCol }

  let currentPointName = null;
  let currentStartCol = -1;

  for (let col = 1; col < rawHeaders.length; col++) {
    const val = rawHeaders[col];
    if (val && val.length > 0) {
      if (currentPointName && currentStartCol !== -1) {
        pointColumns.push({
          name: currentPointName,
          xCol: currentStartCol,
          yCol: currentStartCol + 1,
          zCol: currentStartCol + 2,
        });
      }
      currentPointName = val;
      currentStartCol = col;
    }
  }

  if (currentPointName && currentStartCol !== -1) {
    pointColumns.push({
      name: currentPointName,
      xCol: currentStartCol,
      yCol: currentStartCol + 1,
      zCol: currentStartCol + 2,
    });
  }

  // Buscar la línea donde comienzan los números
  let dataStartIndex = headerIndex + 1;
  for (let i = headerIndex + 1; i < Math.min(lines.length, headerIndex + 6); i++) {
    const firstCell = lines[i].split(',')[0].trim();
    if (!isNaN(parseFloat(firstCell)) && isFinite(firstCell)) {
      dataStartIndex = i;
      break;
    }
  }

  const frames = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < 2) continue;

    const timeVal = parseFloat(row[0]);
    if (isNaN(timeVal)) continue;

    const framePoints = {};
    for (const pt of pointColumns) {
      const x = parseFloat(row[pt.xCol]);
      const y = parseFloat(row[pt.yCol]);
      const z = parseFloat(row[pt.zCol]);

      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        framePoints[pt.name] = [x, y, z];
      } else {
        framePoints[pt.name] = null;
      }
    }

    frames.push({
      t: Number(timeVal.toFixed(5)),
      points: framePoints,
    });
  }

  if (frames.length === 0) {
    throw new Error('No se pudieron extraer cuadros de datos numéricos del archivo.');
  }

  metadata.totalFrames = frames.length;
  metadata.duration = frames[frames.length - 1].t - frames[0].t;

  return {
    metadata,
    pointNames: pointColumns.map(p => p.name),
    frames,
  };
}
