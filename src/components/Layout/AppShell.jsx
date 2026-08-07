import React from 'react';
import TopBar from './TopBar';
import BottomTabs from './BottomTabs';

export default function AppShell({ children }) {
  return (
    <>
      <TopBar />
      <main className="app-content">
        {children}
      </main>
      <BottomTabs />
    </>
  );
}
