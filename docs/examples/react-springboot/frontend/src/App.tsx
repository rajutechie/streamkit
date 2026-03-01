/**
 * Root application component.
 *
 * - Unauthenticated users see LoginPage.
 * - Authenticated users are wrapped in `<RajutechieStreamKitProvider>` so all child
 *   components can use the SDK hooks, and rendered inside a `<Layout>`.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RajutechieStreamKitProvider } from '@rajutechie-streamkit/react-sdk';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import CallPage from './pages/CallPage';
import MeetingPage from './pages/MeetingPage';
import StreamPage from './pages/StreamPage';

const RAJUTECHIE_STREAMKIT_API_KEY = import.meta.env.VITE_RAJUTECHIE_RAJUTECHIE_STREAMKIT_API_KEY ?? 'sk_example_key';

function AuthenticatedApp() {
  const { rajutechieStreamKitToken } = useAuth();

  return (
    <RajutechieStreamKitProvider apiKey={RAJUTECHIE_STREAMKIT_API_KEY} userToken={rajutechieStreamKitToken ?? undefined}>
      <Layout>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:channelId" element={<ChatPage />} />
          <Route path="/call" element={<CallPage />} />
          <Route path="/call/:callId" element={<CallPage />} />
          <Route path="/meeting" element={<MeetingPage />} />
          <Route path="/stream" element={<StreamPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Layout>
    </RajutechieStreamKitProvider>
  );
}

export default function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? <AuthenticatedApp /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
