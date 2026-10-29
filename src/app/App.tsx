import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Film } from 'lucide-react';
import { checkBrowserCompatibility } from './compatibility';
import { CompatibilityScreen } from './CompatibilityScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { useTheme, ThemePreference } from './theme';
import { AppRoutes } from './routes';
import { ToastProvider, TooltipProvider, IconButton } from '../ui';
import { SettingsModal } from '../features/settings/SettingsModal';
import { purgeExpiredDeletedProjects, requestPersistentStorage } from '../core/storage/storage';

const AppLayout: React.FC<{
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}> = ({ settingsOpen, setSettingsOpen, theme, setTheme }) => {
  const location = useLocation();
  // When inside a project route (/w/:workspaceId/p/:projectId), the project view provides a unified 48px top bar
  const isProjectRoute = location.pathname.includes('/p/');

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-text-primary overflow-hidden">
      {/* Global Shell Header - only rendered when not in a project */}
      {!isProjectRoute && (
        <header className="h-12 bg-[#0d0d10]/95 backdrop-blur-md border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-tight text-text-primary">
              Kompanion
            </span>
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary">
              v0.1.0-alpha
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Open application settings"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        </header>
      )}

      {/* Application Views */}
      <main className="flex-1 overflow-hidden relative">
        <AppRoutes />
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
};

export const App: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Silently request persistent storage so IndexedDB and OPFS survive power loss
    requestPersistentStorage().catch(() => {});

    // Purge any soft-deleted projects that expired while app was closed
    purgeExpiredDeletedProjects(10000).catch((err) => {
      console.warn('Failed to purge expired projects on boot:', err);
    });
  }, []);

  const compatibility = useMemo(() => {
    return checkBrowserCompatibility();
  }, []);

  if (!compatibility.isCompatible) {
    return <CompatibilityScreen report={compatibility} />;
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppLayout
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              theme={theme}
              setTheme={setTheme}
            />
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
};
