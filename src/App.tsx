import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Layers, 
  Sliders, 
  Film, 
  Download, 
  Crosshair, 
  Zap, 
  Cpu,
  Info,
  Crown,
  CheckCircle2
} from 'lucide-react';
import { 
  VideoClip, 
  StylePreset, 
  RenderSettings, 
  ComparisonMode, 
  KinematicMotionData 
} from './types/index.ts';
import { UserProfile, WalletTransaction, PaymentPackage } from './types/auth.ts';
import { SAMPLE_VIDEOS, STYLE_PRESETS } from './services/sampleVideos.ts';
import { 
  getInitialUser, 
  saveUser, 
  getInitialTransactions, 
  saveTransactions, 
  formatRupiah 
} from './services/paymentService.ts';
import { Header } from './components/Header.tsx';
import { ViewportPlayer } from './components/ViewportPlayer.tsx';
import { HumanTrackingPanel } from './components/HumanTrackingPanel.tsx';
import { StyleSelector } from './components/StyleSelector.tsx';
import { TimelineEditor } from './components/TimelineEditor.tsx';
import { VideoSourceModal } from './components/VideoSourceModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { WalletModal } from './components/WalletModal.tsx';
import { SubscriptionModal } from './components/SubscriptionModal.tsx';
import { PaymentCheckoutModal } from './components/PaymentCheckoutModal.tsx';

