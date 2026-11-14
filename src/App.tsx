import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { GameScreen } from './components/GameScreen';
import { PayloadScreen } from './components/PayloadScreen';
import { TitleScreen } from './components/TitleScreen';
import { fetchLiveSun } from './lib/liveSun';
import { useGame } from './store/game';

export function App() {
  const screen = useGame((s) => s.screen);
  const setSun = useGame((s) => s.setSun);
  useEffect(() => {
    void fetchLiveSun().then(setSun);
  }, [setSun]);
  return (
    <MotionConfig reducedMotion="user">
      {screen === 'title' && <TitleScreen />}
      {screen === 'payload' && <PayloadScreen />}
      {screen === 'game' && <GameScreen />}
    </MotionConfig>
  );
}
