"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Check, ChevronDown, Loader2, Mic, MicOff, Pause, Play, Plus, RotateCcw, Save, Trash2,
} from "lucide-react";
import { BottomSheet } from "./ui/BottomSheet";
import { toast } from "./ui/Toast";
import {
  MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, RECORDING_WARN_SECONDS, SILENCE_PEAK, formatDuration, pickRecorderMime,
  type ParsedRecipe, type VoiceResult,
} from "@/lib/voiceRecipe";

type Phase =
  | "idle" | "requesting" | "recording" | "paused" | "denied" | "unsupported"
  | "uploading" | "listening" | "structuring" | "error" | "review" | "saving";

type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

const BARS = 32;
const btnBase = "flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50";
const btnPrimary = `${btnBase} bg-orange-600 text-white shadow-md hover:bg-orange-700`;
const iconBtn = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 bg-white text-stone-800 transition-all active:scale-95 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";
const btnSecondary = `${btnBase} border-2 border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100`;
const input = "min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 focus:border-orange-500 focus:outline-hidden focus:ring-4 focus:ring-orange-500/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function VoiceRecipeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [live, setLive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [draft, setDraft] = useState<ParsedRecipe | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const tick = useRef<number | null>(null);
  const startedAt = useRef(0);
  const accumulated = useRef(0);
  const speech = useRef<SpeechRec | null>(null);
  const finalText = useRef("");
  const xhr = useRef<XMLHttpRequest | null>(null);
  const discardOnStop = useRef(false);
  const phaseTimer = useRef<number | null>(null);
  const peak = useRef(0);
  const meterOk = useRef(false);

  const supported =
    typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined";

  const stopMeters = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (tick.current) clearInterval(tick.current);
    raf.current = tick.current = null;
  }, []);

  const releaseMic = useCallback(() => {
    stopMeters();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    try { speech.current?.abort(); } catch {}
    speech.current = null;
  }, [stopMeters]);

  const reset = useCallback(() => {
    discardOnStop.current = true;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recorder.current = null;
    releaseMic();
    xhr.current?.abort();
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    chunks.current = [];
    blob.current = null;
    setCanRetry(false);
    accumulated.current = 0;
    finalText.current = "";
    setElapsed(0);
    setLevels(Array(BARS).fill(0));
    setLive("");
    setError(null);
    setUploadPct(0);
    setResult(null);
    setDraft(null);
    setShowTranscript(false);
    setPhase(supported ? "idle" : "unsupported");
  }, [releaseMic, supported]);

  useEffect(() => {
    if (open) reset();
    return () => {
      if (!open) return;
      discardOnStop.current = true;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      releaseMic();
      xhr.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open]);

  const currentElapsed = () =>
    accumulated.current + (recorder.current?.state === "recording" ? (performance.now() - startedAt.current) / 1000 : 0);

  const upload = useCallback((audio: Blob) => {
    setError(null);
    setUploadPct(0);
    setPhase("uploading");
    const form = new FormData();
    const ext = audio.type.includes("mp4") || audio.type.includes("aac") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
    form.append("audio", audio, `recipe.${ext}`);
    const req = new XMLHttpRequest();
    xhr.current = req;
    req.open("POST", "/api/import-recipe/voice");
    req.responseType = "json";
    req.upload.onprogress = (e) => e.lengthComputable && setUploadPct(Math.round((e.loaded / e.total) * 100));
    req.upload.onload = () => {
      setPhase("listening");
      // The model transcribes then structures in one call; advance the label so long recordings feel alive.
      phaseTimer.current = window.setTimeout(() => setPhase((p) => (p === "listening" ? "structuring" : p)), Math.min(12000, 3000 + audio.size / 200));
    };
    req.onload = () => {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
      const body = req.response as (VoiceResult & { error?: string }) | null;
      if (req.status === 200 && body?.recipe) {
        setResult(body);
        setDraft(body.recipe);
        setPhase("review");
      } else {
        setError(body?.error ?? (req.status === 401 ? "Please sign in again." : "Something went wrong. Please try again."));
        setPhase("error");
      }
    };
    req.onerror = () => {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
      setError(navigator.onLine ? "Couldn't reach EatPlan. Please try again." : "You're offline. Reconnect and tap Try again — your recording is kept.");
      setPhase("error");
    };
    req.send(form);
  }, []);

  const finishRecording = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return;
    accumulated.current = currentElapsed();
    discardOnStop.current = false;
    rec.stop();
    try { speech.current?.stop(); } catch {}
  }, []);

  const startMeters = useCallback((s: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const draw = (t: number) => {
        raf.current = requestAnimationFrame(draw);
        // Reduced motion: a calm level meter updated a few times a second instead of a live waveform.
        if (t - last < (reducedMotion ? 250 : 50)) return;
        last = t;
        if (recorder.current?.state !== "recording") return;
        analyser.getByteFrequencyData(data);
        meterOk.current = true;
        const step = Math.floor(data.length / BARS) || 1;
        const next = Array.from({ length: BARS }, (_, i) => {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          return Math.min(1, sum / step / 180);
        });
        peak.current = Math.max(peak.current, ...next);
        setLevels(next);
      };
      raf.current = requestAnimationFrame(draw);
    } catch {
      /* meter is decorative */
    }
    tick.current = window.setInterval(() => {
      const t = currentElapsed();
      setElapsed(t);
      if (t >= MAX_RECORDING_SECONDS) finishRecording();
    }, 250);
  }, [reducedMotion, finishRecording]);

  const startSpeechPreview = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) return;
    try {
      const sr = new SR();
      sr.lang = "en-IN";
      sr.continuous = true;
      sr.interimResults = true;
      sr.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText.current += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setLive((finalText.current + interim).slice(-280));
      };
      sr.onerror = () => {};
      sr.onend = () => {
        // Chrome ends recognition after silences; resume while we're still recording.
        if (speech.current === sr && recorder.current?.state === "recording") {
          try { sr.start(); } catch {}
        }
      };
      sr.start();
      speech.current = sr;
    } catch {
      /* preview is optional */
    }
  };

  const start = async () => {
    if (!supported) return setPhase("unsupported");
    setError(null);
    setPhase("requesting");
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setPhase(name === "NotFoundError" || name === "NotReadableError" ? "unsupported" : "denied");
      return;
    }
    stream.current = s;
    const mimeType = pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(s, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
    } catch {
      rec = new MediaRecorder(s);
    }
    chunks.current = [];
    peak.current = 0;
    meterOk.current = false;
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      releaseMic();
      if (discardOnStop.current) return;
      const audio = new Blob(chunks.current, { type: rec.mimeType || mimeType || "audio/webm" });
      blob.current = audio;
      setCanRetry(audio.size <= MAX_AUDIO_BYTES);
      if (meterOk.current && peak.current < SILENCE_PEAK) {
        setError("We didn't pick up any sound. Check that the right microphone is on and not muted, then record again.");
        setPhase("error");
        return;
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        setError("That recording is too large to upload. Please record a shorter version.");
        setPhase("error");
        return;
      }
      upload(audio);
    };
    recorder.current = rec;
    accumulated.current = 0;
    startedAt.current = performance.now();
    rec.start(1000);
    setElapsed(0);
    setLive("");
    finalText.current = "";
    setPhase("recording");
    startMeters(s);
    startSpeechPreview();
  };

  const pause = () => {
    const rec = recorder.current;
    if (rec?.state !== "recording") return;
    accumulated.current = currentElapsed();
    rec.pause();
    try { speech.current?.stop(); } catch {}
    setLevels(Array(BARS).fill(0));
    setPhase("paused");
  };

  const resume = () => {
    const rec = recorder.current;
    if (rec?.state !== "paused") return;
    startedAt.current = performance.now();
    rec.resume();
    try { speech.current?.start(); } catch {}
    setPhase("recording");
  };

  const save = async () => {
    if (!draft) return;
    const recipe = { ...draft, name: draft.name.trim(), ingredients: draft.ingredients.filter((i) => i.name.trim()) };
    if (!recipe.name) return setError("Give your recipe a name.");
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/import-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Couldn't save the recipe.");
      toast(`Saved “${recipe.name}”`);
      onClose();
      router.push(`/dishes/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the recipe.");
      setPhase("review");
    }
  };

  const busy = phase === "uploading" || phase === "listening" || phase === "structuring" || phase === "saving";
  const recordingActive = phase === "recording" || phase === "paused";
  const remaining = MAX_RECORDING_SECONDS - elapsed;

  const updateIng = (i: number, patch: Partial<ParsedRecipe["ingredients"][number]>) =>
    setDraft((d) => d && { ...d, ingredients: d.ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const title = phase === "review" || phase === "saving" ? "Check your recipe" : "Speak a recipe";
  const subtitle =
    phase === "review" || phase === "saving"
      ? "Fix anything we misheard, then save."
      : "Say the dish name, ingredients and steps — in English, हिंदी or मराठी.";

  let footer: React.ReactNode = null;
  if (recordingActive) {
    footer = (
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button type="button" onClick={() => { reset(); }} className={iconBtn} aria-label="Restart recording">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={finishRecording} className={btnPrimary}>
          <Check className="h-5 w-5" aria-hidden /> Done
        </button>
        {phase === "recording" ? (
          <button type="button" onClick={pause} className={iconBtn} aria-label="Pause recording">
            <Pause className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={resume} className={iconBtn} aria-label="Resume recording">
            <Play className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>
    );
  } else if (phase === "error") {
    footer = (
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={reset} className={btnSecondary}>
          <Mic className="h-5 w-5" aria-hidden /> Record again
        </button>
        <button type="button" onClick={() => blob.current && upload(blob.current)} disabled={!canRetry} className={btnPrimary}>
          <RotateCcw className="h-5 w-5" aria-hidden /> Try again
        </button>
      </div>
    );
  } else if (phase === "review" || phase === "saving") {
    footer = (
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <button type="button" onClick={reset} disabled={phase === "saving"} className={iconBtn} aria-label="Discard and record again">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={save} disabled={phase === "saving"} className={btnPrimary}>
          {phase === "saving" ? <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
          {phase === "saving" ? "Saving…" : "Save recipe"}
        </button>
      </div>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer} dismissible={!busy && !recordingActive} size="tall">
      {(phase === "idle" || phase === "requesting") && (
        <div className="flex flex-col items-center gap-5 pb-6 pt-10 text-center">
          <button
            type="button"
            data-autofocus
            onClick={start}
            disabled={phase === "requesting"}
            aria-label="Start recording"
            className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-orange-600 text-white shadow-[0_10px_40px_rgb(234_88_12/0.45)] transition-transform hover:bg-orange-700 active:scale-95 disabled:opacity-70"
          >
            <span aria-hidden className="absolute -inset-3 rounded-full bg-orange-500/20 motion-safe:animate-pulse" />
            {phase === "requesting" ? <Loader2 className="relative h-10 w-10 motion-safe:animate-spin" aria-hidden /> : <Mic className="relative h-11 w-11" aria-hidden />}
          </button>
          <p className="text-base font-bold text-stone-900 dark:text-stone-50">{phase === "requesting" ? "Allow microphone access…" : "Tap to start"}</p>
          <ul className="w-full max-w-xs space-y-2 text-left text-sm text-stone-700 dark:text-stone-300">
            <li className="flex gap-2"><span aria-hidden>1.</span> Say the dish name and how many it serves.</li>
            <li className="flex gap-2"><span aria-hidden>2.</span> List ingredients with amounts — “do chammach tel” is fine.</li>
            <li className="flex gap-2"><span aria-hidden>3.</span> Walk through the steps. Pause anytime; up to 10 minutes.</li>
          </ul>
        </div>
      )}

      {recordingActive && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center gap-2 text-sm font-bold" role="status" aria-live="polite">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${phase === "recording" ? "bg-red-600 motion-safe:animate-pulse" : "bg-stone-400"}`} />
            <span className="text-stone-900 dark:text-stone-50">{phase === "recording" ? "Recording" : "Paused"}</span>
          </div>
          <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-50" aria-label={`Elapsed ${formatDuration(elapsed)}`}>
            {formatDuration(elapsed)}
          </p>
          <div className="flex h-20 w-full items-center justify-center gap-[3px]" aria-hidden>
            {levels.map((l, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full ${phase === "recording" ? "bg-orange-600 dark:bg-orange-400" : "bg-stone-300 dark:bg-stone-600"} ${reducedMotion ? "" : "transition-[height] duration-75"}`}
                style={{ height: `${Math.max(6, l * 80)}px` }}
              />
            ))}
          </div>
          {elapsed >= RECORDING_WARN_SECONDS && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {Math.max(0, Math.ceil(remaining))}s left — we&apos;ll stop at 10 minutes.
            </p>
          )}
          {live && (
            <div className="w-full rounded-2xl bg-stone-100 p-3 dark:bg-stone-800">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">Live preview (rough)</p>
              <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">{live}</p>
            </div>
          )}
        </div>
      )}

      {(phase === "uploading" || phase === "listening" || phase === "structuring") && (
        <div className="py-8" role="status" aria-live="polite">
          <ol className="mx-auto max-w-xs space-y-4">
            {([
              ["uploading", `Uploading${phase === "uploading" && uploadPct ? ` ${uploadPct}%` : ""}`],
              ["listening", "Listening to your recipe"],
              ["structuring", "Structuring ingredients & steps"],
            ] as const).map(([key, label], i) => {
              const order = ["uploading", "listening", "structuring"];
              const idx = order.indexOf(phase);
              const state = i < idx ? "done" : i === idx ? "active" : "todo";
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-emerald-600 text-white" : state === "active" ? "bg-orange-600 text-white" : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400"}`}>
                    {state === "done" ? <Check className="h-5 w-5" aria-hidden /> : state === "active" ? <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden /> : <span className="text-sm font-bold">{i + 1}</span>}
                  </span>
                  <span className={`text-base ${state === "todo" ? "text-stone-500 dark:text-stone-400" : "font-bold text-stone-900 dark:text-stone-50"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-300">Usually 5–20 seconds. Your recording isn&apos;t stored.</p>
        </div>
      )}

      {phase === "denied" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"><MicOff className="h-8 w-8" aria-hidden /></span>
          <p className="text-lg font-bold text-stone-900 dark:text-stone-50">Microphone is blocked</p>
          <p className="max-w-xs text-sm text-stone-700 dark:text-stone-300">Allow microphone access for eatplan.app in your browser or phone settings (on iPhone: Settings › Safari › Microphone), then try again.</p>
          <button type="button" onClick={start} className={`${btnPrimary} mt-2`}><RotateCcw className="h-5 w-5" aria-hidden /> Try again</button>
        </div>
      )}

      {phase === "unsupported" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"><MicOff className="h-8 w-8" aria-hidden /></span>
          <p className="text-lg font-bold text-stone-900 dark:text-stone-50">Recording isn&apos;t available here</p>
          <p className="max-w-xs text-sm text-stone-700 dark:text-stone-300">This browser or device can&apos;t record audio. Try Chrome or Safari on your phone, or type the dish name instead.</p>
          <button type="button" onClick={onClose} className={`${btnSecondary} mt-2`}>Type it instead</button>
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="my-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">That didn&apos;t work</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {(phase === "review" || phase === "saving") && draft && (
        <form className="space-y-5 pb-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          <div>
            <label htmlFor="vr-name" className="mb-1 block text-sm font-bold text-stone-800 dark:text-stone-200">Name</label>
            <input id="vr-name" className={`${input} w-full text-lg font-bold`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} enterKeyHint="done" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vr-serves" className="mb-1 block text-sm font-bold text-stone-800 dark:text-stone-200">Serves</label>
              <input id="vr-serves" type="number" inputMode="numeric" min={1} className={`${input} w-full`} value={draft.servings ?? ""} onChange={(e) => setDraft({ ...draft, servings: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <label htmlFor="vr-prep" className="mb-1 block text-sm font-bold text-stone-800 dark:text-stone-200">Time (min)</label>
              <input id="vr-prep" type="number" inputMode="numeric" min={1} className={`${input} w-full`} value={draft.prep_time_minutes ?? ""} onChange={(e) => setDraft({ ...draft, prep_time_minutes: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-bold text-stone-800 dark:text-stone-200">Ingredients ({draft.ingredients.length})</legend>
            <ul className="space-y-2">
              {draft.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input aria-label={`Amount for ingredient ${i + 1}`} className={`${input} w-24 shrink-0`} value={ing.quantity ?? ""} placeholder="Qty" onChange={(e) => updateIng(i, { quantity: e.target.value, amount: undefined, unit: undefined })} />
                  <input aria-label={`Ingredient ${i + 1}`} className={`${input} min-w-0 flex-1`} value={ing.name} onChange={(e) => updateIng(i, { name: e.target.value })} />
                  <button type="button" aria-label={`Remove ${ing.name || "ingredient"}`} onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, j) => j !== i) })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setDraft({ ...draft, ingredients: [...draft.ingredients, { name: "" }] })} className="mt-2 flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-stone-800">
              <Plus className="h-4 w-4" aria-hidden /> Add ingredient
            </button>
          </fieldset>
          <div>
            <label htmlFor="vr-steps" className="mb-1 block text-sm font-bold text-stone-800 dark:text-stone-200">Steps</label>
            <textarea id="vr-steps" rows={8} className={`${input} w-full py-2 leading-relaxed`} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          </div>
          {result?.transcript && (
            <div className="rounded-2xl bg-stone-100 dark:bg-stone-800">
              <button type="button" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript} className="flex min-h-11 w-full items-center justify-between px-4 text-sm font-bold text-stone-800 dark:text-stone-200">
                What we heard
                <ChevronDown className={`h-4 w-4 ${showTranscript ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {showTranscript && <p className="whitespace-pre-wrap px-4 pb-4 text-sm text-stone-700 dark:text-stone-300">{result.transcript}</p>}
            </div>
          )}
        </form>
      )}
      {phase === "recording" && <span className="sr-only">Press Done when you have finished.</span>}
    </BottomSheet>
  );
}
