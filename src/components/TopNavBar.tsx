import React from 'react';
import { Search, Plus, User, Moon, Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@animaapp/playground-react-sdk';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import NotificationsCenter from './NotificationsCenter';

interface TopNavBarProps {
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  onToggleMobileMenu: () => void;
  mobileMenuOpen: boolean;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  onToggleSidebar, 
  onOpenCommandPalette,
  onToggleMobileMenu,
  mobileMenuOpen
}) => {
  const navigate = useNavigate();
  const { user, logout, login, isAnonymous } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const handleSwitchAccount = async () => {
    await logout();
    await login();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[72px] bg-gradient-primary border-b border-border/20">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="lg:hidden bg-white/10 text-primary-foreground hover:bg-white/20"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden lg:flex bg-white/10 text-primary-foreground hover:bg-white/20"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <h1 className="text-h4 text-primary-foreground font-medium">
            WorkHub
          </h1>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full h-11 px-4 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg text-primary-foreground/80 hover:bg-white/20 transition-colors duration-fast"
          >
            <Search className="w-5 h-5" />
            <span className="text-body-sm">Search or type a command...</span>
            <kbd className="ml-auto px-2 py-1 text-caption bg-white/10 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenCommandPalette}
            className="md:hidden bg-white/10 text-primary-foreground hover:bg-white/20"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="bg-white/10 text-primary-foreground hover:bg-white/20"
                aria-label="Quick add"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-foreground">Quick Add</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/projects')} className="text-foreground">
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/crm')} className="text-foreground">
                New Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/tasks')} className="text-foreground">
                New Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationsCenter />

          <Button 
            variant="ghost" 
            size="icon"
            className="bg-white/10 text-primary-foreground hover:bg-white/20"
            aria-label="Toggle dark mode"
          >
            <Moon className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="bg-white/10 text-primary-foreground hover:bg-white/20"
                aria-label="User menu"
              >
                {user?.profilePictureUrl ? (
                  <img 
                    src={user.profilePictureUrl} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <DropdownMenuLabel className="text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate('/app/profile')} className="text-foreground">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')} className="text-foreground">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSwitchAccount} className="text-foreground">
                <User className="w-4 h-4 mr-2" />
                Ndrysho Llogarinë
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Dil nga Llogaria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;