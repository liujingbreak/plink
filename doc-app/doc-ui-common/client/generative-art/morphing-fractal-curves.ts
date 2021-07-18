
function canvasApp(context: CanvasRenderingContext2D, displayWidth: number, displayHeight: number) {

  // off screen canvas used only when exporting image
  let exportCanvas = document.createElement('canvas');
  exportCanvas.width = displayWidth;
  exportCanvas.height = displayHeight;


  let numCircles: number;
  let maxMaxRad: number;
  let minMaxRad: number;
  let minRadFactor: number;
  let circles: {
    centerX: number;
    centerY: number;
    maxRad: number;
    minRad: number;
    phase: number;
    pointArray: number[];
  }[];
  let iterations: number;
  let numPoints: number;
  let timer: ReturnType<typeof setInterval> | null;
  let drawsPerFrame: number;
  // let drawCount: number;
  let lineWidth: number;
  let colorArray: string[];
  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;
  let lineNumber: number;
  let twistAmount: number;
  let fullTurn: number;
  let lineAlpha: number;
  let maxColorValue: number;
  let minColorValue: number;
  let stepsPerSegment: number;

  init();

  function init() {
    numCircles = 15; // 35
    maxMaxRad = 200;
    minMaxRad = 200;
    minRadFactor = 0;
    iterations = 11;
    numPoints = Math.pow(2, iterations) + 1;
    drawsPerFrame = 4;

    fullTurn = Math.PI * 2 * numPoints / (1 + numPoints);

    minX = -maxMaxRad;
    maxX = displayWidth + maxMaxRad;
    minY = displayHeight / 2 - 50;
    maxY = displayHeight / 2 + 50;

    twistAmount = 0.67 * Math.PI * 2;

    stepsPerSegment = Math.floor(800 / numCircles);

    maxColorValue = 100;
    minColorValue = 20;
    lineAlpha = 0.10;

    // bgColor = '#000000';
    // urlColor = '#333333';

    lineWidth = 1.01;

    startGenerate();
  }

  function startGenerate() {
    // drawCount = 0;
    context.setTransform(1, 0, 0, 1, 0, 0);

    context.clearRect(0, 0, displayWidth, displayHeight);

    setCircles();

    colorArray = setColorList(iterations);

    lineNumber = 0;

    if (timer) {clearInterval(timer); }
    timer = setInterval(onTimer, 1000 / 60);

  }

  function setColorList(iter: number) {
    let r0, g0, b0;
    let r1, g1, b1;
    let param;
    let colorArray;
    let i, len;



    r0 = minColorValue + Math.random() * (maxColorValue - minColorValue);
    g0 = minColorValue + Math.random() * (maxColorValue - minColorValue);
    b0 = minColorValue + Math.random() * (maxColorValue - minColorValue);

    r1 = minColorValue + Math.random() * (maxColorValue - minColorValue);
    g1 = minColorValue + Math.random() * (maxColorValue - minColorValue);
    b1 = minColorValue + Math.random() * (maxColorValue - minColorValue);


    /*
    //can also set colors explicitly here if you like.
    r1 = 90;
    g1 = 60;
    b1 = 20;
    
    r0 = 30;
    g0 = 77;
    b0 = 66;
    */

    let colorParamArray = setLinePoints(iter);
    colorArray = [];

    len = colorParamArray.length;

    for (i = 0; i < len; i++) {
      param = colorParamArray[i];

      const r = Math.floor(r0 + param * (r1 - r0));
      const g = Math.floor(g0 + param * (g1 - g0));
      const b = Math.floor(b0 + param * (b1 - b0));

      const newColor = 'rgba(' + r + ',' + g + ',' + b + ',' + lineAlpha + ')';

      colorArray.push(newColor);
    }

    return colorArray;

  }

  function setCircles() {
    let i;

    circles = [];

    for (i = 0; i < numCircles; i++) {
      const maxR = minMaxRad + Math.random() * (maxMaxRad - minMaxRad);
      const minR = minRadFactor * maxR;

      let newCircle = {
        centerX: minX + i / (numCircles - 1) * (maxX - minX),
        centerY: minY + i / (numCircles - 1) * (maxY - minY),
        // centerY: minY + Math.random()*(maxY - minY),
        maxRad : maxR,
        minRad : minR,
        phase : i / (numCircles - 1) * twistAmount,
        pointArray : setLinePoints(iterations)
        };
      circles.push(newCircle);
    }
  }

  function onTimer() {
    let i;
    let theta;

    let numCircles = circles.length;

    let linParam;
    let cosParam;
    let centerX: number, centerY: number;
    let xSqueeze = 0.75;
    let x0, y0;
    let rad, rad0, rad1;
    let phase, phase0, phase1;

    for (let k = 0; k < drawsPerFrame; k++) {

      theta = lineNumber / (numPoints - 1) * fullTurn;

      context.globalCompositeOperation = 'lighter';

      context.lineJoin = 'miter';

      context.strokeStyle = colorArray[lineNumber];
      context.lineWidth = lineWidth;
      context.beginPath();

      // move to first point
      centerX = circles[0].centerX;
      centerY = circles[0].centerY;
      rad = circles[0].minRad + circles[0].pointArray[lineNumber] * (circles[0].maxRad - circles[0].minRad);
      phase = circles[0].phase;
      x0 = centerX + xSqueeze * rad * Math.cos(theta + phase);
      y0 = centerY + rad * Math.sin(theta + phase);
      context.moveTo(x0, y0);

      for (i = 0; i < numCircles - 1; i++) {
        // draw between i and i+1 circle
        rad0 = circles[i].minRad + circles[i].pointArray[lineNumber] * (circles[i].maxRad - circles[i].minRad);
        rad1 = circles[i + 1].minRad + circles[i + 1].pointArray[lineNumber] * (circles[i + 1].maxRad - circles[i + 1].minRad);
        phase0 = circles[i].phase;
        phase1 = circles[i + 1].phase;

        for (let j = 0; j < stepsPerSegment; j++) {
          linParam = j / (stepsPerSegment - 1);
          cosParam = 0.5 - 0.5 * Math.cos(linParam * Math.PI);

          // interpolate center
          centerX = circles[i].centerX + linParam * (circles[i + 1].centerX - circles[i].centerX);
          centerY = circles[i].centerY + cosParam * (circles[i + 1].centerY - circles[i].centerY);

          // interpolate radius
          rad = rad0 + cosParam * (rad1 - rad0);

          // interpolate phase
          phase = phase0 + cosParam * (phase1 - phase0);

          x0 = centerX + xSqueeze * rad * Math.cos(theta + phase);
          y0 = centerY + rad * Math.sin(theta + phase);

          context.lineTo(x0, y0);

        }

      }

      context.stroke();

      lineNumber++;
      if (timer != null && lineNumber > numPoints - 1) {
        clearInterval(timer);
        timer = null;
        break;
      }
    }
  }

  interface LinkedPoint {
    x: number; y: number;
    next?: LinkedPoint;
  }

  // Here is the function that defines a noisy (but not wildly varying) data set which we will use to draw the curves.
  // We first define the points in a linked list, but then store the values in an array.
  function setLinePoints(iterations: number) {
    let pointList = {} as {first?: LinkedPoint};
    let pointArray = [];
    pointList.first = {x: 0, y: 1};
    let lastPoint = {x: 1, y: 1};
    let minY = 1;
    let maxY = 1;
    let point: LinkedPoint | undefined;
    let nextPoint: LinkedPoint;
    let dx, newX, newY;


    pointList.first.next = lastPoint;
    for (let i = 0; i < iterations; i++) {
      point = pointList.first;
      while (point.next != null) {
        nextPoint = point.next;

        dx = nextPoint.x - point.x;
        newX = 0.5 * (point.x + nextPoint.x);
        newY = 0.5 * (point.y + nextPoint.y);
        newY += dx * (Math.random() * 2 - 1);

        let newPoint: LinkedPoint = {x: newX, y: newY};

        // min, max
        if (newY < minY) {
          minY = newY;
        } else if (newY > maxY) {
          maxY = newY;
        }

        // put between points
        newPoint.next = nextPoint;
        point.next = newPoint;

        point = nextPoint;
      }
    }

    // normalize to values between 0 and 1
    // Also store y values in array here.
    if (maxY !== minY) {
      let normalizeRate = 1 / (maxY - minY);
      point = pointList.first;
      while (point != null) {
        point.y = normalizeRate * (point.y - minY);
        pointArray.push(point.y);
        point = point.next;
      }
    }
    // unlikely that max = min, but could happen if using zero iterations. In this case, set all points equal to 1.
    else {
      point = pointList.first;
      while (point != null) {
        point.y = 1;
        pointArray.push(point.y);
        point = point.next;
      }
    }

    return pointArray;
  }
}
