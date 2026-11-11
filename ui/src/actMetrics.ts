import type { Scene } from './types';

export interface ActMetric {
  id: string;
  name: string;
  scenes: Scene[];
  sceneCount: number;
  wordCount: number;
  percentage: number;
  statusText: string;
}

export interface DynamicMetricsResult {
  totalWords: number;
  totalMins: number;
  acts: ActMetric[];
}

export function computeActMetrics(scenes: Scene[]): DynamicMetricsResult {
  const getSceneWords = (s: Scene): number => {
    if (typeof s.word_count === 'number' && s.word_count >= 0) return s.word_count;
    if (s.text) return s.text.trim().split(/\s+/).filter(Boolean).length;
    return 0;
  };

  const totalWords = scenes.reduce((acc, s) => acc + getSceneWords(s), 0);
  const totalMins = Math.max(1, Math.ceil(totalWords / 240));

  const act1Scenes = scenes.filter((s) => s.t_start < 200);
  const act2Scenes = scenes.filter((s) => s.t_start >= 200 && s.t_start < 400);
  const act3Scenes = scenes.filter((s) => s.t_start >= 400);

  const act1Words = act1Scenes.reduce((sum, s) => sum + getSceneWords(s), 0);
  const act2Words = act2Scenes.reduce((sum, s) => sum + getSceneWords(s), 0);
  const act3Words = act3Scenes.reduce((sum, s) => sum + getSceneWords(s), 0);

  const act1Pct = totalWords > 0 ? Math.round((act1Words / totalWords) * 100) : 0;
  const act2Pct = totalWords > 0 ? Math.round((act2Words / totalWords) * 100) : 0;
  const act3Pct = totalWords > 0 ? Math.round((act3Words / totalWords) * 100) : 0;

  return {
    totalWords,
    totalMins,
    acts: [
      {
        id: 'acto-1',
        name: 'Acto I: Incidente',
        scenes: act1Scenes,
        sceneCount: act1Scenes.length,
        wordCount: act1Words,
        percentage: act1Pct,
        statusText:
          act1Scenes.length > 0
            ? `${act1Scenes.length} ${act1Scenes.length === 1 ? 'beat' : 'beats'} · ${act1Words.toLocaleString()} pal`
            : '0 beats · 0 pal',
      },
      {
        id: 'acto-2',
        name: 'Acto II: Confrontación',
        scenes: act2Scenes,
        sceneCount: act2Scenes.length,
        wordCount: act2Words,
        percentage: act2Pct,
        statusText:
          act2Scenes.length > 0
            ? `${act2Scenes.length} ${act2Scenes.length === 1 ? 'beat' : 'beats'} · ${act2Words.toLocaleString()} pal`
            : '0 beats · 0 pal',
      },
      {
        id: 'acto-3',
        name: 'Acto III: Clímax',
        scenes: act3Scenes,
        sceneCount: act3Scenes.length,
        wordCount: act3Words,
        percentage: act3Pct,
        statusText:
          act3Scenes.length > 0
            ? `${act3Scenes.length} ${act3Scenes.length === 1 ? 'beat' : 'beats'} · ${act3Words.toLocaleString()} pal`
            : '0 beats · 0 pal',
      },
    ],
  };
}
