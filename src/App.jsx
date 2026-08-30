import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/auth/login'
import SignupPage from './pages/auth/signup'
import WaitlistPage from './pages/auth/waitlist'
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard'
import AssessmentDetailScreen from './pages/recruiter/AssessmentDetailScreen'
import RecruiterLayout from './pages/recruiter/RecruiterLayout'
import AssessmentsListPage from './pages/recruiter/assessments-list'
import PipelineScreen from './pages/recruiter/pipeline'
import CandidatesScreen from './pages/recruiter/CandidatesScreen'
import ReportsScreen from './pages/recruiter/reports'
import ReportDetailScreen from './pages/recruiter/ReportDetailScreen'
import InviteScreen from './pages/recruiter/invite'
import TeamInviteScreen from './pages/recruiter/invite/TeamInviteScreen'
import SettingsPage from './pages/recruiter/settings'
import InviteCandidate from './pages/recruiter/InviteCandidate'
import InviteRedirect from './pages/candidate/InviteRedirect'
import CandidateAssessmentCompletePage from './pages/candidate/CandidateAssessmentCompletePage'
import CandidateSectionRuntimePage from './pages/candidate/CandidateSectionRuntimePage'
import AssessmentLandingPage from './pages/candidate/AssessmentLandingPage'
import AssessmentTermsPage from './pages/candidate/AssessmentTermsPage'
import McqSectionPage from './pages/candidate/McqSectionPage'
import ExamPreview from './pages/candidate/__ExamPreview'
import OnboardingPage from './pages/recruiter/onboarding/OnboardingPage'
import AssessmentBuilderPage from './pages/recruiter/assessments/new/AssessmentBuilderPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminAssessmentsPage from './pages/admin/AdminAssessmentsPage'
import AdminLibraryPage from './pages/admin/AdminLibraryPage'
import AdminPresetsPage from './pages/admin/AdminPresetsPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import TaskLibraryPage from './pages/recruiter/TaskLibraryPage'
import TemplatesPage from './pages/recruiter/templates'
// Code-split: pulls CodeMirror + the markdown renderer out of the main bundle.
// This route always opens in its own tab, so the extra fetch costs nothing elsewhere.
const TaskCodeViewPage = lazy(() => import('./pages/recruiter/TaskCodeViewPage'))
// Public product page for the AI Adaptive Interview. Code-split: it is
// marketing-weight and never loads for someone who stays inside the app.
const AdaptiveInterviewLanding = lazy(() => import('./pages/public/adaptive-interview'))
import UserDashboardPage from './users/pages/UserDashboardPage'
import UserSimulationsPage from './users/pages/UserSimulationsPage'
import UserSimulationDetailPage from './users/pages/UserSimulationDetailPage'
import SessionAnalyticsPage from './users/pages/SessionAnalyticsPage'
import UserSessionsPage from './users/pages/UserSessionsPage'
import UserAnalyticsPlaceholderPage from './users/pages/UserAnalyticsPlaceholderPage'
import UserAIInsightsPage from './users/pages/UserAIInsightsPage'
import UserSkillRoadmapPage from './users/pages/UserSkillRoadmapPage'
import UserSettingsPage from './users/pages/UserSettingsPage'
import ProtectedRoute from './utils/ProtectedRoute'
import AdminRoute from './utils/AdminRoute'
import { RecruiterThemeProvider } from './theme/RecruiterThemeProvider'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

