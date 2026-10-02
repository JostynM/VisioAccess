function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error(
          "No fue posible cargar la imagen.",
        ),
      );
    };

    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "No fue posible preparar la imagen.",
            ),
          );

          return;
        }

        resolve(blob);
      },
      "image/png",
      1,
    );
  });
}

function calculateOtsuThreshold(values) {
  const histogram = new Array(256).fill(0);

  values.forEach((value) => {
    histogram[value] += 1;
  });

  const total = values.length;

  let totalSum = 0;

  for (let i = 0; i < 256; i += 1) {
    totalSum += i * histogram[i];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;

  let maxVariance = 0;
  let threshold = 128;

  for (let i = 0; i < 256; i += 1) {
    backgroundWeight += histogram[i];

    if (backgroundWeight === 0) {
      continue;
    }

    const foregroundWeight =
      total - backgroundWeight;

    if (foregroundWeight === 0) {
      break;
    }

    backgroundSum +=
      i * histogram[i];

    const backgroundMean =
      backgroundSum /
      backgroundWeight;

    const foregroundMean =
      (totalSum - backgroundSum) /
      foregroundWeight;

    const variance =
      backgroundWeight *
      foregroundWeight *
      Math.pow(
        backgroundMean -
          foregroundMean,
        2,
      );

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

function getScale(image) {
  const largestSide = Math.max(
    image.width,
    image.height,
  );

  let scale = 1;

  if (largestSide < 900) {
    scale = 2.5;
  } else if (largestSide < 1500) {
    scale = 2;
  } else if (largestSide < 2000) {
    scale = 1.5;
  }

  const projectedLargestSide =
    largestSide * scale;

  const maxAllowedSize = 2800;

  if (
    projectedLargestSide >
    maxAllowedSize
  ) {
    scale =
      maxAllowedSize /
      largestSide;
  }

  return Math.max(scale, 1);
}

export async function preprocessImage(file) {
  const image =
    await loadImage(file);

  const scale =
    getScale(image);

  const width =
    Math.round(
      image.width * scale,
    );

  const height =
    Math.round(
      image.height * scale,
    );

  /*
   * Canvas base.
   */

  const sourceCanvas =
    document.createElement("canvas");

  sourceCanvas.width = width;
  sourceCanvas.height = height;

  const sourceContext =
    sourceCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!sourceContext) {
    throw new Error(
      "No se pudo preparar la imagen.",
    );
  }

  sourceContext.imageSmoothingEnabled =
    true;

  sourceContext.imageSmoothingQuality =
    "high";

  sourceContext.drawImage(
    image,
    0,
    0,
    width,
    height,
  );

  const sourceData =
    sourceContext.getImageData(
      0,
      0,
      width,
      height,
    );

  const pixels =
    sourceData.data;

  const grayValues =
    new Uint8Array(
      width * height,
    );

  let brightnessSum = 0;

  /*
   * Convertir a escala de grises.
   */

  for (
    let i = 0, pixelIndex = 0;
    i < pixels.length;
    i += 4, pixelIndex += 1
  ) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];

    const gray =
      Math.round(
        0.299 * red +
          0.587 * green +
          0.114 * blue,
      );

    grayValues[pixelIndex] =
      gray;

    brightnessSum += gray;
  }

  const averageBrightness =
    brightnessSum /
    grayValues.length;

  /*
   * --------------------------
   * VERSIÓN 1
   * Grises + contraste
   * --------------------------
   */

  const grayCanvas =
    document.createElement("canvas");

  grayCanvas.width = width;
  grayCanvas.height = height;

  const grayContext =
    grayCanvas.getContext("2d");

  const grayImageData =
    grayContext.createImageData(
      width,
      height,
    );

  const contrastFactor = 1.65;

  for (
    let i = 0, pixelIndex = 0;
    i < grayImageData.data.length;
    i += 4, pixelIndex += 1
  ) {
    let value =
      grayValues[pixelIndex];

    value =
      (value - 128) *
        contrastFactor +
      128;

    value = Math.max(
      0,
      Math.min(
        255,
        Math.round(value),
      ),
    );

    grayImageData.data[i] =
      value;

    grayImageData.data[i + 1] =
      value;

    grayImageData.data[i + 2] =
      value;

    grayImageData.data[i + 3] =
      255;
  }

  grayContext.putImageData(
    grayImageData,
    0,
    0,
  );

  /*
   * --------------------------
   * VERSIÓN 2
   * Blanco y negro
   * --------------------------
   */

  const threshold =
    calculateOtsuThreshold(
      Array.from(grayValues),
    );

  const binaryCanvas =
    document.createElement("canvas");

  binaryCanvas.width = width;
  binaryCanvas.height = height;

  const binaryContext =
    binaryCanvas.getContext("2d");

  const binaryImageData =
    binaryContext.createImageData(
      width,
      height,
    );

  /*
   * Si la fotografía es predominantemente
   * oscura, invertimos el resultado para
   * intentar obtener letras negras
   * sobre fondo blanco.
   */

  const darkBackground =
    averageBrightness < 125;

  for (
    let i = 0, pixelIndex = 0;
    i < binaryImageData.data.length;
    i += 4, pixelIndex += 1
  ) {
    const gray =
      grayValues[pixelIndex];

    let value;

    if (darkBackground) {
      value =
        gray > threshold
          ? 0
          : 255;
    } else {
      value =
        gray < threshold
          ? 0
          : 255;
    }

    binaryImageData.data[i] =
      value;

    binaryImageData.data[i + 1] =
      value;

    binaryImageData.data[i + 2] =
      value;

    binaryImageData.data[i + 3] =
      255;
  }

  binaryContext.putImageData(
    binaryImageData,
    0,
    0,
  );

  const enhancedBlob =
    await canvasToBlob(
      grayCanvas,
    );

  const binaryBlob =
    await canvasToBlob(
      binaryCanvas,
    );

  return {
    enhancedBlob,
    binaryBlob,
  };
}