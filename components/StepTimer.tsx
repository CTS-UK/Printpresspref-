"use client";

import { useEffect, useRef, useState } from "react";
import { stepKindLabel } from "@/lib/labels";
import { formatDuration } from "@/lib/units";
import type { Step } from "@/lib/types";

function beep() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 784;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
  window.setTimeout(() => void context.close(), 400);
}

export function StepTimer({ steps }: { steps: Step[] }) {
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const beeped = useRef(false);
  const step = steps[index];

  useEffect(() => {
    if (!endsAt) return;
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(tick);
        setEndsAt(null);
        setFinished(true);
        if (!beeped.current) {
          beeped.current = true;
          beep();
        }
      }
    }, 200);
    return () => window.clearInterval(tick);
  }, [endsAt]);

  if (!step) return null;

  function go(next: number) {
    setIndex(next);
    setEndsAt(null);
    setRemaining(null);
    setFinished(false);
    beeped.current = false;
  }

  const running = endsAt != null;
  const shown = remaining ?? step.seconds;

  return (
    <div>
      <ol className="steps">
        {steps.map((item, itemIndex) => (
          <li className={itemIndex === index ? "step active" : "step"} key={`${item.title}-${itemIndex}`}>
            <button
              type="button"
              onClick={() => go(itemIndex)}
              style={{ all: "unset", cursor: "pointer", width: "100%" }}
            >
              <b>
                {itemIndex + 1}. {item.title}
                <span className="muted"> · {stepKindLabel(item.kind)}{item.seconds ? ` · ${formatDuration(item.seconds)}` : ""}</span>
              </b>
              <span>{item.detail}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="card" style={{ marginTop: "0.8rem" }}>
        <p className="muted">Step {index + 1} of {steps.length}</p>
        <h2 style={{ marginTop: "0.2rem" }}>{step.title}</h2>
        <p>{step.detail}</p>
        {step.seconds ? (
          <>
            <div className="timer-face" aria-live="polite">{shown == null ? formatDuration(step.seconds) : formatDuration(shown)}</div>
            <p className="muted">{step.seconds} seconds</p>
          </>
        ) : (
          <p className="muted">No timer for this step.</p>
        )}
        {finished ? <p className="banner good">Time.</p> : null}
        <div className="timer-actions">
          {step.seconds && !running ? (
            <button className="primary" type="button" onClick={() => {
              beeped.current = false;
              setFinished(false);
              const startFrom = finished || remaining == null ? step.seconds! : remaining;
              setRemaining(startFrom);
              setEndsAt(Date.now() + startFrom * 1000);
            }}>
              {remaining != null && !finished ? "Resume" : "Start timer"}
            </button>
          ) : null}
          {running ? (
            <button className="secondary" type="button" onClick={() => {
              if (endsAt) setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
              setEndsAt(null);
            }}>
              Pause
            </button>
          ) : null}
          {index < steps.length - 1 ? (
            <button className="secondary" type="button" onClick={() => go(index + 1)}>Next step</button>
          ) : null}
          <button className="secondary" type="button" onClick={() => window.print()}>Print card</button>
        </div>
      </div>
    </div>
  );
}