function RoleBasedRedirect() {
  const { role: userRole, org, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (userRole === 'ORG_ADMIN' || userRole === 'ADMIN') {
    // ORG_ADMIN = recruiter who created a workspace
    if (org?.org_id) {
      return org.is_onboarded === false
        ? <Navigate to="/recruiter/onboarding" replace />
        : <Navigate to="/recruiter/dashboard" replace />;
    }
    // System admin (no org context) — only for legacy ADMIN role
    if (userRole === 'ADMIN') return <Navigate to="/admin" replace />;
    // ORG_ADMIN with no org somehow — send to onboarding
    return <Navigate to="/recruiter/onboarding" replace />;
  }

  if (userRole === 'RECRUITER') return <Navigate to="/recruiter/dashboard" replace />;
  return <Navigate to="/user/dashboard" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/recruiter/signup" element={<SignupPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        {/* Public: linked from the dashboard's AI Adaptive card and shareable
            on its own to founders/hiring managers, so no auth guard. */}
        <Route
          path="/product/adaptive-interview"
          element={
            <Suspense fallback={<div className="min-h-screen bg-[#0A0908]" />}>
              <AdaptiveInterviewLanding />
            </Suspense>
          }
        />
        {/* Account recovery — these were linked but had no route. */}
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/assessments" 
          element={
            <AdminRoute>
              <AdminLayout><AdminAssessmentsPage /></AdminLayout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/library" 
          element={
            <AdminRoute>
              <AdminLayout><AdminLibraryPage /></AdminLayout>
            </AdminRoute>
          } 
        />
        <Route
          path="/admin/templates"
          element={
            <AdminRoute>
              <AdminLayout><AdminPresetsPage /></AdminLayout>
            </AdminRoute>
          }
        />
        <Route 
          path="/" 
          element={<RoleBasedRedirect />} 
        />
        <Route 
          path="/user/dashboard" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserDashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/simulations" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSimulationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user/simulations" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSimulationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/simulations/:id" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSimulationDetailPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sessions" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSessionsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserAnalyticsPlaceholderPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ai-insights" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserAIInsightsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/skill-roadmap" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSkillRoadmapPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute requiredRole="USER">
              <UserSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics/:sessionId" 
          element={
            <ProtectedRoute requiredRole="USER">
              <SessionAnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><RecruiterDashboard /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/assessments/new"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><AssessmentBuilderPage /></RecruiterLayout>
            </ProtectedRoute>
          } 
        />
        {/* Resume an existing draft. Must be declared before `/:id` so "edit"
            is not swallowed by the detail screen's param route. */}
        <Route
          path="/recruiter/assessments/:id/edit"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><AssessmentBuilderPage /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/assessments/:id"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><AssessmentDetailScreen /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/assessments"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><AssessmentsListPage /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/recruiter/task-library" 
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><TaskLibraryPage /></RecruiterLayout>
            </ProtectedRoute>
          } 
        />
        <Route
          path="/recruiter/templates"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><TemplatesPage /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        {/* Full-bleed code view — opened in its own tab, so no RecruiterLayout chrome. */}
        <Route
          path="/recruiter/library/tasks/:itemId/view"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <Suspense fallback={<div className="h-screen bg-page" />}>
                <TaskCodeViewPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/pipeline"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><PipelineScreen /></RecruiterLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recruiter/candidates" 
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><CandidatesScreen /></RecruiterLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recruiter/reports" 
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><ReportsScreen /></RecruiterLayout>
            </ProtectedRoute>
          } 
        />
        {/* Instance-keyed detail (current). Works for assessments with no
            coding section, which have no CandidateSession to key on. */}
        <Route
          path="/recruiter/reports/:assessmentInstanceId"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><ReportDetailScreen /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        {/* Session-keyed detail (legacy, kept for existing links). */}
        <Route
          path="/recruiter/reports/:assessmentId/:sessionId"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><ReportDetailScreen /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/settings"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><SettingsPage /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/invite"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><TeamInviteScreen /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        {/* Original per-assessment candidate invite flow — kept intact, moved off
            /recruiter/invite now that it hosts the team invite screen. */}
        <Route
          path="/recruiter/invite/candidates"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterLayout><InviteScreen /></RecruiterLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/:assessmentId/invite"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <RecruiterThemeProvider>
                <InviteCandidate />
              </RecruiterThemeProvider>
            </ProtectedRoute>
          } 
        />
        <Route path="/invite/:token" element={<InviteRedirect />} />
        <Route path="/candidate/assessment/:instanceId/sections/:sectionId" element={<CandidateSectionRuntimePage />} />
        <Route path="/candidate/assessment/:instanceId/complete" element={<CandidateAssessmentCompletePage />} />
        <Route path="/assessment/:token" element={<AssessmentLandingPage />} />
        <Route path="/assessment/:token/terms" element={<AssessmentTermsPage />} />
        <Route path="/assessment/:token/mcq/:sectionIndex" element={<McqSectionPage />} />
        {/* Dev-only preview harness — must not ship as a public route. */}
        {import.meta.env.DEV && (
          <Route path="/__exam-preview" element={<ExamPreview />} />
        )}
        {/* Guarded: this creates the org and flips is_onboarded, so it must not
            be reachable anonymously. */}
        <Route
          path="/recruiter/onboarding"
          element={
            <ProtectedRoute requiredRole="RECRUITER">
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </Router>
  )
}
export default App