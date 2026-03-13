import { useState, useRef, useCallback, useEffect } from 'react';
import type { TrajectoryFrame } from '../types/trajectory';

export interface PlaybackState {
  frameIndex: number;
  isPlaying: boolean;
  speed: number;
  loop: boolean;
  totalFrames: number;
  currentTime: number;
  totalTime: number;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (frameIndex: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
}

export function useTrajectoryPlayback(
  frames: TrajectoryFrame[],
  sampleRate: number,
): [PlaybackState, PlaybackControls, React.RefObject<number>] {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [loop, setLoopState] = useState(true);

  const frameRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const loopRef = useRef(true);
  const renderTickRef = useRef(0);

  const totalFrames = frames.length;
  const totalTime = totalFrames > 0 ? totalFrames / sampleRate : 0;

  // Sync refs with state
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  // Reset on new data
  useEffect(() => {
    frameRef.current = 0;
    setFrameIndex(0);
    lastTimeRef.current = null;
  }, [frames]);

  // Use a ref for the tick function to avoid stale closure issues
  const tickFnRef = useRef<(timestamp: number) => void>(null!);
  tickFnRef.current = (timestamp: number) => {
    if (!playingRef.current) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current !== null) {
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      const advance = deltaSec * sampleRate * speedRef.current;
      frameRef.current += advance;

      if (frameRef.current >= totalFrames - 1) {
        if (loopRef.current) {
          frameRef.current = 0;
        } else {
          frameRef.current = totalFrames - 1;
          playingRef.current = false;
          setIsPlaying(false);
        }
      }

      // Sync to React state every ~6 ticks for scrubber display
      renderTickRef.current++;
      if (renderTickRef.current % 6 === 0) {
        setFrameIndex(Math.floor(frameRef.current));
      }
    }

    lastTimeRef.current = timestamp;
    rafRef.current = requestAnimationFrame((ts) => tickFnRef.current(ts));
  };

  useEffect(() => {
    if (isPlaying && totalFrames > 0) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame((ts) => tickFnRef.current(ts));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, totalFrames]);

  const play = useCallback(() => {
    if (totalFrames === 0) return;
    if (frameRef.current >= totalFrames - 1) {
      frameRef.current = 0;
      setFrameIndex(0);
    }
    setIsPlaying(true);
  }, [totalFrames]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause(); else play();
  }, [play, pause]);

  const seek = useCallback((idx: number) => {
    if (totalFrames === 0) return;
    const clamped = Math.max(0, Math.min(idx, totalFrames - 1));
    frameRef.current = clamped;
    setFrameIndex(clamped);
    lastTimeRef.current = null;
  }, [totalFrames]);

  const setSpeed = useCallback((s: number) => setSpeedState(s), []);
  const setLoop = useCallback((l: boolean) => setLoopState(l), []);

  const state: PlaybackState = {
    frameIndex,
    isPlaying,
    speed,
    loop,
    totalFrames,
    currentTime: totalFrames > 0 ? frameIndex / sampleRate : 0,
    totalTime,
  };

  const controls: PlaybackControls = {
    play, pause, togglePlay, seek, setSpeed, setLoop,
  };

  // Expose frameRef so 3D scene can read the continuous frame index
  return [state, controls, frameRef as React.RefObject<number>];
}
