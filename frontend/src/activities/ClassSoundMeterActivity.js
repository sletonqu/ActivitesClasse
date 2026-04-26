import React, { useEffect, useMemo, useRef, useState } from "react";

export const defaultClassSoundMeterActivityContent = {
  title: "Sonomètre de Classe",
  subtitle: "Outil visuel pour garder une ambiance de travail calme.",
  timerMinutes: 3,
  paletteName: "Ocean",
};

const PALETTES = {
  Classique: ["#22c55e", "#84cc16", "#facc15", "#fb923c", "#ef4444"],
  Ocean: ["#0ea5e9", "#06b6d4", "#2dd4bf", "#facc15", "#f97316"],
  Crépuscule: ["#4f46e5", "#6366f1", "#8b5cf6", "#f97316", "#ef4444"],
};

const GAUGE_VIEWBOX_SIZE = 220;
const GAUGE_RENDER_SIZE = 115;
const GAUGE_SCALE_RATIO = GAUGE_RENDER_SIZE / GAUGE_VIEWBOX_SIZE;
const GAUGE_START_ANGLE = -135;
const GAUGE_SWEEP_ANGLE = 270;
const PROGRESS_SUBDIVISIONS_PER_SECOND = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hexColor) {
  const raw = String(hexColor || "").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => `${part}${part}`).join("") : raw;
  const safe = full.padEnd(6, "0").slice(0, 6);

  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16),
  };
}

function mixColors(colorA, colorB, ratio) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const t = clamp(ratio, 0, 1);

  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bValue = Math.round(a.b + (b.b - a.b) * t);

  return `rgb(${r}, ${g}, ${bValue})`;
}

