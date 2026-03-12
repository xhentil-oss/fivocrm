import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import TopNavBar from './components/TopNavBar';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
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
import ClientPortalManagementView from './views/ClientPortalManagementView';
import JoinInviteView from './views/JoinInviteView';
import PortalLayout from './views/portal/PortalLayout';
import PortalDashboard from './views/portal/PortalDashboard';
import PortalInvoicesView from './views/portal/PortalInvoicesView';
import PortalServicesView from './views/portal/PortalServicesView';
import PortalChatView from './views/portal/PortalChatView';
import PortalRequestsView from './views/portal/PortalRequestsView';
import FloatingActionButton from './components/FloatingActionButton';
import CommandPalette from './components/CommandPalette';
import PermissionGate from './components/PermissionGate';
import PendingInvitesBanner from './components/PendingInvitesBanner';
import { usePermissions } from './hooks/usePermissions';
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

// Redirect to the best available page based on permissions
function DefaultRedirect() {
  const permissions = usePermissions();
  
  if (permissions.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (permissions.canAccessReports) return <Navigate to="/app/reports" replace />;
  if (permissions.canAccessProjects) return <Navigate to="/app/projects" replace />;
  if (permissions.canAccessTasks) return <Navigate to="/app/tasks" replace />;
  return <Navigate to="/app/profile" replace />;
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
      <Route path="/login" element={user ? <DefaultRedirect /> : <LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="/join/:token" element={<JoinInviteView />} />

      {/* Client Portal routes */}
      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<PortalDashboard />} />
        <Route path="invoices" element={<PortalInvoicesView />} />
        <Route path="services" element={<PortalServicesView />} />
        <Route path="chat" element={<PortalChatView />} />
        <Route path="requests" element={<PortalRequestsView />} />
      </Route>
      
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
                  <PendingInvitesBanner />
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<DefaultRedirect />} />
                      <Route path="/app/projects" element={<PermissionGate permissionKey="canAccessProjects"><ProjectsView /></PermissionGate>} />
                      <Route path="/app/projects/:projectId" element={<PermissionGate permissionKey="canAccessProjects"><ProjectDetailView /></PermissionGate>} />
                      <Route path="/app/crm" element={<PermissionGate permissionKey="canAccessCRM"><CRMView /></PermissionGate>} />
                      <Route path="/app/tasks" element={<PermissionGate permissionKey="canAccessTasks"><TasksView /></PermissionGate>} />
                      <Route path="/app/goals" element={<PermissionGate permissionKey="canAccessGoals"><GoalsView /></PermissionGate>} />
                      <Route path="/app/teams" element={<PermissionGate permissionKey="canAccessTeams"><TeamsView /></PermissionGate>} />
                      <Route path="/app/invoices" element={<PermissionGate permissionKey="canAccessInvoices"><InvoicesView /></PermissionGate>} />
                      <Route path="/app/chat" element={<PermissionGate permissionKey="canAccessChat"><ChatView /></PermissionGate>} />
                      <Route path="/app/reports" element={<PermissionGate permissionKey="canAccessReports"><ReportsView /></PermissionGate>} />
                      <Route path="/app/profile" element={<UserProfileView />} />
                      <Route path="/app/customers" element={<PermissionGate permissionKey="canAccessCustomers"><CustomersView /></PermissionGate>} />
                      <Route path="/app/services" element={<PermissionGate permissionKey="canAccessServices"><ServicesView /></PermissionGate>} />
                      <Route path="/app/expenses" element={<PermissionGate permissionKey="canAccessExpenses"><ExpensesView /></PermissionGate>} />
                      <Route path="/app/time-tracking" element={<PermissionGate permissionKey="canAccessTimeTracking"><TimeTrackingView /></PermissionGate>} />
                      <Route path="/app/settings" element={<PermissionGate permissionKey="canAccessSettings"><SettingsView /></PermissionGate>} />
                      <Route path="/app/client-portal" element={<PermissionGate permissionKey="canAccessCRM"><ClientPortalManagementView /></PermissionGate>} />
                      <Route path="*" element={
                      <div className="text-center py-20">
                        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
                        <p className="text-muted-foreground mb-6">Faqja nuk u gjet</p>
                        <Link to="/app/profile" className="text-primary hover:underline">
                          Kthehu në dashboard
                        </Link>
                      </div>
                    } />
                    </Routes>
                  </ErrorBoundary>
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
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
