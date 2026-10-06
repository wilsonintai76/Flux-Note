import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { authService, DEMO_USERS } from '../services/authService';
import { 
  FileText, 
  LayoutGrid, 
  BookOpen, 
  Flame, 
  FileCheck, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Cloud, 
  WifiOff, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Award, 
  GraduationCap, 
  Mic, 
  Search, 
  PenTool, 
  Split, 
  KeyRound, 
  CheckCircle2, 
  User, 
  Mail, 
  ChevronRight, 
  X, 
  Layers, 
  Zap, 
  Cpu, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  onLoginSuccess,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'demo'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [institution, setInstitution] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active feature tab in the hero showcase
  const [heroPreviewTab, setHeroPreviewTab] = useState<'pdf' | 'canvas' | 'voice' | 'sync'>('pdf');

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'demo' = 'signin') => {
    setAuthMode(mode);
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setAuthError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    const res = await authService.signIn(email, password);
    setIsLoading(false);

    if (res.success && res.user) {
      setIsAuthModalOpen(false);
      onLoginSuccess(res.user);
    } else {
      setAuthError(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setAuthError('Please enter your full name and email');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    const res = await authService.signUp(name, email, role, institution, password);
    setIsLoading(false);

    if (res.success && res.user) {
      setIsAuthModalOpen(false);
      onLoginSuccess(res.user);
    } else {
      setAuthError(res.error || 'Registration failed.');
    }
  };

  const handleQuickDemoLogin = async (demoKey: 'scholar' | 'student' | 'researcher') => {
    setIsLoading(true);
    const user = await authService.loginAsDemo(demoKey);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] font-sans antialiased selection:bg-stone-900 selection:text-white flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
              F
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-stone-900">
              Folio
            </span>
            <span className="hidden md:inline-block text-[11px] text-stone-600 font-mono tracking-wider uppercase pl-2 border-l border-stone-300">
              Scholar & Tutorial Workspace
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-stone-600">
            <a href="#features" className="hover:text-stone-900 transition-colors">Workspace Features</a>
            <a href="#pdf-tutorial" className="hover:text-stone-900 transition-colors">PDF & Tutorial Suite</a>
            <a href="#security" className="hover:text-stone-900 transition-colors">Encrypted Vault</a>
            <a href="#sync-manager" className="hover:text-stone-900 transition-colors">Offline Sync</a>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('scholar')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200/70 border border-stone-300/80 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Try 1-Click Demo</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAuth('signin')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200/70 transition-colors"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => handleOpenAuth('signup')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs hover:scale-102 active:scale-98 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Open Vault</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-16 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Unboxed Editorial Eyebrow */}
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-stone-600 uppercase mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Client-Side Encrypted</span>
          <span aria-hidden="true">·</span>
          <span>Tactile Thinking Environment</span>
          <span aria-hidden="true">·</span>
          <span>Offline First</span>
        </div>

        {/* Main Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-stone-900 tracking-tight leading-[1.08] max-w-4xl mb-6">
          The thinking workspace for scholars, students & lecturers.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed mb-8">
          Annotate tutorial PDFs with grading stamps, handwrite mathematical proofs, organize connected thoughts on an infinite canvas, and sync across devices with zero-knowledge local security.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-14">
          <button
            type="button"
            onClick={() => handleOpenAuth('signup')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold shadow-md hover:scale-102 active:scale-98 transition-all"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Create Free Encrypted Vault</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('scholar')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold border border-stone-300 shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Launch Live Interactive Demo</span>
          </button>
        </div>

        {/* Security & Reliability Highlights Bar */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 text-left mb-16">
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero-Knowledge Vault</span>
            </div>
            <p className="text-[11px] text-stone-500">Your notes are locked in local browser sandbox.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-xs mb-1">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Student & Lecturer Modes</span>
            </div>
            <p className="text-[11px] text-stone-500">Worksheets, feedback stamps & rubric grading.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-xs mb-1">
              <Cloud className="w-4 h-4 text-purple-600" />
              <span>Offline Queue & Sync</span>
            </div>
            <p className="text-[11px] text-stone-500">Full offline editing with 3-way conflict resolution.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-xs mb-1">
              <PenTool className="w-4 h-4 text-amber-600" />
              <span>Fluid Stylus & Ink</span>
            </div>
            <p className="text-[11px] text-stone-500">Vector Bezier smoothing with pressure curves.</p>
          </div>
        </div>

        {/* Interactive Hero Feature Showcase Card */}
        <div className="w-full bg-white rounded-3xl border border-stone-300/80 shadow-xl overflow-hidden text-left">
          {/* Showcase Tabs */}
          <div className="px-4 pt-3 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
              <button
                type="button"
                onClick={() => setHeroPreviewTab('pdf')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  heroPreviewTab === 'pdf'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileCheck className="w-4 h-4 text-red-500" />
                <span>PDF Tutorial Annotator</span>
              </button>

              <button
                type="button"
                onClick={() => setHeroPreviewTab('canvas')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  heroPreviewTab === 'canvas'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-purple-600" />
                <span>Spatial Blackboard</span>
              </button>

              <button
                type="button"
                onClick={() => setHeroPreviewTab('voice')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  heroPreviewTab === 'voice'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Mic className="w-4 h-4 text-emerald-600" />
                <span>Voice Dictation & Speech</span>
              </button>

              <button
                type="button"
                onClick={() => setHeroPreviewTab('sync')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  heroPreviewTab === 'sync'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Split className="w-4 h-4 text-amber-600" />
                <span>Sync & Conflict Resolver</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('scholar')}
              className="text-xs font-bold text-stone-800 hover:text-stone-950 flex items-center gap-1 mb-2 sm:mb-0"
            >
              <span>Launch Live →</span>
            </button>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="p-6 sm:p-8 bg-[#faf9f6] min-h-[380px] flex flex-col justify-center">
            {heroPreviewTab === 'pdf' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Tutorial Sheet 04: Linear Algebra & Matrix Decomposition</h3>
                    <p className="text-xs text-stone-500">Lecturer mode active • 4 pages • OCR text layer enabled</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                      ✔ Correct Step (+5 pts)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold">
                      💯 10/10 Excellent
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3 font-serif text-sm">
                  <div className="p-3 bg-amber-50/70 border-l-4 border-amber-400 rounded-r-lg">
                    <strong className="text-stone-900 block font-sans text-xs">Problem 1. Eigenvalues of Symmetric Real Matrices</strong>
                    <span className="text-stone-700 text-xs font-mono">det(A - λI) = 0 ⟹ λ₁ = 4, λ₂ = 1</span>
                  </div>
                  <div className="p-3 bg-emerald-50/70 border-l-4 border-emerald-500 rounded-r-lg font-sans text-xs">
                    <span className="font-bold text-emerald-900">Lecturer Feedback:</span> "Superb orthogonality proof. Verified using Gram-Schmidt process."
                  </div>
                </div>
              </div>
            )}

            {heroPreviewTab === 'canvas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <span className="text-[10px] font-mono text-purple-700 uppercase font-bold">Node 1 · Theorem</span>
                  <h4 className="text-xs font-bold text-stone-900 mt-1">CAP Theorem in Distributed Stores</h4>
                  <p className="text-[11px] text-stone-600 mt-1">Consistency, Availability, Partition Tolerance.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-purple-300 shadow-xs ring-2 ring-purple-100">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold">Node 2 · Implementation</span>
                  <h4 className="text-xs font-bold text-stone-900 mt-1">Paxos / Raft Consensus</h4>
                  <p className="text-[11px] text-stone-600 mt-1">Leader election and replicated log state machine.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <span className="text-[10px] font-mono text-blue-700 uppercase font-bold">Node 3 · Synthesis</span>
                  <h4 className="text-xs font-bold text-stone-900 mt-1">CRDTs & Vector Clocks</h4>
                  <p className="text-[11px] text-stone-600 mt-1">State-based convergence without central lock.</p>
                </div>
              </div>
            )}

            {heroPreviewTab === 'voice' && (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-stone-900">Real-Time Lecture Speech Transcriber</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                    Web Speech API Active
                  </span>
                </div>

                {/* Animated Waveform Simulation */}
                <div className="flex items-center gap-1 h-8 px-2 bg-stone-50 rounded-xl justify-center">
                  {[12, 28, 45, 18, 60, 32, 50, 75, 40, 25, 65, 30, 80, 42, 20, 55, 35, 70, 22, 15].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-stone-800 rounded-full transition-all duration-150"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                <p className="text-xs text-stone-700 font-serif italic border-l-2 border-stone-900 pl-3">
                  "Let’s examine how the singular value decomposition splits matrix A into orthogonal matrices U and V with singular values along the diagonal..."
                </p>
              </div>
            )}

            {heroPreviewTab === 'sync' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800">Local Offline Draft</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">This Device</span>
                  </div>
                  <p className="text-xs text-stone-600">3 offline handwritten proofs and margin annotations queued for cloud push.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-800">Cloud Revision</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">Cloud Server</span>
                  </div>
                  <p className="text-xs text-stone-600">Collaborator updates merged seamlessly via 3-way conflict resolver.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Section */}
      <section id="features" className="px-4 sm:px-8 py-16 max-w-6xl mx-auto border-t border-stone-200">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold tracking-widest text-stone-600 uppercase">Architecture & Modules</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight mt-2">
            Engineered for rigorous intellectual work.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Tactile Page Notes</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Markdown editor with inline handwritten ink blocks, image attachments, voice-to-text live speech dictation, and bidirectional `[[WikiLinks]]`.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Infinite Spatial Blackboard</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Pan and zoom across an infinite coordinate canvas. Drop text cards, sticky notes, research quotes, and draw connecting Bezier relations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">PDF & Tutorial Worksheet Annotator</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Upload PDF lecture slides or photos of worksheets. Draw vector stylus annotations, place lecturer grading stamps, and export flattened PDFs.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Vault Section */}
      <section id="security" className="px-4 sm:px-8 py-16 bg-[#f4f3ef] border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-stone-900">
            Encrypted Security by Default
          </h2>
          <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Your intellectual property, research hypotheses, and student grading sheets belong exclusively to you. All notes are protected by client-side credentials and sandbox isolation.
          </p>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => handleOpenAuth('signup')}
              className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-md hover:scale-102 transition-transform"
            >
              Create Your Protected Vault →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200/80 bg-white px-4 sm:px-8 py-6 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-stone-900">Folio</span>
          <span>·</span>
          <span>Tactile Thinking Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => handleQuickDemoLogin('student')} className="hover:text-stone-900">Student Demo</button>
          <button type="button" onClick={() => handleQuickDemoLogin('scholar')} className="hover:text-stone-900">Lecturer Demo</button>
          <button type="button" onClick={() => handleOpenAuth('signin')} className="font-bold text-stone-900">Sign In</button>
        </div>
      </footer>

      {/* Sign In & Sign Up Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-sm">
                  F
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {authMode === 'signin' ? 'Sign In to Folio Vault' : authMode === 'signup' ? 'Create Encrypted Vault' : 'Quick Demo Profiles'}
                  </h3>
                  <p className="text-[11px] text-stone-500">Secure access to your notebook and canvas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Mode Selector */}
            <div className="flex border-b border-stone-200 bg-stone-50/40 p-1.5 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  authMode === 'signin' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  authMode === 'signup' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Create Vault
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('demo'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  authMode === 'demo' ? 'bg-white text-amber-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                1-Click Demo
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs font-medium border-b border-rose-200 flex items-center gap-2">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6">
              {/* MODE 1: SIGN IN */}
              {authMode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="scholar@university.edu"
                        className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Vault Password / PIN
                      </label>
                      <span className="text-[10px] text-stone-400">Demo password: password123</span>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {isLoading ? 'Decrypting & Authenticating...' : 'Unlock Vault & Enter'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-stone-500">Want to test quickly? </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('demo')}
                      className="text-xs font-bold text-stone-900 hover:underline"
                    >
                      Use Instant Demo
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 2: SIGN UP */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Ada Lovelace"
                        className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ada@cambridge.edu"
                        className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['student', 'lecturer', 'researcher'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold capitalize border transition-all ${
                          role === r
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Institution (Optional)
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. Stanford University"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Create Master Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition-all mt-2"
                  >
                    {isLoading ? 'Creating Vault...' : 'Provision Secure Vault'}
                  </button>
                </form>
              )}

              {/* MODE 3: 1-CLICK DEMO */}
              {authMode === 'demo' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 mb-2">
                    Select a curated academic persona to test all features instantly with sample notes, canvas graphs, and graded worksheets:
                  </p>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('scholar')}
                    className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                        EV
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Dr. Evelyn Vance (Lecturer & Grader)</h4>
                        <p className="text-[11px] text-stone-500">Oxford · PDF tutorial grading stamps, linear algebra sheets</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('student')}
                    className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        AC
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Alex Chen (Student / Problem Solver)</h4>
                        <p className="text-[11px] text-stone-500">MIT · Handwriting proofs, lecture speech transcripts</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('researcher')}
                    className="w-full p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        MR
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Marcus Ross (AI & NLP Researcher)</h4>
                        <p className="text-[11px] text-stone-500">CMU · Research synthesis, citation extracts, spatial graphs</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