function resolveColorAtLevel(level, paletteName) {
  const palette = PALETTES[paletteName] || PALETTES.Classique;
  const safeLevel = clamp(level, 0, 1);

  if (palette.length <= 1) {
    return palette[0] || "#22c55e";
  }

  const scaled = safeLevel * (palette.length - 1);
  const lowIndex = Math.floor(scaled);
  const highIndex = Math.min(palette.length - 1, lowIndex + 1);
  const ratio = scaled - lowIndex;

  return mixColors(palette[lowIndex], palette[highIndex], ratio);
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function levelToDisplayLevel(level) {
  const safeLevel = clamp(level, 0, 1);
  const boosted = clamp(safeLevel * 4, 0, 1);
  const expanded = Math.pow(boosted, 0.6);
  return Math.round(expanded * 100);
}

function levelToGaugeBubblePosition(level, radius = 110) {
  const safeLevel = clamp(level, 0, 1);
  const angle = (GAUGE_START_ANGLE + safeLevel * GAUGE_SWEEP_ANGLE) * (Math.PI / 180);

  return {
    left: 110 + Math.cos(angle) * radius,
    top: 110 + Math.sin(angle) * radius,
  };
}

function buildGaugeArcStyle(level, circumference) {
  const safeLevel = clamp(level, 0, 1);
  const visibleLength = circumference * (GAUGE_SWEEP_ANGLE / 360);

  return {
    strokeDasharray: `${visibleLength * safeLevel} ${circumference}`,
    transform: `rotate(${GAUGE_START_ANGLE} 110 110)`,
    transformOrigin: "110px 110px",
  };
}

function buildGaugeTrackStyle(circumference) {
  const visibleLength = circumference * (GAUGE_SWEEP_ANGLE / 360);

  return {
    strokeDasharray: `${visibleLength} ${circumference}`,
    transform: `rotate(${GAUGE_START_ANGLE} 110 110)`,
    transformOrigin: "110px 110px",
  };
}

function buildGaugeSegmentStyle(startRatio, spanRatio, circumference) {
  const safeStartRatio = clamp(startRatio, 0, 1);
  const safeSpanRatio = clamp(spanRatio, 0, 1 - safeStartRatio);
  const visibleLength = circumference * (GAUGE_SWEEP_ANGLE / 360);
  const segmentStartAngle = GAUGE_START_ANGLE + safeStartRatio * GAUGE_SWEEP_ANGLE;

  return {
    strokeDasharray: `${visibleLength * safeSpanRatio} ${circumference}`,
    transform: `rotate(${segmentStartAngle} 110 110)`,
    transformOrigin: "110px 110px",
  };
}

function buildGaugeConnectorStyle(fromPoint, toPoint, color) {
  const deltaX = toPoint.left - fromPoint.left;
  const deltaY = toPoint.top - fromPoint.top;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return {
    left: `${fromPoint.left}px`,
    top: `${fromPoint.top}px`,
    width: `${length}px`,
    transform: `translateY(-50%) rotate(${angle}deg)`,
    transformOrigin: "left center",
    background: `linear-gradient(90deg, ${color} 0%, rgba(255, 255, 255, 0.92) 100%)`,
    boxShadow: `0 0 10px ${color}`,
  };
}

function scaleGaugePoint(point) {
  return {
    left: point.left * GAUGE_SCALE_RATIO,
    top: point.top * GAUGE_SCALE_RATIO,
  };
}

const ClassSoundMeterActivity = ({ content }) => {
  const resolvedContent = useMemo(() => {
    const source = content && typeof content === "object" ? content : {};
    const paletteName = Object.prototype.hasOwnProperty.call(PALETTES, source.paletteName)
      ? source.paletteName
      : defaultClassSoundMeterActivityContent.paletteName;

    return {
      title: source.title || defaultClassSoundMeterActivityContent.title,
      subtitle: source.subtitle || defaultClassSoundMeterActivityContent.subtitle,
      timerMinutes: clamp(Number(source.timerMinutes) || defaultClassSoundMeterActivityContent.timerMinutes, 1, 60),
      paletteName,
    };
  }, [content]);

  const [timerMinutes, setTimerMinutes] = useState(resolvedContent.timerMinutes);
  const [paletteName, setPaletteName] = useState(resolvedContent.paletteName);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(resolvedContent.timerMinutes * 60));
  const [currentLevel, setCurrentLevel] = useState(0);
  const [audioState, setAudioState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(Math.round(resolvedContent.timerMinutes * 60));
  const [sessionStats, setSessionStats] = useState({ sum: 0, count: 0, max: 0 });

  const timerEndTsRef = useRef(null);
  const sampleIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const sampleBufferRef = useRef(null);
  const progressCanvasRef = useRef(null);
  const rawMeasurementsRef = useRef([]);
  const lastMeasurementElapsedMsRef = useRef(0);
  const lastWrittenCellIndexRef = useRef(-1);
  const lastWrittenLevelRef = useRef(null);

  const configuredDurationSeconds = Math.round(timerMinutes * 60);
  const totalProgressCells = sessionDurationSeconds * PROGRESS_SUBDIVISIONS_PER_SECOND;
  const sampleIntervalMs = 100;
  const transitionMs = 220;
  const gaugeRingRadius = 74;
  const gaugeRingStroke = 20;
  const gaugeCircumference = 2 * Math.PI * gaugeRingRadius;
  const gaugeCenterDiskRadius = 52;
  const calmColor = resolveColorAtLevel(0, paletteName);
  const averageLevel = sessionStats.count > 0 ? sessionStats.sum / sessionStats.count : 0;
  const maxLevel = sessionStats.max;
  const displayCurrentLevel = levelToDisplayLevel(currentLevel) / 100;
  const displayAverageLevel = levelToDisplayLevel(averageLevel) / 100;
  const displayMaxLevel = levelToDisplayLevel(maxLevel) / 100;
  const gaugeTrackStyle = buildGaugeTrackStyle(gaugeCircumference);
  const gaugeLiveStyle = buildGaugeArcStyle(displayCurrentLevel, gaugeCircumference);
  const gaugeWarningStyle = buildGaugeSegmentStyle(0.55, 0.18, gaugeCircumference);
  const gaugeDangerStyle = buildGaugeSegmentStyle(0.85, 0.25, gaugeCircumference);
  const liveColor = resolveColorAtLevel(displayCurrentLevel, paletteName);
  const averageBubblePosition = scaleGaugePoint(levelToGaugeBubblePosition(displayAverageLevel, 126));
  const maxBubblePosition = scaleGaugePoint(levelToGaugeBubblePosition(displayMaxLevel, 122));
  const averageAnchorPosition = scaleGaugePoint(levelToGaugeBubblePosition(displayAverageLevel, 90));
  const maxAnchorPosition = scaleGaugePoint(levelToGaugeBubblePosition(displayMaxLevel, 90));
  const averageConnectorStyle = buildGaugeConnectorStyle(
    averageAnchorPosition,
    averageBubblePosition,
    "rgba(192, 132, 252, 0.95)"
  );
  const maxConnectorStyle = buildGaugeConnectorStyle(
    maxAnchorPosition,
    maxBubblePosition,
    "rgba(49, 46, 129, 0.95)"
  );

  const resetProgressTrace = () => {
    rawMeasurementsRef.current = [];
    lastMeasurementElapsedMsRef.current = 0;
    lastWrittenCellIndexRef.current = -1;
    lastWrittenLevelRef.current = null;
  };

  const appendRawMeasurement = (cellIndex, elapsedMs, level) => {
    const safeCellDurationMs = totalProgressCells > 0
      ? (sessionDurationSeconds * 1000) / totalProgressCells
      : 0;
    const lastCellIndex = lastWrittenCellIndexRef.current;
    const lastLevel = lastWrittenLevelRef.current;

    if (lastCellIndex >= 0 && cellIndex > lastCellIndex + 1 && lastLevel != null && safeCellDurationMs > 0) {
      for (let missingIndex = lastCellIndex + 1; missingIndex < cellIndex; missingIndex += 1) {
        rawMeasurementsRef.current.push({
          elapsedMs: missingIndex * safeCellDurationMs,
          level: lastLevel,
        });
      }
    }

    rawMeasurementsRef.current.push({ elapsedMs, level });
    lastMeasurementElapsedMsRef.current = Math.max(lastMeasurementElapsedMsRef.current, elapsedMs);
    lastWrittenCellIndexRef.current = Math.max(lastCellIndex, cellIndex);
    lastWrittenLevelRef.current = level;
  };

  const stopAudioCapture = () => {
    if (sampleIntervalRef.current) {
      window.clearInterval(sampleIntervalRef.current);
      sampleIntervalRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Aucun traitement nécessaire si la source est déjà déconnectée.
      }
      sourceNodeRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // Aucun traitement nécessaire si l'analyseur est déjà déconnecté.
      }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopTimerLoop = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerEndTsRef.current = null;
  };

  const stopEverything = () => {
    stopTimerLoop();
    stopAudioCapture();
  };

  const measureCurrentVolume = () => {
    const analyser = analyserRef.current;
    const sampleBuffer = sampleBufferRef.current;

    if (!analyser || !sampleBuffer) {
      return;
    }

    analyser.getByteTimeDomainData(sampleBuffer);
    let peakLevel = 0;

    for (let index = 0; index < sampleBuffer.length; index += 1) {
      const normalized = (sampleBuffer[index] - 128) / 128;
      const absoluteLevel = Math.abs(normalized);
      if (absoluteLevel > peakLevel) {
        peakLevel = absoluteLevel;
      }
    }

    const instantaneousLevel = clamp(peakLevel, 0, 1);
    const instantaneousDisplayLevel = levelToDisplayLevel(instantaneousLevel) / 100;
    const now = Date.now();
    const preciseRemainingSeconds = timerEndTsRef.current
      ? Math.max((timerEndTsRef.current - now) / 1000, 0)
      : remainingSeconds;
    const captureProgress = sessionDurationSeconds > 0
      ? clamp((sessionDurationSeconds - preciseRemainingSeconds) / sessionDurationSeconds, 0, 1)
      : 0;
    const currentCellIndex = totalProgressCells > 0
      ? clamp(Math.floor(captureProgress * totalProgressCells), 0, totalProgressCells - 1)
      : 0;
    const stableCellIndex = Math.max(lastWrittenCellIndexRef.current, currentCellIndex);
    const elapsedMs = totalProgressCells > 0
      ? (stableCellIndex / totalProgressCells) * (sessionDurationSeconds * 1000)
      : 0;

    setCurrentLevel(instantaneousLevel);
    setSessionStats((previous) => ({
      sum: previous.sum + instantaneousLevel,
      count: previous.count + 1,
      max: instantaneousLevel > previous.max ? instantaneousLevel : previous.max,
    }));

    appendRawMeasurement(stableCellIndex, elapsedMs, instantaneousDisplayLevel);
  };

  const initializeAudioCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioState("error");
      setErrorMessage("Le navigateur ne permet pas l'accès au micro pour cette activité.");
      return false;
    }

    try {
      setAudioState("requesting");
      setErrorMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;

      sourceNode.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      analyserRef.current = analyser;
      sampleBufferRef.current = new Uint8Array(analyser.fftSize);
      setAudioState("ready");
      return true;
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        setAudioState("denied");
        setErrorMessage("Accès au micro refusé. Autorisez le micro pour utiliser le sonomètre.");
      } else {
        setAudioState("error");
        setErrorMessage("Impossible de démarrer l'écoute du micro.");
      }
      return false;
    }
  };

  const handlePlayPause = async () => {
    if (isFinished) {
      return;
    }

    const isFreshStart = sessionStats.count === 0;

    if (isRunning) {
      const now = Date.now();
      if (timerEndTsRef.current) {
        const nextRemainingSeconds = clamp(Math.ceil((timerEndTsRef.current - now) / 1000), 0, sessionDurationSeconds);
        setRemainingSeconds(nextRemainingSeconds);
      }
      setIsRunning(false);
      stopEverything();
      return;
    }

    const ready = await initializeAudioCapture();
    if (!ready) {
      return;
    }

    if (isFreshStart) {
      setSessionDurationSeconds(configuredDurationSeconds);
      setRemainingSeconds(configuredDurationSeconds);
      setCurrentLevel(0);
      resetProgressTrace();
      setSessionStats({ sum: 0, count: 0, max: 0 });
    }
    setErrorMessage("");
    setAudioState("ready");
    setIsRunning(true);
  };

  const handleReset = () => {
    stopEverything();
    setIsRunning(false);
    setIsFinished(false);
    setSessionDurationSeconds(configuredDurationSeconds);
    setRemainingSeconds(configuredDurationSeconds);
    setCurrentLevel(0);
    resetProgressTrace();
    setSessionStats({ sum: 0, count: 0, max: 0 });
    setErrorMessage("");
    setAudioState("idle");
  };

  useEffect(() => {
    if (isRunning || sessionStats.count > 0) {
      return;
    }

    setRemainingSeconds(configuredDurationSeconds);
    setSessionDurationSeconds(configuredDurationSeconds);
    resetProgressTrace();
  }, [isRunning, configuredDurationSeconds, sessionStats.count]);

  useEffect(() => {
    if (!isRunning || isFinished) {
      return undefined;
    }

    timerEndTsRef.current = Date.now() + remainingSeconds * 1000;

    timerIntervalRef.current = window.setInterval(() => {
      if (!timerEndTsRef.current) {
        return;
      }

      const nextRemainingSeconds = clamp(Math.ceil((timerEndTsRef.current - Date.now()) / 1000), 0, sessionDurationSeconds);
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds <= 0) {
        setIsRunning(false);
        setIsFinished(true);
        stopEverything();
      }
    }, 250);

    return () => {
      stopTimerLoop();
    };
  }, [isRunning, isFinished, remainingSeconds, sessionDurationSeconds]);

  useEffect(() => {
    if (!isRunning || isFinished) {
      return undefined;
    }

    sampleIntervalRef.current = window.setInterval(() => {
      measureCurrentVolume();
    }, sampleIntervalMs);

    return () => {
      if (sampleIntervalRef.current) {
        window.clearInterval(sampleIntervalRef.current);
        sampleIntervalRef.current = null;
      }
    };
  }, [isRunning, isFinished, sampleIntervalMs]);

  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  useEffect(() => {
    const canvas = progressCanvasRef.current;
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    const cssWidth = Math.max(1, Math.floor(parent.clientWidth));
    const cssHeight = 20;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#020617";
    context.fillRect(0, 0, pixelWidth, pixelHeight);

    const sessionDurationMs = sessionDurationSeconds * 1000;
    if (sessionDurationMs <= 0 || totalProgressCells <= 0) {
      return;
    }

    const elapsedByTimerMs = clamp((sessionDurationSeconds - remainingSeconds) * 1000, 0, sessionDurationMs);
    const elapsedMs = clamp(Math.max(elapsedByTimerMs, lastMeasurementElapsedMsRef.current), 0, sessionDurationMs);

    const renderedCells = Math.max(1, Math.min(totalProgressCells, pixelWidth));
    const cellDurationMs = sessionDurationMs / renderedCells;
    const cellLevels = new Array(renderedCells).fill(null);

    for (const sample of rawMeasurementsRef.current) {
      if (sample.elapsedMs < 0 || sample.elapsedMs > elapsedMs) {
        continue;
      }

      const renderedIndex = clamp(Math.floor(sample.elapsedMs / cellDurationMs), 0, renderedCells - 1);
      const previousLevel = cellLevels[renderedIndex];
      cellLevels[renderedIndex] = previousLevel == null ? sample.level : Math.max(previousLevel, sample.level);
    }

    const revealedCells = clamp(Math.floor((elapsedMs / sessionDurationMs) * renderedCells), 0, renderedCells);
    let lastKnownLevel = null;

    for (let index = 0; index < revealedCells; index += 1) {
      const level = cellLevels[index] == null ? lastKnownLevel : cellLevels[index];
      if (cellLevels[index] != null) {
        lastKnownLevel = cellLevels[index];
      }

      const xStart = Math.floor((index * pixelWidth) / renderedCells);
      const xEnd = Math.floor(((index + 1) * pixelWidth) / renderedCells);
      const width = Math.max(1, xEnd - xStart);

      context.fillStyle = level == null ? "#020617" : resolveColorAtLevel(level, paletteName);
      context.fillRect(xStart, 0, width, pixelHeight);
    }
  }, [
    currentLevel,
    paletteName,
    remainingSeconds,
    sessionDurationSeconds,
    totalProgressCells,
  ]);

  const centerColor = resolveColorAtLevel(clamp(displayCurrentLevel + 0.18, 0, 1), paletteName);
  const midColor = resolveColorAtLevel(clamp(displayCurrentLevel * 0.75, 0, 1), paletteName);

  return (
    <div
      id="class-sound-meter-root"
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-white"
      style={{ minHeight: "min(93.6vh, 1032px)" }}
    >
      <div
        id="class-sound-meter-background"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at center, ${centerColor} 0%, ${midColor} 38%, ${calmColor} 78%, #020617 100%)`,
          transition: `background-image ${transitionMs}ms linear, filter ${transitionMs}ms linear`,
          filter: `saturate(${1 + displayCurrentLevel * 0.6}) brightness(${0.86 + displayCurrentLevel * 0.25})`,
        }}
      />

      <div id="class-sound-meter-cloud-overlay" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-24 top-8 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ backgroundColor: resolveColorAtLevel(clamp(displayCurrentLevel * 0.5, 0, 1), paletteName) }}
        />
        <div
          className="absolute right-[-70px] top-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: resolveColorAtLevel(clamp(displayCurrentLevel + 0.1, 0, 1), paletteName) }}
        />
        <div
          className="absolute bottom-[-120px] left-[35%] h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: resolveColorAtLevel(clamp(displayCurrentLevel + 0.25, 0, 1), paletteName) }}
        />
      </div>

      <button
        id="class-sound-meter-config-button"
        type="button"
        onClick={() => setIsConfigOpen(true)}
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-lg border border-white/25 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-900/80"
      >
        <span aria-hidden="true">⚙</span>
      </button>

      <section id="class-sound-meter-main-panel" className="relative z-10 flex min-h-[696px] flex-col justify-between px-4 py-16 sm:px-8">
        <header id="class-sound-meter-header" className="mx-auto w-full max-w-4xl text-center">
          <h1 id="class-sound-meter-title" className="text-3xl font-black tracking-tight sm:text-4xl">
            {resolvedContent.title}
          </h1>
          <p id="class-sound-meter-subtitle" className="mt-2 text-sm text-slate-100/95 sm:text-base">
            {resolvedContent.subtitle}
          </p>
        </header>

        <main id="class-sound-meter-center" className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-center gap-6 text-center">

          {isFinished && sessionStats.count > 0 && (
            <div id="class-sound-meter-average" className="rounded-full border border-white/30 bg-slate-900/45 px-6 py-2 text-lg font-semibold text-white backdrop-blur">
              Niveau moyen&nbsp;: {Math.round(displayAverageLevel * 100)}&nbsp;%
            </div>
          )}

          <div id="class-sound-meter-timer" className="rounded-full border border-white/30 bg-slate-900/45 px-6 py-3 text-3xl font-black tracking-wider backdrop-blur">
            {formatSeconds(remainingSeconds)}
          </div>

          <div id="class-sound-meter-actions" className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="class-sound-meter-play-pause"
              type="button"
              onClick={handlePlayPause}
              disabled={isFinished || audioState === "requesting"}
              className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg border border-white/30 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">{isRunning ? "❚❚" : "▶"}</span>
              {audioState === "requesting" ? "Demande micro..." : isRunning ? "Pause" : "Play"}
            </button>
            <button
              id="class-sound-meter-reset"
              type="button"
              onClick={handleReset}
              className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              <span aria-hidden="true">↻</span>
              Réinitialiser
            </button>
          </div>

          {errorMessage && (
            <div id="class-sound-meter-error" className="w-full max-w-xl rounded-lg border border-rose-200/70 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          )}
        </main>

        <footer id="class-sound-meter-progress-footer" className="mx-auto mt-8 w-full max-w-4xl">
          <div className="h-5 overflow-hidden rounded-full border border-white/30 bg-slate-900/70">
            <canvas id="class-sound-meter-progress-fill" ref={progressCanvasRef} className="block h-full w-full" />
          </div>
        </footer>
      </section>

      {isConfigOpen && (
        <div id="class-sound-meter-config-modal" className="absolute inset-0 z-30 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
          <section className="w-full max-w-2xl rounded-xl border border-slate-200/20 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Configuration du Sonomètre</h2>
              <button
                id="class-sound-meter-config-close"
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                Fermer
              </button>
            </div>

            <div id="class-sound-meter-config-fields" className="space-y-5">
              <div
                id="class-sound-meter-live-indicator"
                className="rounded-2xl border border-white/20 bg-slate-900/40 px-6 py-4 backdrop-blur"
                style={{ transition: `transform ${transitionMs}ms ease, box-shadow ${transitionMs}ms ease` }}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-100/80">Niveau sonore instantané</p>

                <div className="relative mx-auto h-[130px] w-[220px] sm:w-[240px]">
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2"
                    style={{ height: `${GAUGE_RENDER_SIZE}px`, width: `${GAUGE_RENDER_SIZE}px` }}
                  >
                    <svg
                      viewBox={`0 0 ${GAUGE_VIEWBOX_SIZE} ${GAUGE_VIEWBOX_SIZE}`}
                      style={{ height: `${GAUGE_RENDER_SIZE}px`, width: `${GAUGE_RENDER_SIZE}px` }}
                    >
                    <circle
                      cx="110"
                      cy="110"
                      r={gaugeRingRadius}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth={gaugeRingStroke}
                      opacity="0.35"
                      strokeDasharray={gaugeTrackStyle.strokeDasharray}
                      transform={gaugeTrackStyle.transform}
                    />
                    <circle
                      cx="110"
                      cy="110"
                      r={gaugeRingRadius}
                      fill="none"
                      stroke={resolveColorAtLevel(0.75, paletteName)}
                      strokeWidth={gaugeRingStroke}
                      strokeLinecap="round"
                      strokeDasharray={gaugeWarningStyle.strokeDasharray}
                      transform={gaugeWarningStyle.transform}
                      opacity="0.95"
                    />
                    <circle
                      cx="110"
                      cy="110"
                      r={gaugeRingRadius}
                      fill="none"
                      stroke={resolveColorAtLevel(0.9, paletteName)}
                      strokeWidth={gaugeRingStroke}
                      strokeLinecap="round"
                      strokeDasharray={gaugeDangerStyle.strokeDasharray}
                      transform={gaugeDangerStyle.transform}
                      opacity="0.95"
                    />
                    <circle
                      cx="110"
                      cy="110"
                      r={gaugeRingRadius}
                      fill="none"
                      stroke={liveColor}
                      strokeWidth={gaugeRingStroke}
                      strokeLinecap="round"
                      strokeDasharray={gaugeLiveStyle.strokeDasharray}
                      transform={gaugeLiveStyle.transform}
                      style={{ transition: `stroke-dasharray ${Math.max(180, transitionMs)}ms linear, stroke ${Math.max(180, transitionMs)}ms linear` }}
                    />
                    <circle cx="110" cy="110" r={gaugeCenterDiskRadius} fill="#e2e8f0" opacity="0.95" />
                    <text
                      x="110"
                      y="107"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#1e1b4b"
                      style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1 }}
                    >
                      {Math.round(displayCurrentLevel * 100)}
                    </text>
                    <text
                      x="110"
                      y="138"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#475569"
                      style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "0.04em" }}
                    >
                      Niveau
                    </text>
                    </svg>

                    <div
                      className="pointer-events-none absolute h-[3px] rounded-full opacity-90"
                      style={averageConnectorStyle}
                    />
                    <div
                      className="pointer-events-none absolute h-[3px] rounded-full opacity-90"
                      style={maxConnectorStyle}
                    />
                    <div
                      className="absolute rounded-md border-2 border-violet-400 bg-white/95 px-1.5 py-0.5 text-[10px] font-black text-violet-600 shadow-lg"
                      style={{
                        left: `${averageBubblePosition.left}px`,
                        top: `${averageBubblePosition.top}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      Moy {Math.round(displayAverageLevel * 100)}
                    </div>
                    <div
                      className="absolute rounded-md border-2 border-indigo-950 bg-white/95 px-1.5 py-0.5 text-[10px] font-black text-indigo-950 shadow-lg"
                      style={{
                        left: `${maxBubblePosition.left}px`,
                        top: `${maxBubblePosition.top}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      Max {Math.round(displayMaxLevel * 100)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-100/85">
                  {isFinished
                    ? "Temps écoulé: l'écoute est arrêtée"
                    : isRunning
                      ? "Écoute du micro active"
                      : "Sonomètre en pause"}
                </p>
              </div>

              <div id="class-sound-meter-config-actions" className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/20 bg-slate-900/35 p-3">
                <button
                  id="class-sound-meter-config-play-pause"
                  type="button"
                  onClick={handlePlayPause}
                  disabled={isFinished || audioState === "requesting"}
                  className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg border border-white/30 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">{isRunning ? "❚❚" : "▶"}</span>
                  {audioState === "requesting" ? "Demande micro..." : isRunning ? "Pause" : "Play"}
                </button>
                <button
                  id="class-sound-meter-config-reset"
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
                >
                  <span aria-hidden="true">↻</span>
                  Réinitialiser
                </button>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                  <label htmlFor="class-sound-meter-config-timer">Durée du décompte</label>
                  <span>{timerMinutes} min</span>
                </div>
                <input
                  id="class-sound-meter-config-timer"
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={timerMinutes}
                  disabled={isRunning || isFinished || sessionStats.count > 0}
                  onChange={(event) => setTimerMinutes(clamp(Number(event.target.value) || 1, 1, 60))}
                  className="w-full accent-emerald-400 disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-300">
                  Réglable de 1 à 60 minutes. Non modifiable une fois le décompte démarré.
                </p>
              </div>

              <div>
                <label htmlFor="class-sound-meter-config-palette" className="mb-1 block text-sm font-semibold">
                  Palette de couleurs
                </label>
                <select
                  id="class-sound-meter-config-palette"
                  value={paletteName}
                  onChange={(event) => setPaletteName(event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  {Object.keys(PALETTES).map((paletteKey) => (
                    <option key={paletteKey} value={paletteKey}>
                      {paletteKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ClassSoundMeterActivity;