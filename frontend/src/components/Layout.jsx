import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './common/Navbar';
import Sidebar from './common/Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
