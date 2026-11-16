import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useGame } from '../store/game';
import { Marv } from './art';

/**
 * A safety net. If something on screen ever breaks, the player gets M.A.R.V. and a
 * "Keep playing" button instead of an empty purple page. The mission itself is kept
 * (it lives in the store), the clock stops, and the error is shown small at the bottom
 * so a grown-up can send a screenshot of it.
 */
const CRASH_KEY = 'sol-survivor:last-crash';

/** Note a problem: in the console, and on this device for the next bug report. */
export function noteCrash(error: unknown, where: string) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[Sol Survivor] ${where}:`, error);
  try { localStorage.setItem(CRASH_KEY, JSON.stringify({ when: new Date().toISOString(), where, text, stack: error instanceof Error ? error.stack?.split('\n').slice(0, 6).join('\n') : '' })); } catch { /* fine */ }
}

interface State { error: string | null; tries: number }

export class Oops extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, tries: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    noteCrash(error, `screen${info.componentStack ? info.componentStack.split('\n').slice(0, 3).join(' ') : ''}`);
    // Stop the clock while the screen is broken, so nothing bad happens to the crew meanwhile.
    useGame.setState({ paused: true, panel: null, moment: null });
  }

  private resume = () => {
    useGame.setState({ paused: false });
    this.setState((s) => ({ error: null, tries: s.tries + 1 }));
  };

  private home = () => {
    useGame.getState().quit();
    this.setState({ error: null, tries: 0 });
  };

  render() {
    if (!this.state.error) return <div key={this.state.tries} className="oops-wrap">{this.props.children}</div>;
    const stuck = this.state.tries >= 2;
    return (
      <div className="oops" role="alert">
        <div className="oops-card">
          <Marv mood="alert" size={96} />
          <h2>Oops! My screen got a bit muddled.</h2>
          <p>{stuck ? 'It keeps happening. Let\'s go back to the title and start fresh.' : 'Your mission is safe and the clock is stopped. Tap below to carry on.'}</p>
          <div className="oops-buttons">
            {!stuck && <button className="btn btn-go btn-big" onClick={this.resume} autoFocus>Keep playing</button>}
            <button className={`btn ${stuck ? 'btn-go btn-big' : 'btn-ghost'}`} onClick={this.home}>Title screen</button>
          </div>
          <small className="oops-detail">For grown-ups: {this.state.error}</small>
        </div>
      </div>
    );
  }
}
