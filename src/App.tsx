import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import VerifyOTP from './pages/VerifyOTP';
import Feed from './pages/Feed';
import ReportIssue from './pages/ReportIssue';
import Profile from './pages/Profile';
import TrackStatus from './pages/TrackStatus';

export default function App() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {!session ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <Route element={<Layout />}>
          <Route path="/home" element={<Feed />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/track" element={<TrackStatus />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      )}
    </Routes>
  );
}
