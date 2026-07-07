import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar.jsx';

// Persistent shell for the 5 tab-root screens (Play/Friends/Ledger/Practice/
// Profile). Pushed sub-flows (Create/Join/Lobby/Table, Friend Profile, Add
// Friend, Settle Up, etc.) render as separate top-level routes outside this
// shell, so the tab bar disappears while in them — matches the design's
// full-screen table/game/detail views.
export function TabShell() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
