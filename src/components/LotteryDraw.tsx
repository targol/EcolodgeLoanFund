import { useState, useEffect } from "react";
import { Member, LotteryResult, FundSettings, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency } from "../utils/jalali";
import { sendTelegramMessage, formatTelegramMessage, DEFAULT_TELEGRAM_TEMPLATE } from "../utils/telegram";
import { Play, Sparkles, Trophy, Shuffle, Award, CheckCircle, Info, UserCheck, ShieldAlert, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LotteryDrawProps {
  members: Member[];
  settings: FundSettings;
  onDrawSuccess: (winnerId: string, method: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual", loanType: "main" | "emergency", customAmount?: number, customWinnerDate?: string) => void;
  isDrawingActive: boolean;
  setIsDrawingActive: (val: boolean) => void;
  accumulatedSavingsPool: number;
  onToggleApplyForLoan?: (memberId: string, type: "main" | "emergency") => void;
}

export default function LotteryDraw({
  members,
  settings,
  onDrawSuccess,
  isDrawingActive,
  setIsDrawingActive,
  accumulatedSavingsPool,
  onToggleApplyForLoan
}: LotteryDrawProps) {
  const [loanType, setLoanType] = useState<"main" | "emergency">("main");
  const [drawMethod, setDrawMethod] = useState<"random" | "weighted" | "manual">("random");
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [customEmergencyAmount, setCustomEmergencyAmount] = useState<number>(2000050);

  // Simulation state
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState<number>(0);
  const [simulationWinnerName, setSimulationWinnerName] = useState<string>("");
  const [hasFinishedDrawing, setHasFinishedDrawing] = useState<boolean>(false);

  // Win customization editable fields
  const [customWinDate, setCustomWinDate] = useState<string>("");
  const [customPayoutAmount, setCustomPayoutAmount] = useState<number>(0);

  // Telegram sending state
  const [telegramSendStatus, setTelegramSendStatus] = useState<{ loading: boolean; success?: boolean; error?: string }>({ loading: false });

  const handleSendTelegramNotification = async (winnerNameOverride?: string) => {
    const winnerName = winnerNameOverride || simulationWinnerName;
    if (!winnerName) return;

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setTelegramSendStatus({
        loading: false,
        error: "توکن ربات تلگرام یا Chat ID تنظیم نشده است (در تب تنظیمات پنل مدیریت وارد کنید)."
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

  // Determine active candidates based on selected draw method and loan type
  let activeCandidates: Member[] = [];
  if (loanType === "main") {
    if (drawMethod === "random" || drawMethod === "weighted") {
      // In Simple Draw ("قرعه ساده") and Weighted Draw ("قرعه بر اساس امتیاز"): ALL non-winners participate
      activeCandidates = unwonMembers;
    } else {
      // Direct Selection ("انتخاب مستقیم"): Sorted applicants first, or unwon members fallback
      activeCandidates = mainApplicantsSorted.length > 0 ? mainApplicantsSorted : unwonMembers;
    }
  } else {
    // Emergency loan
    activeCandidates = emergencyApplicantsSorted.length > 0 ? emergencyApplicantsSorted : members;
  }

  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  const totalPoolAmount = loanType === "main" ? (members.length * settings.monthlyAmount) : customEmergencyAmount;

  // Reset selected candidates when loan type changes or is finished
  useEffect(() => {
    setSelectedWinnerId(null);
    setHasFinishedDrawing(false);
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

  // Calculate probabilities for rendering a high quality sidebar list
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
      // Weighted based on: 1000 + score. Double safeguard so weight never goes negative (min weight = 10)
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

  const handleStartDraw = () => {
    if (activeCandidates.length === 0 || isDrawingActive) return;

    if (drawMethod === "manual") {
      if (!selectedWinnerId) return;
      const winner = activeCandidates.find(m => m.id === selectedWinnerId);
      if (!winner) return;

      setSimulationWinnerName(winner.name);
      setHasFinishedDrawing(true);
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
      }
    }, speed);
  };

  const handleRegisterWinner = async () => {
    if (selectedWinnerId) {
      let finalMethod: any = drawMethod;
      if (loanType === "emergency") {
        finalMethod = drawMethod === "manual" ? "emergency_manual" : "emergency_random";
      }

      // Auto send to telegram if configured
      if (settings.enableTelegramNotification && settings.telegramBotToken && settings.telegramChatId) {
        await handleSendTelegramNotification(simulationWinnerName);
      }

      onDrawSuccess(selectedWinnerId, finalMethod, loanType, customPayoutAmount || totalPoolAmount, customWinDate);
      setSelectedWinnerId(null);
      setHasFinishedDrawing(false);
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
            مبلغ پس‌اندازهای پرداخت‌شده به ارزش <b>{formatCurrency(accumulatedSavingsPool)}</b> آماده برداشت جهت تامین سرمایه وام‌های پس‌آنداز اضطراری می‌باشد. از دکمه زیر وام ضروری را فعال کنید.
          </p>
        </div>
        <button
          onClick={() => setLoanType("emergency")}
          className="py-2 px-5 bg-blue-600 text-white rounded font-bold text-xs"
        >
          ورود به قرعه‌کشی وام‌های ضروری (پس‌انداز)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden" id="lottery-draw-panel">
      
      {/* Upper Tab: Choose loan type */}
      <div className="flex flex-wrap gap-2 pb-5 mb-5 border-b border-slate-200/60 items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>سامانه واگذاری و تعیین تسهیلات دوره‌ای</span>
          </h3>
          <p className="text-[10px] text-slate-450 mt-1">تخصیص از محل تامین اقساط ثابت یا از بخش پس‌اندازهای گنجینه</p>
        </div>

        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex gap-1">
          <button
            onClick={() => { setLoanType("main"); }}
            disabled={isDrawingActive}
            className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all cursor-pointer ${
              loanType === "main" ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            بخش ثابت (وام اصلی نوبتی)
          </button>
          <button
            onClick={() => { setLoanType("emergency"); }}
            disabled={isDrawingActive}
            className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all cursor-pointer ${
              loanType === "emergency" ? "bg-white text-blue-950 shadow-sm border border-slate-200 font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            بخش پس‌انداز (وام ضروری اضطراری)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Right Section - Configurations */}
        <div className="space-y-5">
          {/* Main info header */}
          <div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded border inline-block ${
              loanType === "main" ? "bg-teal-50 text-teal-850 border-teal-100" : "bg-blue-50 text-blue-950 border-blue-100"
            }`}>
              {loanType === "main" ? `تعهد وام دورۀ ${currentMonthName}` : "طرح برداشت پس‌انداز گنجینه"}
            </span>

            {loanType === "main" ? (
              drawMethod === "random" ? (
                <div className="mt-3 bg-teal-50 text-teal-900 p-3 rounded-xl text-[11px] border border-teal-200 leading-relaxed font-sans space-y-1">
                  <p className="font-bold">🎲 <b>قرعه ساده (شانس برابر برای تمامی اعضا):</b></p>
                  <p className="text-[10.5px] text-teal-800">
                    در این تب تمامی <b>{toPersianDigits(unwonMembers.length)}</b> عضوی که تا این ماه برنده نشده‌اند با شانس کاملاً برابر (<b>{toPersianDigits((100 / (unwonMembers.length || 1)).toFixed(1))}٪</b>) نشان داده شده و امکان شرکت در قرعه‌کشی را دارند.
                  </p>
                </div>
              ) : drawMethod === "weighted" ? (
                <div className="mt-3 bg-amber-50 text-amber-900 p-3 rounded-xl text-[11px] border border-amber-200 leading-relaxed font-sans space-y-1">
                  <p className="font-bold">⚖️ <b>قرعه بر اساس امتیاز خوش‌حسابی:</b></p>
                  <p className="text-[10.5px] text-amber-800">
                    در این حالت تمامی اعضای برنده نشده بر اساس سوابق واریزی و امتیاز تعجیل/تاخیر، شانس بیشتری برای برنده شدن کسب می‌کنند.
                  </p>
                </div>
              ) : (
                <div className="mt-3 bg-slate-100 text-slate-800 p-3 rounded-xl text-[11px] border border-slate-250 leading-relaxed font-sans space-y-1">
                  <p className="font-bold">🎯 <b>واگذاری و انتخاب مستقیم وام (با حفظ اولویت زمانی):</b></p>
                  <p className="text-[10.5px] text-slate-600">
                    درخواست‌ها بر اساس زمان ثبت (قدیمی‌ترین در اولویت ۱) مرتب شده‌اند. اگر عضوی در این دوره انتخاب نشود، درخواست او با همان اولویت زمانی به صورت خودکار به ماه‌های بعد منتقل می‌شود.
                  </p>
                </div>
              )
            ) : (
              <div className="mt-3 bg-blue-50 text-blue-800 p-3 rounded-xl text-[11px] border border-blue-150 leading-relaxed font-sans space-y-2">
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
                  className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                  placeholder="مبلغ به تومان"
                />
                <span className="bg-slate-200 px-3 py-2 rounded text-[10px] font-bold text-slate-600 flex items-center justify-center">تومان</span>
              </div>
              <p className="text-[9px] text-slate-400">پیش‌فرض ۲,۰۰۰,۰۰۰ تومان می‌باشد و بستگی به موجودی دارد.</p>
            </div>
          )}

          {/* Methods Options: Random, Weighted, Manual */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-600 block">شیوه انتخاب برگزیده تسهیلات:</label>
              {drawMethod === "random" && (
                <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  پیش‌فرض: شانس برابر برای تمامی اعضا
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("random")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  drawMethod === "random" ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                قرعه ساده (شانس برابر)
              </button>
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("weighted")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  drawMethod === "weighted" ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                قرعه بر اساس امتیاز
              </button>
              <button
                type="button"
                onClick={() => !isDrawingActive && !hasFinishedDrawing && setDrawMethod("manual")}
                disabled={isDrawingActive || hasFinishedDrawing}
                className={`py-2 px-1 rounded text-[10px] font-bold transition-all text-center ${
                  drawMethod === "manual" ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                انتخاب مستقیم
              </button>
            </div>
          </div>

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
                            ? "bg-teal-50 border-teal-600 shadow-sm ring-1 ring-teal-600 text-teal-950 font-bold"
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

          {/* Probabilities preview table */}
          {drawMethod !== "manual" && activeCandidates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">شانس و سهم کاندیدهای قرعه‌کشی این راند:</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {calculatedProbabilities.map((candidate, idx) => {
                  const isSelectedInSimulation = isDrawingActive && idx === currentCandidateIndex;
                  return (
                    <div 
                      key={candidate.id}
                      className={`p-2 rounded border text-xs transition-all flex justify-between items-center ${
                        isSelectedInSimulation 
                          ? "border-amber-500 bg-amber-50 text-amber-950 font-bold scale-[1.01]"
                          : "border-slate-100 bg-slate-50/70 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center text-[9px] font-mono text-slate-500">{toPersianDigits(idx + 1)}</span>
                        <span>{candidate.name}</span>
                        {drawMethod === "weighted" && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${candidate.score >= 0 ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-800'}`}>
                            {candidate.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(candidate.score))} امتیاز
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="font-extrabold text-slate-650">{toPersianDigits(candidate.chance.toFixed(1))}%</span>
                        <span className="text-[9px] text-slate-400">شانس</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeCandidates.length === 0 && (
            <div className="bg-red-50 text-red-800 p-4 rounded text-xs border border-red-100">
              هیچ کاندیدایی برای واگذاری این نوع تسهیلات یافت نشد. برای وام‌های گنجینه پس‌انداز، اعضا باید ابتدا درخواست "وام ضروری" ثبت کنند.
            </div>
          )}
        </div>

        {/* Left Section - Render animation circle arena */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-xl border border-slate-200 relative min-h-[340px]">
          
          <AnimatePresence mode="wait">
            {!hasFinishedDrawing ? (
              <motion.div 
                key="drawing-arena"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full"
              >
                {/* Visual Wheel / Chamber container */}
                <div className={`w-36 h-36 bg-white border-4 border-dashed rounded-full mx-auto mb-6 flex items-center justify-center relative shadow-md ${
                  isDrawingActive ? "border-amber-500 animate-[spin_10s_linear_infinite]" : "border-slate-350"
                }`}>
                  <div className="absolute inset-1.5 bg-gradient-to-b from-slate-5 to-slate-50 rounded-full flex flex-col items-center justify-center pointer-events-none">
                    
                    {isDrawingActive ? (
                      <div className="text-center">
                        <Shuffle className="w-7 h-7 text-amber-500 mx-auto mb-1 animate-spin duration-1000" />
                        <span className="text-xs font-black text-amber-900 block truncate max-w-[100px] dir-rtl">
                          {activeCandidates[currentCandidateIndex]?.name}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 block font-normal">آماده واگذاری</span>
                      </div>
                    )}

                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    مبلغ تخصیصی مصوب این وام:
                  </p>
                  <p className="text-xl font-black text-teal-850 font-sans tracking-tight">
                    {formatCurrency(totalPoolAmount)}
                  </p>
                  <p className="text-[10px] text-slate-405">
                    ({loanType === "main" ? "از پس‌انداز و قسط ثابت اقساط" : "برداشت مستقیم از صندوق پس‌انداز انباشته"})
                  </p>
                </div>

                <div className="pt-5">
                  <button
                    onClick={handleStartDraw}
                    disabled={isDrawingActive || activeCandidates.length === 0 || (drawMethod === "manual" && !selectedWinnerId)}
                    className="w-full max-w-[210px] py-2.5 px-6 bg-teal-800 hover:bg-teal-905 disabled:opacity-50 text-white font-extrabold rounded-lg shadowactive:scale-95 transition-all text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-teal-100" />
                    <span>{drawMethod === "manual" ? "واگذاری مستقیم و اعلام برنده" : "شروع قرعه‌کشی و بارگذاری"}</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="winner-display"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full space-y-4"
              >
                <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md relative">
                  <Trophy className="w-10 h-10" />
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -inset-1.5 border-2 border-amber-400 rounded-full"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded border border-amber-100">
                    عضو برنده و واگذار تسهیلات 🎉
                  </span>
                  <h3 className="text-xl font-black text-slate-800 pt-2">{simulationWinnerName}</h3>
                  <p className="text-xs text-slate-400 py-1">مبارک باشد! فرآیند واگذاری در سیستم نهایی شد.</p>
                </div>

                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 max-w-xs mx-auto text-right font-sans space-y-3 shadow-inner">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">تایید نهایی مبلغ پرداخت وام (تومان):</label>
                    <input 
                      type="number"
                      value={customPayoutAmount}
                      onChange={(e) => setCustomPayoutAmount(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold bg-white focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">تعیین دقیق تاریخ فرضی پرداخت (شمسی):</label>
                    <input 
                      type="text"
                      value={customWinDate}
                      onChange={(e) => setCustomWinDate(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs text-center font-bold bg-white focus:outline-none focus:border-teal-700"
                      placeholder="۱۴۰۵/۰۳/۰۵"
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 text-center leading-tight">
                    {loanType === "emergency" ? "محل پرداخت با کسر از پس‌انداز انباشته" : "محل پرداخت بر مبنای اقساط ثابت نوبتی"}
                  </p>
                </div>

                <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 max-w-xs mx-auto text-right font-sans space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span>ارسال نتیجه به گروه تلگرام</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendTelegramNotification()}
                      disabled={telegramSendStatus.loading}
                      className="py-1 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {telegramSendStatus.loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>ارسال اکنون</span>
                    </button>
                  </div>

                  {telegramSendStatus.success && (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>نتیجه با موفقیت به گروه تلگرام ارسال شد!</span>
                    </p>
                  )}

                  {telegramSendStatus.error && (
                    <p className="text-[10px] text-rose-700 font-bold flex items-center gap-1 bg-rose-50 p-1.5 rounded border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{telegramSendStatus.error}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 max-w-[280px] mx-auto pt-2">
                  <button
                    onClick={handleRegisterWinner}
                    className="flex-1 py-2.5 px-4 bg-teal-850 hover:bg-teal-900 text-white font-extrabold rounded-lg text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>ثبت و بستن نوبت جاری</span>
                  </button>
                  {drawMethod !== "manual" && (
                    <button
                      onClick={() => { setHasFinishedDrawing(false); setSelectedWinnerId(null); setTelegramSendStatus({ loading: false }); }}
                      className="py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      تکرار نوبت
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
