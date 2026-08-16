import { useState, useEffect } from "react";
import { Member, LotteryResult, FundSettings, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency } from "../utils/jalali";
import { sendTelegramMessage, sendTelegramVideo, formatTelegramMessage, DEFAULT_TELEGRAM_TEMPLATE } from "../utils/telegram";
import { generateLotteryVideo } from "../utils/lotteryVideoRecorder";
import { 
  Play, 
  Sparkles, 
  Trophy, 
  Shuffle, 
  Award, 
  CheckCircle, 
  Info, 
  UserCheck, 
  ShieldAlert, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  UserMinus, 
  UserPlus, 
  Video, 
  Download, 
  Film, 
  Users, 
  Check, 
  X,
  History,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LotteryDrawProps {
  members: Member[];
  settings: FundSettings;
  lotteries?: LotteryResult[];
  onDrawSuccess: (
    winnerId: string, 
    method: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual", 
    loanType: "main" | "emergency", 
    customAmount?: number, 
    customWinnerDate?: string
  ) => void;
  onUndoLottery?: (lotteryId: string) => void;
  isDrawingActive: boolean;
  setIsDrawingActive: (val: boolean) => void;
  accumulatedSavingsPool: number;
  onToggleApplyForLoan?: (memberId: string, type: "main" | "emergency") => void;
}

export default function LotteryDraw({
  members,
  settings,
  lotteries = [],
  onDrawSuccess,
  onUndoLottery,
  isDrawingActive,
  setIsDrawingActive,
  accumulatedSavingsPool,
  onToggleApplyForLoan
}: LotteryDrawProps) {
  const [loanType, setLoanType] = useState<"main" | "emergency">("main");
  const [drawMethod, setDrawMethod] = useState<"random" | "weighted" | "manual">("random");
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [customEmergencyAmount, setCustomEmergencyAmount] = useState<number>(2000000);

  // Excluded members for this specific draw session
  const [excludedMemberIds, setExcludedMemberIds] = useState<string[]>([]);

  // Simulation state
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState<number>(0);
  const [simulationWinnerName, setSimulationWinnerName] = useState<string>("");
  const [hasFinishedDrawing, setHasFinishedDrawing] = useState<boolean>(false);

  // Win customization editable fields
  const [customWinDate, setCustomWinDate] = useState<string>("");
  const [customPayoutAmount, setCustomPayoutAmount] = useState<number>(0);

  // Telegram text message status
  const [telegramSendStatus, setTelegramSendStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  // Video recording & generation state
  const [videoState, setVideoState] = useState<{
    isGenerating: boolean;
    progress: number;
    videoBlob: Blob | null;
    videoUrl: string | null;
    fileName: string | null;
    error?: string;
  }>({
    isGenerating: false,
    progress: 0,
    videoBlob: null,
    videoUrl: null,
    fileName: null
  });

  // Telegram Video message status
  const [telegramVideoStatus, setTelegramVideoStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  // Show / hide history drawer
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Candidates filtering logic
  const unwonMembers = members.filter(m => !m.hasWon);

  // Main loan applicants sorted chronologically by request submission time
  const mainApplicantsSorted = members
    .filter(m => !m.hasWon && m.isAppliedForLoan)
    .sort((a, b) => (a.loanRequestTime || 0) - (b.loanRequestTime || 0));

  // Emergency loan applicants sorted chronologically by request submission time
  const emergencyApplicantsSorted = members
    .filter(m => m.isAppliedForEmergency)
    .sort((a, b) => (a.emergencyLoanRequestTime || 0) - (b.emergencyLoanRequestTime || 0));

  // Determine eligible candidates before exclusion
  let eligibleCandidates: Member[] = [];
  if (loanType === "main") {
    if (drawMethod === "random" || drawMethod === "weighted") {
      eligibleCandidates = unwonMembers;
    } else {
      eligibleCandidates = mainApplicantsSorted.length > 0 ? mainApplicantsSorted : unwonMembers;
    }
  } else {
    // Emergency loan
    eligibleCandidates = emergencyApplicantsSorted.length > 0 ? emergencyApplicantsSorted : members;
  }

  // Active candidates (filtering out excluded members)
  const activeCandidates = eligibleCandidates.filter(m => !excludedMemberIds.includes(m.id));

  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  const totalPoolAmount = loanType === "main" ? (members.length * settings.monthlyAmount) : customEmergencyAmount;

  // Toggle member exclusion
  const handleToggleExcludeMember = (memberId: string) => {
    if (isDrawingActive || hasFinishedDrawing) return;
    setExcludedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  // Reset selected candidates when loan type changes or is reset
  useEffect(() => {
    setSelectedWinnerId(null);
    setHasFinishedDrawing(false);
    setVideoState({ isGenerating: false, progress: 0, videoBlob: null, videoUrl: null, fileName: null });
    setTelegramSendStatus({ loading: false });
    setTelegramVideoStatus({ loading: false });
  }, [loanType, drawMethod]);

  // Set default values when drawing is finished and a winner is chosen
  useEffect(() => {
    if (hasFinishedDrawing && selectedWinnerId) {
      const currentMonthIndexStr = String(settings.currentMonthIndex + 1).padStart(2, '0');
      const dayStr = String(settings.lotteryDayOfMonth || 3).padStart(2, '0');
      setCustomWinDate(`${settings.currentYear}/${currentMonthIndexStr}/${dayStr}`);
      setCustomPayoutAmount(totalPoolAmount);
    }
  }, [hasFinishedDrawing, selectedWinnerId, totalPoolAmount, settings]);

  // Calculate probabilities for candidate view
  const calculatedProbabilities = (() => {
    if (activeCandidates.length === 0) return [];
    
    if (drawMethod === "manual") {
      return activeCandidates.map(m => ({ ...m, chance: 0 }));
    }

    if (drawMethod === "random") {
      const equalChance = 100 / activeCandidates.length;
      return activeCandidates.map(m => ({
        ...m,
        chance: equalChance
      }));
    } else {
      // Weighted based on: 1000 + score
      const membersWithWeights = activeCandidates.map(m => {
        const weight = Math.max(10, 1000 + m.score);
        return { ...m, weight };
      });
      const totalWeight = membersWithWeights.reduce((sum, m) => sum + m.weight, 0);
      return membersWithWeights.map(m => ({
        ...m,
        chance: (m.weight / totalWeight) * 100
      }));
    }
  })();

  // Trigger Video Generation
  const handleGenerateVideo = async (winnerName: string, winnerId: string) => {
    try {
      setVideoState(prev => ({ ...prev, isGenerating: true, progress: 0, error: undefined }));
      
      const res = await generateLotteryVideo(
        {
          fundName: settings.fundName,
          monthName: currentMonthName,
          candidates: activeCandidates.map(c => ({ id: c.id, name: c.name })),
          winnerName,
          winnerId,
          amountStr: formatCurrency(customPayoutAmount || totalPoolAmount),
          dateStr: customWinDate || `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
          loanTypeStr: loanType === "main" ? "تسهیلات وام قرض‌الحسنه ماهانه" : "وام پس‌انداز اضطراری"
        },
        (progress) => {
          setVideoState(prev => ({ ...prev, progress }));
        }
      );

      setVideoState({
        isGenerating: false,
        progress: 100,
        videoBlob: res.videoBlob,
        videoUrl: res.videoUrl,
        fileName: res.fileName
      });
    } catch (err: any) {
      console.error("Error creating video:", err);
      setVideoState(prev => ({
        ...prev,
        isGenerating: false,
        error: err?.message || "خطا در تولید فایل ویدیوی قرعه‌کشی"
      }));
    }
  };

  const handleStartDraw = () => {
    if (activeCandidates.length === 0 || isDrawingActive) return;

    // Reset video state
    setVideoState({ isGenerating: false, progress: 0, videoBlob: null, videoUrl: null, fileName: null });
    setTelegramSendStatus({ loading: false });
    setTelegramVideoStatus({ loading: false });

    if (drawMethod === "manual") {
      if (!selectedWinnerId) return;
      const winner = activeCandidates.find(m => m.id === selectedWinnerId);
      if (!winner) return;

      setSimulationWinnerName(winner.name);
      setHasFinishedDrawing(true);
      handleGenerateVideo(winner.name, winner.id);
      return;
    }

    setIsDrawingActive(true);
    setHasFinishedDrawing(false);
    setSelectedWinnerId(null);

    // 1. Determine the winner in advance
    let winner: Member;
    if (drawMethod === "random") {
      const idx = Math.floor(Math.random() * activeCandidates.length);
      winner = activeCandidates[idx];
    } else {
      // Weighted selection
      const membersWithWeights = activeCandidates.map(m => ({
        id: m.id,
        weight: Math.max(10, 1000 + m.score)
      }));
      const totalWeight = membersWithWeights.reduce((sum, m) => sum + m.weight, 0);
      let rand = Math.random() * totalWeight;
      
      let chosenId = membersWithWeights[0].id;
      for (const m of membersWithWeights) {
        if (rand < m.weight) {
          chosenId = m.id;
          break;
        }
        rand -= m.weight;
      }
      winner = activeCandidates.find(m => m.id === chosenId) || activeCandidates[0];
    }

    // 2. Cycling simulation
    let speed = 40;
    let ticks = 0;
    const maxTicks = 45;

    const interval = setInterval(() => {
      setCurrentCandidateIndex(prev => (prev + 1) % activeCandidates.length);
      ticks++;

      if (ticks > maxTicks - 15) speed += 30;
      if (ticks > maxTicks - 5) speed += 60;

      if (ticks >= maxTicks) {
        clearInterval(interval);
        
        const winnerIndex = activeCandidates.findIndex(m => m.id === winner.id);
        setCurrentCandidateIndex(winnerIndex >= 0 ? winnerIndex : 0);
        setSelectedWinnerId(winner.id);
        setSimulationWinnerName(winner.name);
        setHasFinishedDrawing(true);
        setIsDrawingActive(false);

        // Generate video in background
        handleGenerateVideo(winner.name, winner.id);
      }
    }, speed);
  };

  // Repeat / Redraw current turn
  const handleRepeatDraw = () => {
    if (isDrawingActive) return;
    setHasFinishedDrawing(false);
    setSelectedWinnerId(null);
    setSimulationWinnerName("");
    setVideoState({ isGenerating: false, progress: 0, videoBlob: null, videoUrl: null, fileName: null });
    setTelegramSendStatus({ loading: false });
    setTelegramVideoStatus({ loading: false });
  };

  // Send Text Notification to Telegram
  const handleSendTelegramNotification = async (winnerNameOverride?: string) => {
    const winnerName = winnerNameOverride || simulationWinnerName;
    if (!winnerName) return;

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setTelegramSendStatus({
        loading: false,
        error: "توکن ربات تلگرام یا Chat ID تنظیم نشده است (در تب پیام‌رسانی یا تنظیمات وارد کنید)."
      });
      return;
    }

    setTelegramSendStatus({ loading: true });

    const msgText = formatTelegramMessage(
      settings.telegramMessageTemplate || DEFAULT_TELEGRAM_TEMPLATE,
      {
        winnerName,
        fundName: settings.fundName,
        monthName: currentMonthName,
        amountStr: formatCurrency(customPayoutAmount || totalPoolAmount),
        dateStr: customWinDate || `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
        loanTypeStr: loanType === "main" ? "وام اصلی (قرعه‌کشی دوره‌ای)" : "وام ضروری پس‌انداز"
      }
    );

    const res = await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, msgText);
    if (res.success) {
      setTelegramSendStatus({ loading: false, success: true });
    } else {
      setTelegramSendStatus({ loading: false, error: res.error || "خطا در ارسال پیام تلگرام" });
    }
  };

  // Send Video directly to Telegram Group
  const handleSendTelegramVideo = async () => {
    if (!videoState.videoBlob) {
      alert("ابتدا ویدیوی قرعه‌کشی باید تولید و آماده شود.");
      return;
    }

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setTelegramVideoStatus({
        loading: false,
        error: "توکن ربات تلگرام یا Chat ID گروه تنظیم نشده است."
      });
      return;
    }

    setTelegramVideoStatus({ loading: true });

    const caption = `🎬 <b>ویدیوی قرعه‌کشی وام قرض‌الحسنه ${settings.fundName}</b>\n` +
      `🏆 <b>برنده این دوره:</b> ${simulationWinnerName}\n` +
      `📅 <b>ماه:</b> ${currentMonthName}\n` +
      `💰 <b>مبلغ وام:</b> ${formatCurrency(customPayoutAmount || totalPoolAmount)}\n\n` +
      `🎉 با آرزوی برکت و بهترین‌ها برای برنده گرامی! ✨`;

    const res = await sendTelegramVideo(
      settings.telegramBotToken,
      settings.telegramChatId,
      videoState.videoBlob,
      caption,
      videoState.fileName || "lottery-draw.webm"
    );

    if (res.success) {
      setTelegramVideoStatus({ loading: false, success: true });
    } else {
      setTelegramVideoStatus({ loading: false, error: res.error || "خطا در ارسال ویدیو به تلگرام" });
    }
  };

  // Final confirmation to register the winner in the database
  const handleRegisterWinner = async () => {
    if (selectedWinnerId) {
      let finalMethod: any = drawMethod;
      if (loanType === "emergency") {
        finalMethod = drawMethod === "manual" ? "emergency_manual" : "emergency_random";
      }

      // Auto send text notification if enabled
      if (settings.enableTelegramNotification && settings.telegramBotToken && settings.telegramChatId) {
        await handleSendTelegramNotification(simulationWinnerName);
      }

      onDrawSuccess(selectedWinnerId, finalMethod, loanType, customPayoutAmount || totalPoolAmount, customWinDate);
      setSelectedWinnerId(null);
      setHasFinishedDrawing(false);
      setVideoState({ isGenerating: false, progress: 0, videoBlob: null, videoUrl: null, fileName: null });
    }
  };

  // If there are no members in fund
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-slate-450 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">هیچ عضوی در صندوق تعریف نشده است</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          برای تخصیص وام ابتدا باید تعدادی عضو در پنل مدیریت اضافه کنید.
        </p>
      </div>
    );
  }

  // If drawing regular loan but all members have already won
  const allMainWinners = members.filter(m => !m.hasWon).length === 0;
  if (loanType === "main" && allMainWinners) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm" id="lottery-draw-completed">
        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <Award className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-slate-800 mb-2">چرخه وام اصلی صندوق به اتمام رسید!</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-4">
          تمامی اعضای فعال در این دوره حداقل یک بار تسهیلات واگذاری را دریافت کرده‌اند.
        </p>
        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 max-w-xs mx-auto text-right mb-4">
          <p className="text-[11px] font-bold text-blue-900 mb-1">💡 امکان فعال‌سازی قرعه وام‌های ضروری</p>
          <p className="text-[10px] text-blue-800 leading-relaxed">
            مبلغ پس‌اندازهای پرداخت‌شده به ارزش <b>{formatCurrency(accumulatedSavingsPool)}</b> آماده برداشت جهت تامین سرمایه وام‌های پس‌آنداز اضطراری می‌باشد.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setLoanType("emergency")}
            className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm"
          >
            ورود به قرعه‌کشی وام‌های ضروری (پس‌انداز)
          </button>
          {lotteries.length > 0 && onUndoLottery && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>مشاهده و بازنشانی قرعه‌های گذشته</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden space-y-6" id="lottery-draw-panel">
      
      {/* Upper Tab: Choose loan type & Quick History */}
      <div className="flex flex-wrap gap-3 pb-4 border-b border-slate-200 items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>سامانه واگذاری و قرعه‌کشی تسهیلات {settings.fundName}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">تخصیص نوبتی وام اصلی یا پرداخت وام ضروری از محل پس‌انداز</p>
        </div>

        <div className="flex items-center gap-2">
          {lotteries.length > 0 && onUndoLottery && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200"
              title="مشاهده تاریخچه و امکان تکرار یا لغو قرعه‌های ثبت‌شده"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>سوابق و تکرار قرعه‌های قبل ({toPersianDigits(lotteries.length)})</span>
            </button>
          )}

          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex gap-1">
            <button
              onClick={() => { setLoanType("main"); }}
              disabled={isDrawingActive}
              className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all cursor-pointer ${
                loanType === "main" ? "bg-white text-teal-900 shadow-xs border border-slate-200 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              وام اصلی نوبتی
            </button>
            <button
              onClick={() => { setLoanType("emergency"); }}
              disabled={isDrawingActive}
              className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all cursor-pointer ${
                loanType === "emergency" ? "bg-white text-blue-950 shadow-xs border border-slate-200 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              وام ضروری پس‌انداز
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Right Section - Configurations & Member Exclusion (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main info header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded border inline-block ${
                loanType === "main" ? "bg-teal-50 text-teal-850 border-teal-100" : "bg-blue-50 text-blue-950 border-blue-100"
              }`}>
                {loanType === "main" ? `تعهد وام دورۀ ${currentMonthName}` : "طرح برداشت پس‌انداز گنجینه"}
              </span>

              {loanType === "main" && (
                <span className="text-[10px] text-slate-500 font-bold">
                  {toPersianDigits(activeCandidates.length)} عضو حاضر در قرعه
                  {excludedMemberIds.length > 0 && ` (${toPersianDigits(excludedMemberIds.length)} عضو حذف‌شده)`}
                </span>
              )}
            </div>

            {loanType === "main" ? (
              drawMethod === "random" ? (
                <div className="bg-teal-50/80 text-teal-900 p-3 rounded-xl text-[11px] border border-teal-200 leading-relaxed font-sans space-y-1">
                  <p className="font-black flex items-center justify-between">
                    <span>🎲 <b>قرعه ساده (شانس کاملاً برابر):</b></span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono">
                      شانس هر عضو: {activeCandidates.length > 0 ? toPersianDigits((100 / activeCandidates.length).toFixed(1)) : 0}٪
                    </span>
                  </p>
                  <p className="text-[10.5px] text-teal-800">
                    تمامی اعضای برنده نشده با شانس مساوی در قرعه شرکت می‌کنند. شما می‌توانید اعضایی که در این ماه مایل به تعویق یا انصراف موقت هستند را از لیست پایین حذف کنید.
                  </p>
                </div>
              ) : drawMethod === "weighted" ? (
                <div className="bg-amber-50/80 text-amber-900 p-3 rounded-xl text-[11px] border border-amber-200 leading-relaxed font-sans space-y-1">
                  <p className="font-black">⚖️ <b>قرعه بر اساس امتیاز خوش‌حسابی:</b></p>
                  <p className="text-[10.5px] text-amber-800">
                    اعضای برنده نشده بر مبنای امتیاز تعجیل و تاخیر پرداخت فیش، ضریب شانس متفاوتی برای برنده شدن در این قرعه دارند.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-100 text-slate-800 p-3 rounded-xl text-[11px] border border-slate-250 leading-relaxed font-sans space-y-1">
                  <p className="font-black">🎯 <b>واگذاری و انتخاب مستقیم وام (با حفظ اولویت زمانی):</b></p>
                  <p className="text-[10.5px] text-slate-600">
                    درخواست‌ها بر اساس زمان ثبت مرتب شده‌اند. می‌توانید عضو مورد نظر را مستقیماً انتخاب کرده و وام را تخصیص دهید.
                  </p>
                </div>
              )
            ) : (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-[11px] border border-blue-150 leading-relaxed font-sans space-y-2">
                <p>
                  💎 <b>تسهیلات ضروری:</b> در این بخش ادمین می‌تواند از بین متقاضیان وام ضروری بر اساس زمان ثبت، یک عضو را انتخاب کند.
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-slate-500">موجودی گاوصندوق پس‌انداز:</span>
                  <b className="font-extrabold text-blue-900">{formatCurrency(accumulatedSavingsPool)}</b>
                </div>
              </div>
            )}
          </div>

          {/* Configuration of custom emergency loan amount */}
          {loanType === "emergency" && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="text-[11px] font-bold text-slate-600 block">مبلغ مصوب وام ضروری پرداختی:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customEmergencyAmount}
                  disabled={isDrawingActive || hasFinishedDrawing}
                  onChange={(e) => setCustomEmergencyAmount(Number(e.target.value))}
                  className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                  placeholder="مبلغ به تومان"
                />
                <span className="bg-slate-200 px-3 py-2 rounded text-[10px] font-bold text-slate-600 flex items-center justify-center">تومان</span>
              </div>
              <p className="text-[9px] text-slate-400">پیش‌فرض ۲,۰۰۰,۰۰۰ تومان می‌باشد و بستگی به موجودی دارد.</p>
            </div>
          )}

          {/* Method Selection: Random, Weighted, Manual */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">شیوه انتخاب برگزیده تسهیلات:</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("random")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  drawMethod === "random" ? "bg-white text-teal-900 shadow-xs border border-slate-200 font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                قرعه ساده (شانس برابر)
              </button>
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("weighted")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  drawMethod === "weighted" ? "bg-white text-teal-900 shadow-xs border border-slate-200 font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                قرعه بر اساس امتیاز
              </button>
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("manual")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  drawMethod === "manual" ? "bg-white text-teal-900 shadow-xs border border-slate-200 font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                انتخاب مستقیم
              </button>
            </div>
          </div>

          {/* CANDIDATE EXCLUSION & PROBABILITY LIST (FOR RANDOM & WEIGHTED) */}
          {drawMethod !== "manual" && (
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-700" />
                    <span>فهرست اعضای حاضر در قرعه‌کشی این ماه</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    تیک هر عضوی را که نمی‌خواهید در این ماه در قرعه باشد بردارید (حذف موقت از قرعه این ماه).
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setExcludedMemberIds([])}
                    disabled={isDrawingActive || hasFinishedDrawing || excludedMemberIds.length === 0}
                    className="px-2 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-teal-800 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all"
                  >
                    انتخاب همه ({toPersianDigits(eligibleCandidates.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcludedMemberIds(eligibleCandidates.map(m => m.id))}
                    disabled={isDrawingActive || hasFinishedDrawing || excludedMemberIds.length === eligibleCandidates.length}
                    className="px-2 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all"
                  >
                    عدم انتخاب همه
                  </button>
                </div>
              </div>

              {eligibleCandidates.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {eligibleCandidates.map((candidate, idx) => {
                    const isExcluded = excludedMemberIds.includes(candidate.id);
                    const isSelectedInSimulation = isDrawingActive && activeCandidates[currentCandidateIndex]?.id === candidate.id;
                    const calculatedProb = calculatedProbabilities.find(p => p.id === candidate.id)?.chance || 0;

                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleToggleExcludeMember(candidate.id)}
                        className={`p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                          isExcluded
                            ? "bg-slate-100/60 border-slate-200 opacity-60 text-slate-400"
                            : isSelectedInSimulation
                            ? "border-amber-500 bg-amber-50 text-amber-950 font-bold scale-[1.01] shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-teal-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Checkbox toggle */}
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            !isExcluded 
                              ? "bg-teal-700 border-teal-700 text-white" 
                              : "bg-white border-slate-300 text-transparent"
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${isExcluded ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {candidate.name}
                              </span>
                              {drawMethod === "weighted" && !isExcluded && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${candidate.score >= 0 ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-800'}`}>
                                  {candidate.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(candidate.score))} امتیاز
                                </span>
                              )}
                            </div>
                            {isExcluded && (
                              <span className="text-[9px] text-rose-600 font-bold block mt-0.5">
                                🚫 حذف موقت از قرعه‌کشی این ماه
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {!isExcluded ? (
                            <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                              {toPersianDigits(calculatedProb.toFixed(1))}٪ شانس
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                              غیرفعال
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs">
                  هیچ عضوی برای شرکت در قرعه یافت نشد.
                </div>
              )}

              {activeCandidates.length === 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تمامی اعضا از قرعه این ماه حذف شده‌اند! حداقل ۱ عضو باید تیک خورده باشد.</span>
                </div>
              )}
            </div>
          )}

          {/* Direct Selection Tab (manual) */}
          {drawMethod === "manual" && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 block">
                  لیست درخواست‌های ارسالی اعضا به ترتیب زمان ثبت:
                </label>
                <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-150">
                  {loanType === "main" ? toPersianDigits(mainApplicantsSorted.length) : toPersianDigits(emergencyApplicantsSorted.length)} درخواست فعال
                </span>
              </div>

              {(loanType === "main" ? mainApplicantsSorted : emergencyApplicantsSorted).length > 0 ? (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {(loanType === "main" ? mainApplicantsSorted : emergencyApplicantsSorted).map((applicant, idx) => {
                    const isSelected = selectedWinnerId === applicant.id;
                    const reqTime = loanType === "main" ? applicant.loanRequestTime : applicant.emergencyLoanRequestTime;
                    const formattedReqDate = reqTime ? toPersianDigits(new Date(reqTime).toLocaleDateString('fa-IR')) : null;

                    return (
                      <div
                        key={applicant.id}
                        onClick={() => !isDrawingActive && !hasFinishedDrawing && setSelectedWinnerId(applicant.id)}
                        className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-teal-50 border-teal-600 shadow-xs ring-1 ring-teal-600 text-teal-950 font-bold"
                            : "bg-white hover:bg-slate-100/70 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                            isSelected ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-850">{applicant.name}</span>
                              {formattedReqDate && (
                                <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.2 rounded border border-slate-150">
                                  ثبت: {formattedReqDate}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-teal-700 font-semibold mt-0.5">
                              {idx === 0 ? "🥇 اولویت ۱ (قدیمی‌ترین درخواست)" : idx === 1 ? "🥈 اولویت ۲ زمان ثبت" : `اولویت ${toPersianDigits(idx + 1)} زمان ثبت`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onToggleApplyForLoan && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDrawingActive && !hasFinishedDrawing) {
                                  if (confirm(`آیا از لغو درخواست وام ${applicant.name} اطمینان دارید؟`)) {
                                    onToggleApplyForLoan(applicant.id, loanType);
                                    if (selectedWinnerId === applicant.id) {
                                      setSelectedWinnerId(null);
                                    }
                                  }
                                }
                              }}
                              className="py-1 px-2 rounded-md text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                              title="لغو درخواست عضو"
                            >
                              لغو درخواست
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDrawingActive && !hasFinishedDrawing) {
                                setSelectedWinnerId(applicant.id);
                              }
                            }}
                            className={`py-1 px-2.5 rounded-md text-[10px] font-bold transition-all ${
                              isSelected
                                ? "bg-teal-800 text-white shadow-xs"
                                : "bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-900 border border-slate-200"
                            }`}
                          >
                            {isSelected ? "✓ انتخاب شد" : "انتخاب مستقیم"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium space-y-1">
                  <p className="font-bold">⚠️ هیچ عضوی در این دوره درخواست وام ثبت نکرده است.</p>
                  <p className="text-[10px] text-amber-800">
                    می‌توانید یکی از اعضا را مستقیماً از منوی کشویی زیر انتخاب فرمایید:
                  </p>
                </div>
              )}

              {/* Direct selection dropdown for all unwon members */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">
                  {(loanType === "main" ? mainApplicantsSorted : emergencyApplicantsSorted).length > 0 
                    ? "یا انتخاب مستقیم هر عضوی از لیست کل اعضای برنده نشده:" 
                    : "انتخاب عضو برنده از لیست کل اعضای برنده نشده:"}
                </label>
                <select
                  value={selectedWinnerId || ""}
                  onChange={(e) => setSelectedWinnerId(e.target.value)}
                  disabled={isDrawingActive || hasFinishedDrawing}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-sans"
                >
                  <option value="">-- برای واگذاری مستقیم انتخاب کنید --</option>
                  {unwonMembers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isAppliedForLoan ? "(درخواست‌کننده وام)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Left Section - Arena & Result Celebration with Video Center (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50/70 rounded-2xl border border-slate-200 relative min-h-[380px]">
          
          <AnimatePresence mode="wait">
            {!hasFinishedDrawing ? (
              <motion.div 
                key="drawing-arena"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full space-y-5"
              >
                {/* Visual Wheel / Drum container */}
                <div className={`w-40 h-40 bg-white border-4 border-dashed rounded-full mx-auto flex items-center justify-center relative shadow-md ${
                  isDrawingActive ? "border-amber-500 animate-[spin_8s_linear_infinite]" : "border-slate-300"
                }`}>
                  <div className="absolute inset-2 bg-gradient-to-b from-slate-50 to-slate-100 rounded-full flex flex-col items-center justify-center pointer-events-none">
                    {isDrawingActive ? (
                      <div className="text-center">
                        <Shuffle className="w-8 h-8 text-amber-500 mx-auto mb-1 animate-spin duration-1000" />
                        <span className="text-xs font-black text-amber-900 block truncate max-w-[110px] dir-rtl">
                          {activeCandidates[currentCandidateIndex]?.name}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Trophy className="w-9 h-9 text-amber-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 block font-normal">آماده قرعه‌کشی</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500">
                    مبلغ تخصیصی مصوب این وام:
                  </p>
                  <p className="text-2xl font-black text-teal-900 font-sans tracking-tight">
                    {formatCurrency(totalPoolAmount)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ({loanType === "main" ? "از پس‌انداز و قسط ثابت اقساط" : "برداشت مستقیم از صندوق پس‌انداز انباشته"})
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleStartDraw}
                    disabled={isDrawingActive || activeCandidates.length === 0 || (drawMethod === "manual" && !selectedWinnerId)}
                    className="w-full max-w-[240px] py-3 px-6 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-black rounded-xl shadow-md active:scale-95 transition-all text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-teal-200" />
                    <span>{drawMethod === "manual" ? "واگذاری مستقیم و اعلام برنده" : "شروع چرخش و قرعه‌کشی"}</span>
                  </button>

                  <p className="text-[10px] text-slate-400 font-sans">
                    💡 با شروع چرخش، ویدیوی انیمیشن برنده نیز به صورت خودکار ضبط می‌گردد.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="winner-display"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full space-y-4"
              >
                {/* Winner Badge & Header */}
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md relative">
                  <Trophy className="w-8 h-8" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -inset-1.5 border-2 border-amber-400 rounded-full"
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200 inline-block">
                    عضو برنده و واگذار تسهیلات 🎉
                  </span>
                  <h3 className="text-xl font-black text-slate-800 pt-1">{simulationWinnerName}</h3>
                  <p className="text-xs text-slate-500">مبارک باشد! فرآیند قرعه‌کشی با موفقیت انجام شد.</p>
                </div>

                {/* VIDEO PREVIEW & ACTIONS CARD */}
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 text-right space-y-3 font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Film className="w-4 h-4 text-amber-400" />
                      <span>ویدیوی انیمیشن قرعه‌کشی و برنده</span>
                    </div>
                    {videoState.isGenerating && (
                      <span className="text-[10px] text-teal-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>در حال ضبط {toPersianDigits(videoState.progress)}٪</span>
                      </span>
                    )}
                  </div>

                  {/* Video Player or Generator progress */}
                  {videoState.videoUrl ? (
                    <div className="space-y-2">
                      <video 
                        src={videoState.videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        playsInline
                        className="w-full max-h-48 rounded-lg bg-black border border-slate-700 shadow-inner object-contain"
                      />
                      
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Download Video Button */}
                        <a
                          href={videoState.videoUrl}
                          download={videoState.fileName || `lottery-${simulationWinnerName}.webm`}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all border border-slate-700 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-300" />
                          <span>دانلود ویدیو</span>
                        </a>

                        {/* Send Video to Telegram Button */}
                        <button
                          type="button"
                          onClick={handleSendTelegramVideo}
                          disabled={telegramVideoStatus.loading}
                          className="py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          {telegramVideoStatus.loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>ارسال ویدیو به تلگرام</span>
                        </button>
                      </div>
                    </div>
                  ) : videoState.isGenerating ? (
                    <div className="py-6 text-center space-y-2">
                      <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-300">در حال تولید ویدیوی انیمیشن قرعه‌کشی...</p>
                      <div className="w-48 bg-slate-800 h-1.5 rounded-full mx-auto overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${videoState.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerateVideo(simulationWinnerName, selectedWinnerId || "")}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>تولید ویدیوی قرعه‌کشی</span>
                    </button>
                  )}

                  {telegramVideoStatus.success && (
                    <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 p-2 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>ویدیوی قرعه‌کشی با موفقیت به گروه تلگرام ارسال شد! 🚀</span>
                    </p>
                  )}

                  {telegramVideoStatus.error && (
                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-950/60 p-2 rounded border border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{telegramVideoStatus.error}</span>
                    </p>
                  )}
                </div>

                {/* Amount and Win Date fine-tuning */}
                <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-right font-sans space-y-2.5 shadow-inner">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">مبلغ وام واریزی (تومان):</label>
                    <input 
                      type="number"
                      value={customPayoutAmount}
                      onChange={(e) => setCustomPayoutAmount(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold bg-white focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">تاریخ پرداخت (شمسی):</label>
                    <input 
                      type="text"
                      value={customWinDate}
                      onChange={(e) => setCustomWinDate(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs text-center font-bold bg-white focus:outline-none focus:border-teal-700"
                      placeholder="۱۴۰۵/۰۳/۰۵"
                    />
                  </div>
                </div>

                {/* Send text message to Telegram Group */}
                <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 text-right font-sans space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span>ارسال متن تبریک به تلگرام</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendTelegramNotification()}
                      disabled={telegramSendStatus.loading}
                      className="py-1 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    >
                      {telegramSendStatus.loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>ارسال متن</span>
                    </button>
                  </div>

                  {telegramSendStatus.success && (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>پیام متنی با موفقیت به گروه تلگرام ارسال شد!</span>
                    </p>
                  )}

                  {telegramSendStatus.error && (
                    <p className="text-[10px] text-rose-700 font-bold flex items-center gap-1 bg-rose-50 p-1.5 rounded border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{telegramSendStatus.error}</span>
                    </p>
                  )}
                </div>

                {/* Action Buttons: Confirm Winner & Repeat Draw */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={handleRegisterWinner}
                    className="flex-1 py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-200" />
                    <span>ثبت نهایی و واگذاری تسهیلات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRepeatDraw}
                    className="py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    title="تکرار قرعه‌کشی بدون ثبت این برنده"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>تکرار قرعه‌کشی (قرعه مجدد)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* MODAL: LOTTERY HISTORY & ROLLBACK/REPEAT PAST DRAWS */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800">تاریخچه قرعه‌کشی‌ها و امکان تکرار / لغو</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              در صورتی که نیاز دارید یکی از قرعه‌کشی‌های گذشته را لغو و مجدداً تکرار فرمایید، می‌توانید روی دکمه «لغو و تکرار قرعه» آن ماه کلیک کنید تا وضعیت عضو به حالت برنده نشده بازگردد.
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {lotteries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  هنوز هیچ قرعه‌کشی ثبت نشده است.
                </div>
              ) : (
                lotteries.slice().reverse().map((lot) => (
                  <div
                    key={lot.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shadow-2xs hover:bg-white transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-800">{lot.winnerName}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          lot.loanType === "emergency" ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"
                        }`}>
                          {lot.loanType === "emergency" ? "وام ضروری" : "وام اصلی"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>ماه: {lot.monthName}</span>
                        <span>•</span>
                        <span>تاریخ: {lot.drawDateShamsi}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-600 font-mono">{formatCurrency(lot.totalPoolAmount)}</span>
                      </div>
                    </div>

                    {onUndoLottery && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`آیا از لغو قرعه‌کشی ماه ${lot.monthName} و بازنشانی وضعیت ${lot.winnerName} به منظور تکرار قرعه‌کشی اطمینان دارید؟`)) {
                            onUndoLottery(lot.id);
                            setShowHistoryModal(false);
                          }
                        }}
                        className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        title="لغو این قرعه و امکان تکرار مجدد آن"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-700" />
                        <span>لغو و تکرار قرعه</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
