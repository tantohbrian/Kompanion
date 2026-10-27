import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Settings as SettingsIcon, Film } from 'lucide-react';
import { checkBrowserCompatibility } from './compatibility';
import { CompatibilityScreen } from './CompatibilityScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { useTheme } from './theme';
import { AppRoutes } from './routes';
import { ToastProvider, TooltipProvider, IconButton } from '../ui';
import { SettingsModal } from '../features/settings/SettingsModal';
import { purgeExpiredDeletedProjects } from '../core/storage/storage';

export const App: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
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
            <div className="flex flex-col h-screen w-screen bg-canvas text-text-primary overflow-hidden">
              {/* Global Shell Header */}
              <header className="h-10 bg-surface border-b border-border px-4 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-text-inverse">
                    <Film className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold tracking-tight text-text-primary">
                    Kompanion
                  </span>
                  <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary">
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
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
};
