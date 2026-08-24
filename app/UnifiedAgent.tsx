'use client';

import { useEffect, useRef } from 'react';
import { UnifiedAgentEngine } from './unified-agent-engine';

export function UnifiedAgent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new UnifiedAgentEngine(canvas);
    return () => engine.destroy();
  }, []);

  return (
    <main className="unified-agent-page">
      <section className="unified-agent-stage" aria-label="Unified magnetic agent">
        <canvas
          ref={canvasRef}
          className="unified-agent-canvas"
          role="img"
          aria-label="A spherical particle agent with rotating blinking eyes that morphs into task forms"
        />
      </section>

      <a className="unified-agent-studies" href="/studies" aria-label="Open particle studies">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
    </main>
  );
}
