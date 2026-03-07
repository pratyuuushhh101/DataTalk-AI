import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import DataLedgerPage from './pages/DataLedgerPage';
import QuickReportsPage from './pages/QuickReportsPage';
import ProfitAnalysisPage from './pages/ProfitAnalysisPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LandingPage from './pages/LandingPage';
import Layout from './components/Layout';

// Shared page transition configuration
const pageTransition = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
  transition: { duration: 0.3, ease: 'easeInOut' }
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing Route */}
        <Route path="/" element={
          <motion.div {...pageTransition} className="h-full">
            <LandingPage />
          </motion.div>
        } />

        {/* Auth Routes */}
        <Route path="/login" element={
          <motion.div {...pageTransition} className="h-full">
            <Login />
          </motion.div>
        } />
        <Route path="/signup" element={
          <motion.div {...pageTransition} className="h-full">
            <Signup />
          </motion.div>
        } />

        {/* Multi-Page Routes wrapped in Layout */}
        <Route path="/datatalk" element={
          <motion.div {...pageTransition} className="h-full">
            <Layout>
              <Dashboard />
            </Layout>
          </motion.div>
        } />

        <Route path="/ledger" element={
          <motion.div {...pageTransition} className="h-full">
            <Layout>
              <DataLedgerPage />
            </Layout>
          </motion.div>
        } />

        <Route path="/reports" element={
          <motion.div {...pageTransition} className="h-full">
            <Layout>
              <QuickReportsPage />
            </Layout>
          </motion.div>
        } />

        <Route path="/profit" element={
          <motion.div {...pageTransition} className="h-full">
            <Layout>
              <ProfitAnalysisPage />
            </Layout>
          </motion.div>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/datatalk" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
