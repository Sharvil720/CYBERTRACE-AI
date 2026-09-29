import { useEffect, useState } from 'react';
import Login from '@/components/Login';
import Layout, { type ViewName } from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import CaseInvestigation from '@/components/CaseInvestigation';
import MoneyTrail from '@/components/MoneyTrail';
import CashOutPrediction from '@/components/CashOutPrediction';
import GISMap from '@/components/GISMap';
import ExplainableAI from '@/components/ExplainableAI';
import Alerts from '@/components/Alerts';
import Analytics from '@/components/Analytics';
import Reports from '@/components/Reports';
import AuditLog from '@/components/AuditLog';
import DemoRunner from '@/components/DemoRunner';
import { AccessProvider, useAccess } from '@/context/AccessContext';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { record } from '@/services/auditLog';
import { alerts } from '@/data/mockData';
import type { Officer, Prediction } from '@/types';

/** Officers are signed out after this long without pointer or keyboard activity. */
const IDLE_MS = 15 * 60 * 1000;

function App() {
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!officer) {
    return (
      <Login
        notice={notice}
        onLogin={(o) => {
          record(o, 'auth.login', o.badge, o.role);
          setNotice(null);
          setOfficer(o);
        }}
      />
    );
  }

  // Shell remounts on every sign-in, so view, selection and reveal state never carry over between officers.
  return (
    <AccessProvider officer={officer}>
      <Shell
        officer={officer}
        onSignedOut={(reason) => {
          setNotice(reason ?? null);
          setOfficer(null);
        }}
      />
    </AccessProvider>
  );
}

function Shell({ officer, onSignedOut }: { officer: Officer; onSignedOut: (reason?: string) => void }) {
  const { can, audit } = useAccess();
  const [requestedView, setCurrentView] = useState<ViewName>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [lockedAtmId, setLockedAtmId] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  // A view the role may not open falls back to the dashboard, whichever code path asked for it.
  const currentView: ViewName = requestedView === 'audit' && !can('audit.view') ? 'dashboard' : requestedView;

  useEffect(() => {
    audit('view.open', currentView);
  }, [currentView, audit]);

  useIdleTimeout(IDLE_MS, () => {
    audit('auth.timeout', officer.badge, `idle ${IDLE_MS / 60000} min`);
    onSignedOut(`Signed out after ${IDLE_MS / 60000} minutes of inactivity.`);
  });

  const alertCount = alerts.filter((a) => !a.acknowledged && (a.level === 'critical' || a.level === 'high')).length;

  const handleLogout = () => {
    audit('auth.logout', officer.badge);
    onSignedOut();
  };

  const handleNavigate = (view: ViewName) => {
    if (view === 'audit' && !can('audit.view')) {
      audit('access.denied', 'audit', 'audit.view not permitted for role');
      return;
    }
    setCurrentView(view);
  };

  /** A lock belongs to one case's predictions, so changing case releases it. */
  const handleSelectCase = (caseId: string) => {
    if (caseId !== selectedCaseId) setLockedAtmId(null);
    setSelectedCaseId(caseId);
  };

  /** Every route to a target lock goes through here, so the permission check cannot be skipped. */
  const lock = (caseId: string, atmId: string, via: string): boolean => {
    if (!can('dispatch')) {
      audit('access.denied', atmId, `target.lock not permitted for role (${via})`);
      return false;
    }
    audit('target.lock', atmId, `${caseId} via ${via}`);
    return true;
  };

  const handleLockTarget = (caseId: string, atmId: string) => {
    if (!lock(caseId, atmId, 'button')) return;
    setSelectedCaseId(caseId);
    setLockedAtmId(atmId);
    setCurrentView('map');
  };

  const handleLockChange = (atmId: string | null) => {
    if (atmId === null) {
      if (lockedAtmId) audit('target.release', lockedAtmId, selectedCaseId ?? '');
      setLockedAtmId(null);
      return;
    }
    if (lock(selectedCaseId ?? '-', atmId, 'map')) setLockedAtmId(atmId);
  };

  const handleViewPrediction = (caseId: string) => {
    handleSelectCase(caseId);
    setCurrentView('predictions');
  };

  const handleViewMoneyTrail = (caseId: string) => {
    handleSelectCase(caseId);
    setCurrentView('money-trail');
  };

  const handleViewMap = (caseId: string) => {
    handleSelectCase(caseId);
    setCurrentView('map');
  };

  const handleViewXAI = (caseId: string, prediction: Prediction) => {
    handleSelectCase(caseId);
    setSelectedPrediction(prediction);
    setCurrentView('xai');
  };

  const handleRunDemo = () => {
    audit('demo.run', 'DEMO');
    setDemoOpen(true);
  };

  const handleDemoComplete = (view: ViewName, caseId: string, prediction?: Prediction) => {
    setDemoOpen(false);
    setSelectedCaseId(caseId);
    if (prediction) setSelectedPrediction(prediction);
    // The demo's map step shows the Target Lock on the #1 predicted ATM, for roles allowed to dispatch.
    const lockAtmId = view === 'map' && prediction && can('dispatch') ? prediction.atmId : null;
    if (lockAtmId) audit('target.lock', lockAtmId, `${caseId} via demo`);
    setLockedAtmId(lockAtmId);
    setCurrentView(view);
  };

  return (
    <>
      <Layout
        officer={officer}
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onRunDemo={handleRunDemo}
        alertCount={alertCount}
      >
        {currentView === 'dashboard' && (
          <Dashboard onNavigate={handleNavigate} onSelectCase={handleSelectCase} />
        )}
        {currentView === 'cases' && (
          <CaseInvestigation
            selectedCaseId={selectedCaseId}
            onSelectCase={handleSelectCase}
            onViewPrediction={handleViewPrediction}
            onViewMoneyTrail={handleViewMoneyTrail}
          />
        )}
        {currentView === 'money-trail' && (
          <MoneyTrail caseId={selectedCaseId} onSelectCase={handleSelectCase} onLockTarget={handleLockTarget} />
        )}
        {currentView === 'predictions' && (
          <CashOutPrediction
            caseId={selectedCaseId}
            onViewMap={handleViewMap}
            onViewXAI={handleViewXAI}
            onLockTarget={handleLockTarget}
          />
        )}
        {currentView === 'map' && (
          <GISMap
            caseId={selectedCaseId}
            lockedAtmId={lockedAtmId}
            onLockChange={handleLockChange}
            onSelectCase={handleSelectCase}
          />
        )}
        {currentView === 'xai' && (
          <ExplainableAI caseId={selectedCaseId} prediction={selectedPrediction} />
        )}
        {currentView === 'alerts' && (
          <Alerts onViewCase={(id) => { handleSelectCase(id); setCurrentView('cases'); }} onViewMap={handleViewMap} />
        )}
        {currentView === 'analytics' && <Analytics />}
        {currentView === 'reports' && <Reports caseId={selectedCaseId} />}
        {currentView === 'audit' && <AuditLog />}
      </Layout>

      {demoOpen && (
        <DemoRunner onClose={() => setDemoOpen(false)} onComplete={handleDemoComplete} />
      )}
    </>
  );
}

export default App;
