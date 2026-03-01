/**
 * Layout -- sidebar navigation + main content area.
 *
 * The sidebar shows the RajutechieStreamKit logo, navigation links, connection
 * status, and a sign-out button.
 */

import React, { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useRajutechieStreamKit } from '@rajutechie-streamkit/react-sdk';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { isConnected, connectionState } = useRajutechieStreamKit();

  return (
    <div className="app-layout">
      {/* ---- Navigation sidebar ---- */}
      <nav className="nav-sidebar">
        <div className="nav-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--accent)" />
            <path d="M12 14h16v3H12zm0 5h12v3H12zm0 5h14v3H12z" fill="#fff" />
          </svg>
          <span className="nav-brand-text">RajutechieStreamKit</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/chat" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <ChatIcon />
              <span>Chat</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/call" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <PhoneIcon />
              <span>Calls</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/meeting" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <MeetingIcon />
              <span>Meetings</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/stream" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <StreamIcon />
              <span>Streams</span>
            </NavLink>
          </li>
        </ul>

        <div className="nav-footer">
          <div className="connection-indicator">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            <span className="connection-label">
              {isConnected ? 'Connected' : connectionState}
            </span>
          </div>

          {user && (
            <div className="nav-user">
              <UserAvatar name={user.displayName} size={32} />
              <div className="nav-user-info">
                <span className="nav-user-name">{user.displayName}</span>
                <button className="link-btn nav-logout" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ---- Main content area ---- */}
      <div className="app-content">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function MeetingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function StreamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
