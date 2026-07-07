import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from './components/Toast.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { initPushNotifications } from './lib/push.js';
import { AuthScreen } from './screens/AuthScreen.jsx';
import { SequenceLogo } from './components/SequenceLogo.jsx';
import { TabShell } from './components/TabShell.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { FriendsScreen } from './screens/FriendsScreen.jsx';
import { FriendRequestsScreen } from './screens/FriendRequestsScreen.jsx';
import { FriendProfileScreen } from './screens/FriendProfileScreen.jsx';
import { JoinFriendScreen } from './screens/JoinFriendScreen.jsx';
import { ActivityFeedScreen } from './screens/ActivityFeedScreen.jsx';
import { LedgerScreen } from './screens/LedgerScreen.jsx';
import { SessionDetailScreen } from './screens/SessionDetailScreen.jsx';
import { SettleUpScreen } from './screens/SettleUpScreen.jsx';
import { ProfileScreen } from './screens/ProfileScreen.jsx';
import { ScheduleGameScreen } from './screens/ScheduleGameScreen.jsx';
import { UpcomingGamesScreen } from './screens/UpcomingGamesScreen.jsx';
import { HandHistoryScreen } from './screens/HandHistoryScreen.jsx';
import { HandReplayScreen } from './screens/HandReplayScreen.jsx';
import { CreateGameScreen } from './screens/CreateGameScreen.jsx';
import { JoinGameScreen } from './screens/JoinGameScreen.jsx';
import { LobbyScreen } from './screens/LobbyScreen.jsx';
import { TableScreen } from './screens/TableScreen.jsx';
import { PracticeSetupScreen } from './screens/PracticeSetupScreen.jsx';
import { PracticeTableScreen } from './screens/PracticeTableScreen.jsx';

function routeForNotification(data) {
  switch (data?.type) {
    case 'friend_request':
      return '/friends/requests';
    case 'friend_accepted':
      return '/friends';
    case 'ledger_settled':
      return '/ledger';
    case 'schedule_invite':
      return '/schedule/upcoming';
    case 'achievement':
      return '/profile';
    case 'turn_reminder':
      return data.roomCode ? `/table/${data.roomCode}` : '/';
    default:
      return null;
  }
}

function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.status !== 'authed') return;
    initPushNotifications({
      onNotificationTap: (data) => {
        const path = routeForNotification(data);
        if (path) navigate(path);
      },
    });
  }, [auth.status, navigate]);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <SequenceLogo size="sm" />
      </div>
    );
  }

  if (auth.status === 'anon') {
    return <AuthScreen />;
  }

  return (
    <Routes>
      {/* Tab-root screens: persistent bottom tab bar wraps these five. */}
      <Route element={<TabShell />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/friends" element={<FriendsScreen />} />
        <Route path="/ledger" element={<LedgerScreen />} />
        <Route path="/practice" element={<PracticeSetupScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>

      {/* Pushed sub-flows: full screen, no tab bar. */}
      <Route path="/friends/requests" element={<FriendRequestsScreen />} />
      <Route path="/friends/activity" element={<ActivityFeedScreen />} />
      <Route path="/friends/:friendId" element={<FriendProfileScreen />} />
      <Route path="/join-friend" element={<JoinFriendScreen />} />
      <Route path="/ledger/session/:sessionId" element={<SessionDetailScreen />} />
      <Route path="/ledger/settle" element={<SettleUpScreen />} />
      <Route path="/schedule" element={<ScheduleGameScreen />} />
      <Route path="/schedule/upcoming" element={<UpcomingGamesScreen />} />
      <Route path="/hands" element={<HandHistoryScreen />} />
      <Route path="/hands/:handId" element={<HandReplayScreen />} />
      <Route path="/create" element={<CreateGameScreen />} />
      <Route path="/join" element={<JoinGameScreen />} />
      <Route path="/lobby/:code" element={<LobbyScreen />} />
      <Route path="/table/:code" element={<TableScreen />} />
      <Route path="/practice/play" element={<PracticeTableScreen />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="fixed inset-0 bg-black">
      <div className="app-frame">
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </ToastProvider>
        </MotionConfig>
      </div>
    </div>
  );
}
