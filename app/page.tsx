'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type GradientId = 'sunset' | 'violet' | 'lagoon' | 'midnight' | 'ember';

type Gradient = {
  id: GradientId;
  label: string;
  stops: string[];
};

type ShapeStyle = 'circle' | 'wave' | 'diagonal';

const gradients: Gradient[] = [
  { id: 'sunset', label: 'Sunset Punch', stops: ['#ff6b6b', '#feca57', '#ff9ff3'] },
  { id: 'violet', label: 'Violet Bloom', stops: ['#9795f0', '#fbc8d4'] },
  { id: 'lagoon', label: 'Lagoon Drift', stops: ['#43c6ac', '#191654'] },
  { id: 'midnight', label: 'Midnight Dash', stops: ['#0f2027', '#203a43', '#2c5364'] },
  { id: 'ember', label: 'Ember Glow', stops: ['#ff512f', '#dd2476'] }
];

const shapeOptions: { id: ShapeStyle; label: string }[] = [
  { id: 'circle', label: 'Pulse Halo' },
  { id: 'wave', label: 'Aurora Wave' },
  { id: 'diagonal', label: 'Diagonal Rays' }
];

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  palette: Gradient,
  elapsed: number,
  shape: ShapeStyle
) {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  palette.stops.forEach((stop, index) => {
    gradient.addColorStop(index / Math.max(palette.stops.length - 1, 1), stop);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff';

  const loop = elapsed % 6;
  const smooth = easeInOutCubic((Math.sin(loop) + 1) / 2);

  switch (shape) {
    case 'circle': {
      const radius = lerp(260, 320, smooth);
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wave': {
      const amplitude = lerp(40, 80, smooth);
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
        const y =
          CANVAS_HEIGHT -
          amplitude -
          Math.sin((x / CANVAS_WIDTH) * Math.PI * 2 + loop) * amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diagonal': {
      const offset = lerp(-120, 120, smooth);
      ctx.translate(offset, -offset);
      ctx.rotate(-12 * (Math.PI / 180));
      ctx.fillRect(-CANVAS_WIDTH, 0, CANVAS_WIDTH * 3, 180);
      ctx.globalAlpha = 0.12;
      ctx.fillRect(-CANVAS_WIDTH, 240, CANVAS_WIDTH * 3, 180);
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  callout: string,
  accent: string,
  elapsed: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  const wave = Math.sin((elapsed % 4) * Math.PI * 0.5);
  const shiftX = wave * 8;
  ctx.translate(shiftX, 0);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '60px "Urbanist", sans-serif';
  ctx.fillText(title.toUpperCase(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.font = '28px "Urbanist", sans-serif';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);

  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const glow = 10 + Math.sin((elapsed % 3) * Math.PI * 2) * 6;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;

  ctx.fillStyle = '#fff';
  ctx.font = '60px "Urbanist", sans-serif';
  ctx.fillText(title.toUpperCase(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 44);

  ctx.font = '28px "Urbanist", sans-serif';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 14);

  ctx.fillStyle = accent;
  ctx.shadowBlur = 0;
  ctx.fillRect(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 76, 240, 54);

  ctx.fillStyle = '#060606';
  ctx.font = '22px "Urbanist", sans-serif';
  ctx.fillText(callout, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 103);

  ctx.restore();
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [title, setTitle] = useState('Launch Day');
  const [subtitle, setSubtitle] = useState('Experience the reveal in 4K');
  const [callout, setCallout] = useState('Watch Trailer');
  const [duration, setDuration] = useState(6);
  const [fps, setFps] = useState(30);
  const [accentColor, setAccentColor] = useState('#ffffff');
  const [paletteId, setPaletteId] = useState<GradientId>('sunset');
  const [shapeStyle, setShapeStyle] = useState<ShapeStyle>('circle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const palette = useMemo(
    () => gradients.find((item) => item.id === paletteId) ?? gradients[0],
    [paletteId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let animationFrame: number;
    const start = performance.now();

    const loop = (timestamp: number) => {
      const elapsed = (timestamp - start) / 1000;
      drawBackdrop(ctx, palette, elapsed, shapeStyle);
      drawText(ctx, title, subtitle, callout, accentColor, elapsed);
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [palette, title, subtitle, callout, accentColor, shapeStyle]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleRender = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isRendering) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas unavailable. Reload and try again.');
      return;
    }

    const stream = canvas.captureStream(fps);
    if (!stream) {
      setError('Unable to capture canvas stream.');
      return;
    }

    const mimeType = (() => {
      if ('MediaRecorder' in window) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          return 'video/webm;codecs=vp9';
        }
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          return 'video/webm;codecs=vp8';
        }
      }
      return 'video/webm';
    })();

    const recordedChunks: Blob[] = [];
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    } catch (err) {
      setError('MediaRecorder not supported in this browser.');
      return;
    }

    setError(null);
    setVideoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setIsRendering(true);
    setProgress(0);

    recorder.ondataavailable = (eventData) => {
      if (eventData.data && eventData.data.size > 0) {
        recordedChunks.push(eventData.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRendering(false);
      setProgress(100);
    };

    recorder.start();

    const startTime = performance.now();
    const targetDuration = duration * 1000;

    const progressInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / targetDuration) * 100);
      setProgress(pct);
      if (elapsed >= targetDuration) {
        window.clearInterval(progressInterval);
      }
    }, 100);

    window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      window.clearInterval(progressInterval);
    }, targetDuration + 200);
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>Agentic Video Studio</h1>
        <p className="tagline">Design looping hero videos directly in your browser.</p>
        <form className="form" onSubmit={handleRender}>
          <div className="group">
            <label htmlFor="title">Headline</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={48}
              required
            />
          </div>
          <div className="group">
            <label htmlFor="subtitle">Subtitle</label>
            <input
              id="subtitle"
              type="text"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              maxLength={70}
              required
            />
          </div>
          <div className="group">
            <label htmlFor="callout">Call-to-action</label>
            <input
              id="callout"
              type="text"
              value={callout}
              onChange={(event) => setCallout(event.target.value)}
              maxLength={28}
              required
            />
          </div>
          <div className="compact">
            <div className="group">
              <label htmlFor="duration">Duration (seconds)</label>
              <input
                id="duration"
                type="range"
                min={3}
                max={12}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
              <span className="meta">{duration}s loop</span>
            </div>
            <div className="group">
              <label htmlFor="fps">Frame rate</label>
              <select
                id="fps"
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
              >
                {[24, 30, 45, 60].map((value) => (
                  <option key={value} value={value}>
                    {value} fps
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="compact">
            <div className="group">
              <label htmlFor="palette">Palette</label>
              <select
                id="palette"
                value={paletteId}
                onChange={(event) => setPaletteId(event.target.value as GradientId)}
              >
                {gradients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="group">
              <label htmlFor="accent">Accent color</label>
              <input
                id="accent"
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
              />
            </div>
            <div className="group">
              <label htmlFor="shape">Motion style</label>
              <select
                id="shape"
                value={shapeStyle}
                onChange={(event) => setShapeStyle(event.target.value as ShapeStyle)}
              >
                {shapeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={isRendering}>
            {isRendering ? 'Rendering…' : 'Render video'}
          </button>
        </form>
        {isRendering && (
          <div className="progress">
            <div className="track">
              <div className="indicator" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress.toFixed(0)}%</span>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {videoUrl && (
          <div className="download">
            <video src={videoUrl} controls loop width={320} />
            <a href={videoUrl} download="agentic-video.webm">
              Download WebM
            </a>
            <button type="button" onClick={() => handleRender()}>
              Re-render
            </button>
          </div>
        )}
      </section>
      <section className="preview">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="canvas"
        />
        <div className="hint">
          <span>Live preview updates as you tweak settings.</span>
          <span>Rendering exports a WebM video you can download instantly.</span>
        </div>
      </section>
      <style jsx>{`
        .page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 32px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
        }
        .panel {
          background: rgba(12, 12, 12, 0.68);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        h1 {
          font-size: 32px;
          margin: 0;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .tagline {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 16px;
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.75);
        }
        input[type='text'],
        select {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 16px;
        }
        input[type='text']:focus,
        select:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
        }
        input[type='color'] {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: none;
          padding: 0;
        }
        input[type='range'] {
          width: 100%;
        }
        .meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
        .compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        button[type='submit'] {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border: none;
          color: #0b0b0b;
          font-weight: 700;
          padding: 14px 18px;
          border-radius: 14px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        button[type='submit']:disabled {
          opacity: 0.6;
          cursor: progress;
        }
        .progress {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }
        .track {
          flex: 1;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .indicator {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #a855f7);
        }
        .error {
          color: #fca5a5;
          margin: 0;
        }
        .download {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .download a,
        .download button {
          text-align: center;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          color: #fff;
          border: 1px solid transparent;
          cursor: pointer;
        }
        .download button {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }
        .preview {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          justify-content: center;
        }
        .canvas {
          width: 100%;
          max-width: 560px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
          background: #000;
        }
        .hint {
          background: rgba(12, 12, 12, 0.6);
          border-radius: 16px;
          padding: 18px 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.68);
          max-width: 480px;
          text-align: center;
        }
        @media (max-width: 1080px) {
          .page {
            grid-template-columns: 1fr;
            padding: 32px 18px 72px;
          }
          .preview {
            order: -1;
          }
        }
      `}</style>
    </main>
  );
}
