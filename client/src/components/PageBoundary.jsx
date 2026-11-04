import { Component } from 'react';
import { EmptyState } from './ui';
import { useI18n } from '../i18n';

/*
 * A page-level error boundary: the one thing that keeps a single screen's
 * failure from looking like a full application restart.
 *
 * Without it, React's own behaviour on an uncaught render error is to unmount
 * the ENTIRE tree — the shell, the rail, the header, the session and every
 * unsaved field on screen — and leave a blank document that only a reload can
 * bring back. That is the "the page suddenly refreshed / went white and lost
 * everything" symptom.
 *
 * Mounted around the routed content (and around the public menu), it contains
 * the failure to the page that threw: the shell, theme, language, sidebar state
 * and session survive, the message is localised, and "Try again" re-renders the
 * same page without touching the rest of the app. Navigating to another section
 * clears it automatically, so a broken screen is never a trap.
 *
 * It deliberately contains no data logic: what a page fetches, saves or polls is
 * untouched. This only decides what is drawn when drawing it threw.
 */
class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // One line for the developer, nothing thrown onwards: the application
    // around this page stays mounted exactly as it was.
    // eslint-disable-next-line no-console
    console.error('[page] render failed', error, info?.componentStack || '');
  }

  componentDidUpdate(previous) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.reset();
  }

  reset() {
    this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        icon="alert"
        title={this.props.title}
        hint={this.props.hint}
        action={(
          <button type="button" className="btn btn--sm" onClick={this.reset}>
            {this.props.retry}
          </button>
        )}
      />
    );
  }
}

/* The thin functional wrapper that supplies the labels. Resolved on every
   render of the surrounding page, so a language switch also translates a
   message that is already on screen. */
export default function PageBoundary({ children, resetKey }) {
  const { t } = useI18n();
  return (
    <Boundary
      resetKey={resetKey}
      title={t('page_error_title')}
      hint={t('page_error_hint')}
      retry={t('action_retry')}
    >
      {children}
    </Boundary>
  );
}
