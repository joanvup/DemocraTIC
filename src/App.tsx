import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './client/hooks/useAuth.js';
import { ThemeProvider } from './client/hooks/useTheme.js';
import { VotingStationPage } from './client/pages/VotingStationPage.js';
import { LoginPage } from './client/pages/LoginPage.js';
import { DashboardPage } from './client/pages/DashboardPage.js';
import { PublicResultsPage } from './client/pages/PublicResultsPage.js';

type AppRoute = 'VOTING' | 'LOGIN' | 'DASHBOARD' | 'PUBLIC_RESULTS';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('VOTING');

  // Si el usuario entra o cambia de ruta
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/resultados')) {
      setCurrentRoute('PUBLIC_RESULTS');
    } else if (path.includes('/dashboard') || path.includes('/admin')) {
      setCurrentRoute(user ? 'DASHBOARD' : 'LOGIN');
    } else {
      setCurrentRoute('VOTING');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentRoute === 'LOGIN') {
    return (
      <LoginPage
        onSuccess={() => setCurrentRoute('DASHBOARD')}
        onCancel={() => setCurrentRoute('VOTING')}
      />
    );
  }

  if (currentRoute === 'DASHBOARD') {
    if (!user) {
      return (
        <LoginPage
          onSuccess={() => setCurrentRoute('DASHBOARD')}
          onCancel={() => setCurrentRoute('VOTING')}
        />
      );
    }

    return (
      <DashboardPage
        onNavigateToVoting={() => setCurrentRoute('VOTING')}
        onNavigateToPublicResults={() => setCurrentRoute('PUBLIC_RESULTS')}
      />
    );
  }

  if (currentRoute === 'PUBLIC_RESULTS') {
    return (
      <PublicResultsPage
        onBack={() => setCurrentRoute('VOTING')}
      />
    );
  }

  // Ruta por defecto: Estación de Votación Táctil
  return (
    <VotingStationPage
      onNavigateToAdmin={() => setCurrentRoute(user ? 'DASHBOARD' : 'LOGIN')}
      onNavigateToPublicResults={() => setCurrentRoute('PUBLIC_RESULTS')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}