export default function App() {
  const [currentVideo, setCurrentVideo] = useState<VideoClip>(SAMPLE_VIDEOS[0]);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<StylePreset>(STYLE_PRESETS[0]);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('split');
  const [showDetectionHUD, setShowDetectionHUD] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [motionData, setMotionData] = useState<KinematicMotionData | null>(null);

  // User Authentication & Wallet State
  const [currentUser, setCurrentUser] = useState<UserProfile>(getInitialUser);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(getInitialTransactions);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutItem, setCheckoutItem] = useState<{
    name: string;
    price: number;
    type: 'topup' | 'subscription';
    packageId?: string;
  } | null>(null);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Render settings
  const [settings, setSettings] = useState<RenderSettings>({
    styleId: 'metahuman_cyber',
    outfitId: 'latex_bodysuit',
    bodyType: 'athletic',
    environment: 'neo_tokyo',
    lighting: 'golden_hour',
    particleType: 'embers',
    motionBlurAngle: 180,
    cinematicGrain: 20,
    bloomIntensity: 60,
    meshFidelity: 95,
    subsurfaceScattering: true,
    anamorphicStreaks: true,
    keepOriginalAudio: true,
    resolution: '1080p',
    exportFps: 30,
    aspectRatio: '9:16',
    motionSmoothness: 90,
    promptModifier: ''
  });

  const [geminiAnalysis, setGeminiAnalysis] = useState<{
    analysis?: string;
    cinematicNotes?: string;
    cameraStyle?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const updateSettings = (updates: Partial<RenderSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Handle Pay with Wallet Balance
  const handlePayWithWallet = (pkg: PaymentPackage) => {
    if (currentUser.walletBalance < pkg.price) return;

    const newBalance = currentUser.walletBalance - pkg.price;
    const updatedUser: UserProfile = {
      ...currentUser,
      walletBalance: newBalance,
      tier: 'premium',
      premiumUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    };
    saveUser(updatedUser);
    setCurrentUser(updatedUser);

    const newTx: WalletTransaction = {
      id: `tx_sub_${Date.now()}`,
      type: 'subscription',
      title: `Langganan ${pkg.name}`,
      amount: -pkg.price,
      timestamp: new Date().toISOString(),
      status: 'success',
      paymentMethod: 'Saldo Dompet Digital',
      referenceId: `MC-SUB-${Math.floor(100000 + Math.random() * 900000)}`
    };
    const updatedTxs = [newTx, ...transactions];
    saveTransactions(updatedTxs);
    setTransactions(updatedTxs);

    setIsSubscriptionModalOpen(false);
    showToast(`👑 Selamat! Akun Anda aktif sebagai Premium VIP. Batas durasi render kini hingga 3 Menit!`);
  };

  // Handle Midtrans / QRIS Payment Success
  const handlePaymentSuccess = (channelName: string) => {
    if (!checkoutItem) return;

    if (checkoutItem.type === 'topup') {
      const newBalance = currentUser.walletBalance + checkoutItem.price;
      const updatedUser: UserProfile = {
        ...currentUser,
        walletBalance: newBalance
      };
      saveUser(updatedUser);
      setCurrentUser(updatedUser);

      const newTx: WalletTransaction = {
        id: `tx_topup_${Date.now()}`,
        type: 'topup',
        title: checkoutItem.name,
        amount: checkoutItem.price,
        timestamp: new Date().toISOString(),
        status: 'success',
        paymentMethod: channelName,
        referenceId: `MC-TOPUP-${Math.floor(100000 + Math.random() * 900000)}`
      };
      const updatedTxs = [newTx, ...transactions];
      saveTransactions(updatedTxs);
      setTransactions(updatedTxs);

      setIsCheckoutModalOpen(false);
      showToast(`Top up saldo berhasil! Saldo dompet Anda bertambah ${formatRupiah(checkoutItem.price)}.`);
    } else {
      // Subscription upgrade
      const updatedUser: UserProfile = {
        ...currentUser,
        tier: 'premium',
        premiumUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
      };
      saveUser(updatedUser);
      setCurrentUser(updatedUser);

      const newTx: WalletTransaction = {
        id: `tx_sub_${Date.now()}`,
        type: 'subscription',
        title: checkoutItem.name,
        amount: -checkoutItem.price,
        timestamp: new Date().toISOString(),
        status: 'success',
        paymentMethod: channelName,
        referenceId: `MC-MIDTRANS-${Math.floor(100000 + Math.random() * 900000)}`
      };
      const updatedTxs = [newTx, ...transactions];
      saveTransactions(updatedTxs);
      setTransactions(updatedTxs);

      setIsCheckoutModalOpen(false);
      setIsSubscriptionModalOpen(false);
      showToast(`👑 Pembayaran berhasil via ${channelName}! Akun Premium VIP aktif: Anda dapat merender video hingga 3 Menit.`);
    }
  };

  // Gemini AI Motion Analysis with memoized cache to protect API quota
  const analysisCacheRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const videoKey = currentVideo.id;
    if (analysisCacheRef.current[videoKey]) {
      setGeminiAnalysis(analysisCacheRef.current[videoKey]);
      return;
    }

    const fetchMotionAnalysis = async () => {
      try {
        const res = await fetch('/api/analyze-motion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleName: activeStyle.name,
            motionType: currentVideo.title,
            fps: currentVideo.fps || 30,
            duration: currentVideo.duration || 6,
            jointCount: 33
          })
        });
        const data = await res.json();
        if (data.success && data.data) {
          analysisCacheRef.current[videoKey] = data.data;
          setGeminiAnalysis(data.data);
        }
      } catch {
        // Fallback gracefully without console error
        const fallback = {
          analysis: `Analisis Kinematika Presisi: Penelusuran 33 sendi tubuh mengunci gerakan ${currentVideo.title} dengan toleransi <0.2mm.`,
          cinematicNotes: 'Pencahayaan rim volumetrik aktif dengan subsurface scattering dan skinning busana presisi.',
          cameraStyle: 'Kamera sinematik 35mm dengan aperture f/1.8 dan shutter angle 180°.'
        };
        analysisCacheRef.current[videoKey] = fallback;
        setGeminiAnalysis(fallback);
      }
    };

    fetchMotionAnalysis();
  }, [currentVideo.id]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'KeyS') {
        setComparisonMode(m => m === 'split' ? '3d_only' : 'split');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090f] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={updateSettings}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onStartExport={() => setIsExportModalOpen(true)}
        currentVideoTitle={currentVideo.title}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0f172a] border border-cyan-400/40 text-cyan-200 text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col items-center">
        {/* Gemini AI Cinematic Intelligence Banner */}
        {geminiAnalysis && (
          <div className="w-full max-w-4xl mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0e1222] border border-cyan-500/20 flex items-start gap-2.5">
            <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-white tracking-tight">
                <span>AI CapCut Director: {currentVideo.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                  MOCAP LOCKED
                </span>
                {currentUser.tier === 'free' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                    KUOTA GRATIS: 5s
                  </span>
                )}
              </div>
              <p className="text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                {geminiAnalysis.analysis} {geminiAnalysis.cinematicNotes}
              </p>
            </div>
          </div>
        )}

        {/* Viewport wrapper (Optional Phone Mockup Bezel) */}
        <div className={`w-full transition-all duration-300 flex justify-center ${
          isMobileFrame 
            ? 'max-w-[390px] p-3 rounded-[48px] bg-[#121629] border-4 border-[#242b46] shadow-[0_0_60px_rgba(0,240,255,0.15)] my-2' 
            : 'max-w-4xl'
        }`}>
          {isMobileFrame && (
            <div className="w-full flex items-center justify-center pb-2">
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
              </div>
            </div>
          )}

          <div className="w-full flex flex-col items-center">
            {/* Viewport Canvas with Split-Screen & Video Player */}
            <ViewportPlayer
              currentVideo={currentVideo}
              customVideoUrl={customVideoUrl}
              activeStyle={activeStyle}
              settings={settings}
              comparisonMode={comparisonMode}
              onChangeComparisonMode={setComparisonMode}
              showDetectionHUD={showDetectionHUD}
              onToggleDetectionHUD={() => setShowDetectionHUD(!showDetectionHUD)}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onMotionUpdate={setMotionData}
              canvasRef={canvasRef}
              videoRef={videoRef}
            />

            {/* Human Detection & Mocap Telemetry */}
            <HumanTrackingPanel
              motion={motionData}
              activeStyle={activeStyle}
            />

            {/* 3D Style & Shader Selector */}
            <StyleSelector
              activeStyle={activeStyle}
              onSelectStyle={setActiveStyle}
              settings={settings}
              onUpdateSettings={updateSettings}
            />

            {/* Multi-Track Timeline with 5s Free Limit Barrier */}
            <TimelineEditor
              currentVideo={currentVideo}
              currentTime={currentTime}
              duration={currentVideo.duration || 6}
              onSeek={(t) => {
                if (videoRef.current) videoRef.current.currentTime = t;
                setCurrentTime(t);
              }}
              activeStyle={activeStyle}
              currentUser={currentUser}
              onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Video Source Picker Modal */}
      <VideoSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelectSampleVideo={(v) => {
          setCustomVideoUrl(null);
          setCurrentVideo(v);
          setCurrentTime(0);
        }}
        onUploadCustomVideo={(file, url) => {
          setCustomVideoUrl(url);
          setCurrentVideo({
            id: `custom_${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            subtitle: 'Video Kustom Pengguna',
            category: 'action',
            duration: 6.5,
            fps: 30,
            thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
            motionDescription: 'Deteksi subjek manusia otomatis dengan pelacakan kontur dan sendi tubuh.',
            defaultPoseType: 'custom'
          });
          setCurrentTime(0);
        }}
        currentVideoId={currentVideo.id}
      />

      {/* Export / Headless MetaHuman Render Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentVideo={currentVideo}
        customVideoUrl={customVideoUrl}
        activeStyle={activeStyle}
        settings={settings}
        currentUser={currentUser}
        onOpenSubscriptionModal={() => {
          setIsExportModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
      />

      {/* User Auth Modal (Google & Email) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Digital Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentUser={currentUser}
        transactions={transactions}
        onUserChange={setCurrentUser}
        onTransactionsChange={setTransactions}
        onOpenCheckout={(item) => {
          setIsWalletModalOpen(false);
          setCheckoutItem(item);
          setIsCheckoutModalOpen(true);
        }}
        onOpenSubscriptionModal={() => {
          setIsWalletModalOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
      />

      {/* Subscription Plans Modal (5s vs 3 Menit) */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onOpenCheckout={(item) => {
          setIsSubscriptionModalOpen(false);
          setCheckoutItem(item);
          setIsCheckoutModalOpen(true);
        }}
        onPayWithWallet={handlePayWithWallet}
      />

      {/* Midtrans Snap & QRIS Checkout Simulator */}
      <PaymentCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        checkoutItem={checkoutItem}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}