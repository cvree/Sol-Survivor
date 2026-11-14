import { useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { TitleScreen } from './components/TitleScreen';
import { fetchLiveSun } from './lib/liveSun';
import { useGame } from './store/game';

export function App() {
  const screen = useGame((s) => s.screen);
  const setSun = useGame((s) => s.setSun);
  useEffect(() => {
    void fetchLiveSun().then(setSun);
  }, [setSun]);
  return screen === 'title' ? <TitleScreen /> : <GameScreen />;
}
