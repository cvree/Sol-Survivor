import { useEffect } from 'react';

/** Send the player's settings to the sound, the page and the running mission. */
function applySettings(s: Settings) {
  setVolumes({ master: s.master, music: s.music, effects: s.effects, ambience: s.ambience, soft: s.softMusic });
  applyLook(s);
  const { game } = useGame.getState();
  if (game && game.autoBuild !== s.autoBuilders) useGame.setState({ game: { ...game, autoBuild: s.autoBuilders } });
}
applySettings(useSettings.getState());
useSettings.subscribe(applySettings);
import { MotionConfig } from 'motion/react';
import { Briefing } from './components/Briefing';
import { CommanderPick } from './components/CommanderPick';
import { GameScreen } from './components/GameScreen';
import { TitleScreen } from './components/TitleScreen';
import { fetchLiveSun } from './lib/liveSun';
import { setMood, setMusic, setVolumes } from './lib/sound';
import { applyLook, useSettings, type Settings } from './lib/settings';
import { SettingsHost } from './components/Settings';
import { Oops } from './components/Oops';
import { useGame } from './store/game';

export function App() {
  const screen = useGame((s) => s.screen);
  const setSun = useGame((s) => s.setSun);
  const calm = useSettings((s) => s.motion === 'calm');
  useEffect(() => {
    void fetchLiveSun().then(setSun);
  }, [setSun]);
  // Outside a mission, the title theme plays (from the first tap: browsers wait for one).
  useEffect(() => {
    if (screen !== 'game') { setMusic('title'); setMood('off'); }
  }, [screen]);
  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'user'}>
      <Oops>
        {screen === 'title' && <TitleScreen />}
        {screen === 'pick' && <CommanderPick />}
        {screen === 'brief' && <Briefing />}
        {screen === 'game' && <GameScreen />}
        <SettingsHost />
      </Oops>
    </MotionConfig>
  );
}
