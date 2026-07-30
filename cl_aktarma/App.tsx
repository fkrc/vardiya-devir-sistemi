import { useState } from 'react';
import type { CurrentUser } from './types';
import './style.css';

import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FormWizard from './components/FormWizard';
import FormDetail from './components/FormDetail';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'wizard' | 'detail'>('login');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
  };

  // EKRAN: LOGIN
  if (currentView === 'login') {
    return (
      <div className="wizard-container">
        <Login onLoginSuccess={(user) => { setCurrentUser(user); setCurrentView('dashboard'); }} />
      </div>
    );
  }

  // Güvenlik: Giriş yapılmamışsa devam etme
  if (!currentUser) return null;

  return (
    <div className={currentView === 'wizard' ? "wizard-container" : "dashboard-container"}>
      {/* Tüm ekranlarda Ortak Header */}
      <Header currentUser={currentUser} onLogout={handleLogout} />

      {/* EKRAN: DASHBOARD */}
      {currentView === 'dashboard' && (
        <Dashboard 
          currentUser={currentUser} 
          onNewForm={() => setCurrentView('wizard')} 
          onViewDetail={(id) => { setSelectedFormId(id); setCurrentView('detail'); }} 
        />
      )}

      {/* EKRAN: YENİ FORM SİHİRBAZI */}
      {currentView === 'wizard' && (
        <FormWizard 
          onCancel={() => setCurrentView('dashboard')} 
          onSuccess={() => setCurrentView('dashboard')} 
        />
      )}

      {/* EKRAN: FORM DETAYI */}
      {currentView === 'detail' && selectedFormId && (
        <FormDetail 
          formId={selectedFormId} 
          currentUser={currentUser} 
          onBack={() => setCurrentView('dashboard')}
          onSuccess={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}