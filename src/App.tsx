import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Briefing } from './components/Briefing';
import { CommanderPick } from './components/CommanderPick';
import { GameScreen } from './components/GameScreen';
import { TitleScreen } from './components/TitleScreen';
import { fetchLiveSun } from './lib/liveSun';
import { setMood, setMusic } from './lib/sound';
import { useGame } from './store/game';

export function App() {
  const screen = useGame((s) => s.screen);
  const setSun = useGame((s) => s.setSun);
  useEffect(() => {
    void fetchLiveSun().then(setSun);
  }, [setSun]);
  // Outside a mission, the title theme plays (from the first tap: browsers wait for one).
  useEffect(() => {
    if (screen !== 'game') { setMusic('title'); setMood('off'); }
  }, [screen]);
  return (
    <MotionConfig reducedMotion="user">
      {screen === 'title' && <TitleScreen />}
      {screen === 'pick' && <CommanderPick />}
      {screen === 'brief' && <Briefing />}
      {screen === 'game' && <GameScreen />}
    </MotionConfig>
  );
}
