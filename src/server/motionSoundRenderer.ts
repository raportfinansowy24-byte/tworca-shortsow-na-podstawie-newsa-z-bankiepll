import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type MotionPreset = 'hero-zoom' | 'data-rise' | 'impact-drop' | 'split-reveal' | 'parallax' | 'takeaway-push' | 'end-card';
export type SoundPreset = 'hook-hit' | 'data-tick' | 'positive-rise' | 'negative-impact' | 'contrast-sweep' | 'soft-pulse' | 'cta-chime';

export interface MotionSoundSpec {
  motion: MotionPreset;
  sound: SoundPreset;
  transition: 'hard-cut' | 'whip-pan' | 'match-cut' | 'smash-cut' | 'split' | 'soft-cut' | 'fade-through' | 'end-card';
}

const SOUND_FILTERS: Record<SoundPreset, string> = {
  'hook-hit': 'sine=frequency=92:duration=0.18,afade=t=out:st=0.08:d=0.10,volume=0.28',
  'data-tick': 'sine=frequency=880:duration=0.08,afade=t=out:st=0.03:d=0.05,volume=0.16',
  'positive-rise': 'sine=frequency=440:duration=0.28,asetrate=44100*1.35,aresample=44100,afade=t=out:st=0.16:d=0.12,volume=0.18',
  'negative-impact': 'sine=frequency=72:duration=0.32,afade=t=out:st=0.14:d=0.18,volume=0.24',
  'contrast-sweep': 'anoisesrc=color=pink:duration=0.24:amplitude=0.12,lowpass=f=1600,afade=t=out:st=0.10:d=0.14',
  'soft-pulse': 'sine=frequency=220:duration=0.20,afade=t=out:st=0.07:d=0.13,volume=0.10',
  'cta-chime': 'sine=frequency=660:duration=0.16,afade=t=out:st=0.06:d=0.10,volume=0.14'
};

export function motionSoundSpecForBeat(beat: string): MotionSoundSpec {
  switch (beat) {
    case 'hook': return { motion: 'hero-zoom', sound: 'hook-hit', transition: 'hard-cut' };
    case 'market_snapshot': return { motion: 'data-rise', sound: 'data-tick', transition: 'whip-pan' };
    case 'leader': return { motion: 'data-rise', sound: 'positive-rise', transition: 'match-cut' };
    case 'loser': return { motion: 'impact-drop', sound: 'negative-impact', transition: 'smash-cut' };
    case 'contrast': return { motion: 'split-reveal', sound: 'contrast-sweep', transition: 'split' };
    case 'meaning': return { motion: 'parallax', sound: 'soft-pulse', transition: 'soft-cut' };
    case 'takeaway': return { motion: 'takeaway-push', sound: 'soft-pulse', transition: 'fade-through' };
    case 'cta': return { motion: 'end-card', sound: 'cta-chime', transition: 'end-card' };
    default: return { motion: 'parallax', sound: 'soft-pulse', transition: 'soft-cut' };
  }
}

export function buildMotionFilter(spec: MotionSoundSpec, width: number, height: number, fps: number, duration: number): string {
  const fadeIn = `fade=t=in:st=0:d=0.12`;
  const fadeOutStart = Math.max(0.12, duration - 0.16).toFixed(2);
  const fadeOut = `fade=t=out:st=${fadeOutStart}:d=0.16`;
  const base = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  const zoom = `zoompan=z='min(zoom+0.0018,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
  const push = `zoompan=z='min(zoom+0.0028,1.13)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
  const drop = `zoompan=z='if(lte(on,8),1.12,1.12-(on-8)*0.001)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
  const motion = spec.motion === 'hero-zoom' ? zoom
    : spec.motion === 'takeaway-push' ? push
      : spec.motion === 'impact-drop' ? drop
        : zoom;
  const transition = spec.transition === 'fade-through' || spec.transition === 'end-card' ? `${fadeIn},${fadeOut}` : `${fadeIn},${fadeOut}`;
  return `${base},${motion},${transition}`;
}

export async function generateSceneSoundEffect(outputPath: string, preset: SoundPreset, duration = 2.5): Promise<void> {
  const filter = SOUND_FILTERS[preset];
  const safeDuration = Math.max(0.5, Math.min(duration, 10));
  await execFileAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', filter, '-t', safeDuration.toFixed(2), '-ar', '44100', '-ac', '2', '-c:a', 'aac', outputPath], { maxBuffer: 2 * 1024 * 1024 });
}

export function buildAudioMixFilter(hasVoice: boolean, hasSfx: boolean, voiceVolume = 1, sfxVolume = 0.38): { filter: string; map: string } {
  if (hasVoice && hasSfx) return { filter: `[1:a]volume=${voiceVolume}[voice];[2:a]volume=${sfxVolume}[sfx];[voice][sfx]amix=inputs=2:duration=first:dropout_transition=0[a]`, map: '[a]' };
  if (hasVoice) return { filter: `[1:a]volume=${voiceVolume}[a]`, map: '[a]' };
  if (hasSfx) return { filter: `[1:a]volume=${sfxVolume}[a]`, map: '[a]' };
  return { filter: '', map: '1:a?' };
}
