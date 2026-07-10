import { useLocation, useNavigate } from 'react-router-dom';
import { TableView } from '../components/TableView.jsx';
import { HandStrengthMeter } from '../components/HandStrengthMeter.jsx';
import { SuggestedActionBadge } from '../components/SuggestedActionBadge.jsx';
import { usePracticeTable } from '../hooks/usePracticeTable.js';
import { formatMoney } from '../lib/money.js';

const DEFAULTS = { difficulty: 'medium', opponentCount: 3, showHandStrength: true, suggestActionEnabled: true };

export function PracticeTableScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = { ...DEFAULTS, ...(location.state || {}) };

  const { state, nextHandAt, hint, sendAction } = usePracticeTable({
    difficulty: settings.difficulty,
    opponentCount: settings.opponentCount,
  });

  const hintSlot = (
    <div className="flex flex-col items-center gap-2">
      {settings.showHandStrength && <HandStrengthMeter equity={hint?.equity ?? null} />}
      {settings.suggestActionEnabled && <SuggestedActionBadge suggestion={hint?.suggestion ?? null} />}
    </div>
  );

  return (
    <TableView
      state={state}
      myPlayerId="you"
      headerTitle="PRACTICE"
      headerSubtitle={`VS ${state.maxSeats - 1} AI · ${formatMoney(state.blinds.small)}/${formatMoney(state.blinds.big)}`}
      onFold={() => sendAction('fold')}
      onCheck={() => sendAction('check')}
      onCall={() => sendAction('call')}
      onRaise={(amount) => sendAction('raise', amount)}
      onLeave={() => navigate('/practice')}
      connectionStatus="open"
      nextHandAt={nextHandAt}
      hintSlot={hintSlot}
      showEquityToggle={false}
    />
  );
}
