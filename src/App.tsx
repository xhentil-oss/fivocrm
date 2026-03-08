import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TopNavBar from './components/TopNavBar';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import ProjectsView from './views/ProjectsView';
import ProjectDetailView from './views/ProjectDetailView';
import CRMView from './views/CRMView';
import TasksView from './views/TasksView';
import GoalsView from './views/GoalsView';
import TeamsView from './views/TeamsView';
import InvoicesView from './views/InvoicesView';
import ChatView from './views/ChatView';
import ReportsView from './views/ReportsView';
import UserProfileView from './views/UserProfileView';
import SettingsView from './views/SettingsView';
import CustomersView from './views/CustomersView';
import ServicesView from './views/ServicesView';
import ExpensesView from './views/ExpensesView';
import TimeTrackingView from './views/TimeTrackingView';
import FloatingActionButton from './components/FloatingActionButton';
import CommandPalette from './components/CommandPalette';
import { Toaster } from './components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={user ? <Navigate to="/app/reports" replace /> : <LoginView />} />
      
      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-background text-foreground">
            <TopNavBar 
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
              mobileMenuOpen={mobileMenuOpen}
            />
            
            <div className="flex">
              <Sidebar 
                collapsed={sidebarCollapsed} 
                mobileOpen={mobileMenuOpen}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
              
              <main 
                className={`flex-1 transition-all duration-normal ease-in-out ${
                  sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[260px]'
                }`}
                style={{ marginTop: '72px' }}
              >
                <div className="p-6 lg:p-8">
                  <Routes>
                    <Route path="/" element={<Navigate to="/app/reports" replace />} />
                    <Route path="/app/projects" element={<ProjectsView />} />
                    <Route path="/app/projects/:projectId" element={<ProjectDetailView />} />
                    <Route path="/app/crm" element={<CRMView />} />
                    <Route path="/app/tasks" element={<TasksView />} />
                    <Route path="/app/goals" element={<GoalsView />} />
                    <Route path="/app/teams" element={<TeamsView />} />
                    <Route path="/app/invoices" element={<InvoicesView />} />
                    <Route path="/app/chat" element={<ChatView />} />
                    <Route path="/app/reports" element={<ReportsView />} />
                    <Route path="/app/profile" element={<UserProfileView />} />
                    <Route path="/app/customers" element={<CustomersView />} />
                    <Route path="/app/services" element={<ServicesView />} />
                    <Route path="/app/expenses" element={<ExpensesView />} />
                    <Route path="/app/time-tracking" element={<TimeTrackingView />} />
                    <Route path="/app/settings" element={<SettingsView />} />
                  </Routes>
                </div>
              </main>
            </div>

            <FloatingActionButton />
            <CommandPalette 
              open={commandPaletteOpen} 
              onOpenChange={setCommandPaletteOpen} 
            />
            <Toaster />
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
