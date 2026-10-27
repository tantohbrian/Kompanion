import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WorkspacePage } from '../features/workspaces/WorkspacePage';
import { WorkspaceErrorBoundary } from '../features/workspaces/WorkspaceErrorBoundary';
import { ProjectPage } from '../features/projects/ProjectPage';
import { ProjectErrorBoundary } from '../features/projects/ProjectErrorBoundary';
import { ProjectWorkflowPage } from './ProjectWorkflowPage';
import { EditorErrorBoundary } from '../features/editor/EditorErrorBoundary';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <WorkspaceErrorBoundary>
            <WorkspacePage />
          </WorkspaceErrorBoundary>
        }
      />
      <Route
        path="/w/:workspaceId"
        element={
          <ProjectErrorBoundary>
            <ProjectPage />
          </ProjectErrorBoundary>
        }
      />
      <Route
        path="/w/:workspaceId/p/:projectId"
        element={
          <EditorErrorBoundary>
            <ProjectWorkflowPage />
          </EditorErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
