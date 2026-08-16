import React, { useState } from "react";
import { Member, Payment, FundSettings, FundCycle, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency, calculatePaymentScore } from "../utils/jalali";
import { 
  User, CheckCircle, AlertCircle, Calendar, Sparkles, TrendingUp, Clock,
  Trophy, ArrowLeftRight, CreditCard, Award, ShieldAlert, Key, LogOut, Check, HelpCircle,
  Coins, Layers, Shield
} from "lucide-react";

interface MemberPanelProps {
  members: Member[];
  payments: Payment[];
  settings: FundSettings;
  cycles?: FundCycle[];
  onRecordPayment: (memberId: string, day: number) => void;
  onToggleApplyForLoan: (memberId: string, type: "main" | "emergency") => void;
}

export default function MemberPanel({
  members,
  payments,
  settings,
  cycles = [],
  onRecordPayment,
  onToggleApplyForLoan
}: MemberPanelProps) {
  // Active cycle determination
  const activeCycle = cycles.find(c => c.status === "active") || cycles[cycles.length - 1];
  const activeCycleMembers = activeCycle?.memberIds 
    ? members.filter(m => activeCycle.memberIds.includes(m.id)) 
    : members;

  // Session authentication state (stored locally in runtime state)
  const [sessionMemberId, setSessionMemberId] = useState<string | null>(null);
  const [typedPassword, setTypedPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [simulatedDay, setSimulatedDay] = useState<number>(3); // Default to day 3 payment
  const [historyTab, setHistoryTab] = useState<"deposits" | "withdrawals">("deposits");

  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionMemberId) {
      setLoginError("لطفاً حساب کاربری خود را انتخاب کنید.");
      return;
    }
    const targetMember = members.find(m => m.id === sessionMemberId);
    if (!targetMember) {
      setLoginError("عضو مورد نظر یافت نشد.");
      return;
    }
    if (targetMember.password !== typedPassword.trim()) {
      setLoginError("رمز عبور وارد شده نادرست است.");
      return;
    }

    setLoginError("");
    setTypedPassword("");
  };

  const handleLogout = () => {
    setSessionMemberId(null);
    setTypedPassword("");
    setLoginError("");
  };

  // If there are no members defined yet
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">هیچ عضوی یافت نشد</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          لطفاً ابتدا از بخش پنل ادمین، اعضای صندوق را با کلمه عبور دلخواه تعریف کنید.
        </p>
      </div>
    );
  }

  // CASE 1: NOT AUTHENTICATED -> Render clean login form
  if (!sessionMemberId || !members.some(m => m.id === sessionMemberId)) {
    // Default selection from active cycle members
    const activeId = activeCycleMembers.some(m => m.id === sessionMemberId) 
      ? sessionMemberId 
      : (activeCycleMembers[0]?.id || members[0]?.id || "");

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-md mx-auto my-4 font-sans" id="member-login-card">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-150 text-teal-800 flex items-center justify-center mx-auto mb-3">
            <Key className="w-5 h-5" />
          </div>
          <div className="inline-block px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-bold mb-2">
            {activeCycle ? activeCycle.title : `دوره ${toPersianDigits(settings.currentCycleNumber || 3)}`}
          </div>
          <h3 className="text-sm font-black text-slate-800">ورود به پنل کاربری اعضای {settings.fundName}</h3>
          <p className="text-[10px] text-slate-450 mt-1">تعهدات فردی، درخواست وام و دریافت فیش‌های ماهیانه</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-right">
          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded text-[11px] text-rose-700 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              انتخاب عضو از دوره فعال ({toPersianDigits(activeCycleMembers.length)} عضو):
            </label>
            <select
              value={activeId}
              onChange={(e) => {
                setSessionMemberId(e.target.value);
                setLoginError("");
              }}
              className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-bold focus:outline-none focus:border-teal-700"
            >
              <option value="">-- انتخاب نام کاربری عضو --</option>
              {activeCycleMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.isFoundingMember ? "⭐️ " : ""}{m.name} {m.isFoundingMember ? "(هیئت موسس)" : ""} ({toPersianDigits(m.currentCycleShares || 1)} سهم)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">کلمه عبور خود را وارد کنید:</label>
            <input
              type="password"
              placeholder="مثال: 123"
              value={typedPassword}
              onChange={(e) => { setTypedPassword(e.target.value); setLoginError(""); }}
              className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700"
            />
            <span className="text-[9px] text-slate-400 mt-1 block leading-tight">پروفایل‌های دمو به عنوان پیش‌فرض رمز عبورشان <b>123</b> است.</span>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-black rounded text-xs transition-colors cursor-pointer"
          >
            ورود ایمن به حساب کاربری
          </button>
        </form>
      </div>
    );
  }

  // CASE 2: AUTHENTICATED MEMBER -> Render personalized dashboard
  const activeMember = members.find(m => m.id === sessionMemberId)!;

  // Compute exact amounts based on member's shares
  const memberShares = activeCycle?.memberShares?.[activeMember.id] || activeMember.currentCycleShares || 1;
  const currentMonthlyInstallment = (activeCycle?.monthlyAmount || settings.monthlyAmount) * memberShares;
  const currentMonthlySavings = (activeCycle?.savingsAmount || settings.savingsAmount || 500000) * memberShares;
  const totalMonthlyCommitment = currentMonthlyInstallment + currentMonthlySavings;

  // Active member payments
  const memberPayments = payments.filter(p => p.memberId === activeMember.id);
  const currentMonthPayment = memberPayments.find(p => p.monthName === currentMonthName);
  const isPaidThisMonth = currentMonthPayment?.status === "paid";

  // Score simulation info
  let simulatedScoreCalculations = calculatePaymentScore(simulatedDay, totalMonthlyCommitment, settings.lotteryDayOfMonth);
  
  if (activeMember.hasWon) {
    simulatedScoreCalculations = {
      score: 0,
      description: "شما برنده تسهیلات هستید؛ واریزهای شما بازپرداخت سهم بوده و امتیاز خوش‌حسابی مجدد شامل آن نمی‌شود.",
      color: "text-teal-700 bg-teal-50"
    };
  }

  // Stats calculation
  const paidCount = memberPayments.filter(p => p.status === "paid").length;
  const earnedScores = memberPayments.reduce((acc, p) => acc + p.scoreDelta, 0);

  // Total active shares in cycle for main loan pool calculation
  const totalCycleShares = activeCycleMembers.reduce((sum, m) => sum + (m.currentCycleShares || 1), 0);
  const mainLoanReceivedAmount = activeMember.hasWon ? (totalCycleShares * (activeCycle?.monthlyAmount || settings.monthlyAmount)) : 0;

  return (
    <div className="space-y-6" id="member-panel-root">
      {/* Target Identity Panel with Logout */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-teal-850 text-white flex items-center justify-center font-bold text-xs animate-pulse">
            {activeMember.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 font-sans">خوش آمدید، {activeMember.name}</h4>
            <p className="text-[10px] text-slate-450 mt-0.5 font-sans">به حساب کاربری شخصی خود در {settings.fundName} متصل شده‌اید.</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از حساب</span>
        </button>
      </div>

      {/* Grid containing profile status & payment workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workspace Column 1 & 2: Main Dues Calculator & Payment Simulator */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-850" />
                <h4 className="text-sm font-black text-slate-800">وضعیت سهم و تعهدات پرداخت {currentMonthName}</h4>
              </div>
              <span className="text-[10px] font-sans font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded">
                موعد واریز: {toPersianDigits(settings.lotteryDayOfMonth)}ام هر ماه شمسی
              </span>
            </div>

            {isPaidThisMonth && currentMonthPayment ? (
              // Case A: Member is already PAID
              <div className="p-6 bg-teal-50/20 rounded-xl border border-teal-150 text-center space-y-4">
                <div className="w-11 h-11 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-black text-teal-950">قسط ماهیانه و تعهد پس‌انداز این ماه دریافت شد!</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    پرداختی شما ({toPersianDigits(memberShares)} سهم) به ارزش مجموع <b>{formatCurrency(totalMonthlyCommitment)}</b> در تاریخ {currentMonthPayment.paymentDateShamsi} (روز {toPersianDigits(currentMonthPayment.paymentDayShamsi)}ام ماه) در دفاتر صندوق به ثبت رسیده است.
                  </p>
                  <p className="text-[11px] text-slate-450 mt-1 font-mono">
                    (قسط وام قرض‌الحسنه: {formatCurrency(currentMonthlyInstallment)} + پس‌انداز صندوق طلا: {formatCurrency(currentMonthlySavings)})
                  </p>
                </div>
                
                <div className="inline-block px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm text-xs">
                  <span className="text-slate-500">امتیاز خوش‌حسابی واریز: </span>
                  <strong className={`font-mono text-sm ${currentMonthPayment.scoreDelta >= 0 ? 'text-teal-750 font-black' : 'text-rose-600'}`}>
                    {currentMonthPayment.scoreDelta >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(currentMonthPayment.scoreDelta))} امتیاز
                  </strong>
                </div>
              </div>
            ) : (
              // Case B: Member is UNPAID (Let them simulate or record self-payment)
              <div className="space-y-4" id="member-unpaid-workspace">
                <div className="p-4 bg-rose-50/40 rounded-lg border border-rose-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-rose-950">تعهد واریز این ماه باز است! ({toPersianDigits(memberShares)} سهم)</h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      حق قسط ماهیانه شما <b>{formatCurrency(currentMonthlyInstallment)}</b> به همراه اندوخته پس‌انداز طلا <b>{formatCurrency(currentMonthlySavings)}</b> است. مجموع تعهد قابل واریز: <b>{formatCurrency(totalMonthlyCommitment)}</b>
                    </p>
                  </div>
                </div>

                {/* Date Calendar Picker Grid & Score Predictor Widget */}
                <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-4 font-sans">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-705">روز واریز فیش را بر روی تقویم شمسی زیر انتخاب کنید:</span>
                    <span className="font-mono font-bold text-teal-700 text-xs shrink-0 bg-white px-2 py-1 rounded border border-slate-250">
                      روز {toPersianDigits(simulatedDay)} ام برج
                    </span>
                  </div>

                  {/* Shamsi Calendar Grid Selector for Members */}
                  <div className="grid grid-cols-7 gap-1 bg-white p-3 rounded-xl border border-slate-200 shadow-inner text-center font-sans">
                    {/* Weekdays */}
                    {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w, index) => (
                      <span key={index} className="text-[10px] text-slate-400 font-bold py-1">{w}</span>
                    ))}
                    {/* Month Days */}
                    {Array.from({ length: (settings.currentMonthIndex <= 5 ? 31 : (settings.currentMonthIndex <= 10 ? 30 : 29)) }, (_, idx) => {
                      const dayNum = idx + 1;
                      const isSelected = simulatedDay === dayNum;
                      const isEarly = dayNum <= settings.lotteryDayOfMonth;
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => setSimulatedDay(dayNum)}
                          className={`h-8 rounded text-xs font-mono font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                            isSelected 
                              ? "bg-teal-700 text-white font-black scale-105 shadow-sm border border-teal-850"
                              : isEarly
                                ? "bg-emerald-100 hover:bg-emerald-205 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                          }`}
                          title={isEarly ? `تعجیل خوش‌حسابی (روز ${dayNum})` : `تاخیر دیرکرد (روز ${dayNum})`}
                        >
                          <span>{toPersianDigits(dayNum)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* dynamic analysis chart */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Score multiplier forecast */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] text-slate-400">تغییر امتیاز خوش‌حسابی شما:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-black ${simulatedScoreCalculations.score >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                          {simulatedScoreCalculations.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(simulatedScoreCalculations.score))} امتیاز
                        </span>
                      </div>
                    </div>

                    {/* Deadline Status details */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center text-right">
                      <p className="text-[10px] text-slate-400">تعلق تراز زمانی قسط:</p>
                      <p className="text-[11px] font-black mt-1 text-slate-800 leading-tight">
                        {simulatedDay < settings.lotteryDayOfMonth 
                          ? `${toPersianDigits(settings.lotteryDayOfMonth - simulatedDay)} روز تعجیلِ مثبت (امتیاز برتر!)` 
                          : simulatedDay === settings.lotteryDayOfMonth 
                            ? "دقیقا روز موعد (ترازش بدون تاخیر)" 
                            : `${toPersianDigits(simulatedDay - settings.lotteryDayOfMonth)} روز تاخیر مستمر (کاهش دهنده شانس)`}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-slate-500 leading-relaxed">
                      {simulatedScoreCalculations.description}
                    </span>
                  </div>
                </div>

                {/* Record Button */}
                <button
                  type="button"
                  onClick={() => {
                    onRecordPayment(activeMember.id, simulatedDay);
                  }}
                  className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-lg text-xs shadow-md shadow-teal-700/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-teal-100" />
                  <span>ثبت و واریز قسط ماهیانه {formatCurrency(totalMonthlyCommitment)} ({toPersianDigits(memberShares)} سهم)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Member Profile Stats Summary Column */}
        <div className="space-y-6 font-sans">
          
          {/* Main profile Identity Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded bg-slate-105 flex items-center justify-center font-bold text-sm text-slate-700">
                {activeMember.isFoundingMember ? "⭐️" : "👤"}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800">{activeMember.name}</h4>
                  {activeMember.isFoundingMember && (
                    <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                      هیئت موسس
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-450 font-mono mt-0.5">{toPersianDigits(activeMember.phone)}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>امتیاز تراز خوش‌حسابی شما:</span>
                <strong className={`font-mono text-sm ${activeMember.score >= 0 ? 'text-teal-700 font-black' : 'text-rose-500'}`}>
                  {activeMember.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(activeMember.score))}
                </strong>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>تعداد سهم در دوره جاری:</span>
                <strong className="text-teal-800 font-black">
                  {toPersianDigits(memberShares)} سهم
                  {memberShares > 1 ? " (دوبرابر)" : ""}
                </strong>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>سوابق حضور در دوره‌ها:</span>
                <div className="flex gap-1">
                  {(activeMember.participatedCycles || [3]).map(cNum => (
                    <span 
                      key={cNum} 
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        cNum === (settings.currentCycleNumber || 3) ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      دوره {toPersianDigits(cNum)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>شناسه تاریخ شروع عضویت:</span>
                <strong className="font-mono text-slate-700">{activeMember.joinDateShamsi}</strong>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>تکلیف تسهیلات این دوره:</span>
                {activeMember.hasWon ? (
                  <span className="text-orange-950 bg-orange-50 border border-orange-100 text-[10px] px-2 py-0.5 rounded font-black">
                     برنده وام اصلی ({activeMember.winMonth})
                  </span>
                ) : (
                  <span className="text-teal-800 bg-teal-50 border border-teal-100 text-[10px] px-2 py-0.5 rounded font-black">
                    در انتظار قرعه‌کشی شانس
                  </span>
                )}
              </div>
            </div>

            {/* Gold Savings Badge for Member */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1 text-[11px]">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  پس‌انداز شما در صندوق طلا:
                </span>
                <span className="font-black text-amber-900 font-mono text-[11px]">
                  {formatCurrency(memberShares * (activeCycle?.savingsAmount || settings.savingsAmount || 500000) * paidCount)}
                </span>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                {memberShares > 1 ? `به ازای ${toPersianDigits(memberShares)} سهم شما، ` : ""}
                مبالغ پس‌انداز ماهانه در صندوق طلا سرمایه‌گذاری شده و تسویه/انتقال آن در پایان دوره به ارزش روز محاسبه می‌شود.
              </p>
            </div>
          </div>

          {/* LOAN APPLICATION CENTRE (صندوق درخواست وام) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 mt-4">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>پیش‌ثبت درخواست دریافت وام</span>
            </h4>
            <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
              در نوبت صندوق، ادمین برنده‌ها را براساس ارائه‌دهندگان تقاضا فیلتر می‌کند. با دکمه‌های زیر آمادگی رسمی جهت دریافت وام را ثبت کنید.
            </p>

            <div className="space-y-3 pt-2">
              {/* Main Loan Application Panel */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block">تقاضای وام اصلی به صورت مستقیم</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      مبلغ قابل واگذاری دور ({toPersianDigits(totalCycleShares)} سهم): {formatCurrency(totalCycleShares * (activeCycle?.monthlyAmount || settings.monthlyAmount))}
                    </span>
                  </div>
                  <div>
                    {activeMember.hasWon ? (
                      <span className="bg-slate-200 text-slate-500 text-[9px] px-2 py-1 rounded font-bold">دریافت شده سابق</span>
                    ) : (
                      <button
                        onClick={() => onToggleApplyForLoan(activeMember.id, "main")}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          activeMember.isAppliedForLoan 
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-extrabold"
                            : "bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
                        }`}
                      >
                        {activeMember.isAppliedForLoan ? "لغو درخواست وام" : "ثبت تقاضای مستقیم"}
                      </button>
                    )}
                  </div>
                </div>

                {activeMember.isAppliedForLoan && !activeMember.hasWon && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-1.5 text-right font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-teal-950 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        درخواست وام اصلی شما فعال است
                      </span>
                      {activeMember.loanRequestTime && (
                        <span className="text-[9px] text-teal-800 font-mono font-bold bg-white px-2 py-0.5 rounded border border-teal-150">
                          ثبت: {toPersianDigits(new Date(activeMember.loanRequestTime).toLocaleDateString('fa-IR'))}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-teal-900 leading-relaxed">
                      📌 <b>تداوم خودکار اولویت:</b> چنانچه در این ماه انتخاب نشوید، درخواست شما به صورت خودکار با حفظ کامل اولویت زمان ثبت به ماه‌های بعد منتقل می‌گردد.
                    </p>
                    <p className="text-[9.5px] text-teal-800 leading-relaxed">
                      💡 همچنین در صورت انصراف، می‌توانید در هر ماه با کلیک بر روی دکمه قرمز رنگ بالا، درخواست خود را لغو کنید.
                    </p>
                  </div>
                )}
              </div>

              {/* Emergency Loan Application Panel */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block">تقاضای وام ضروری فوری</span>
                    <span className="text-[9px] text-blue-800 mt-0.5 block">برداشت مستقیم از اندوخته گنجینه</span>
                  </div>
                  <div>
                    <button
                      onClick={() => onToggleApplyForLoan(activeMember.id, "emergency")}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeMember.isAppliedForEmergency 
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-extrabold"
                          : "bg-blue-800 hover:bg-blue-900 text-white shadow-sm"
                      }`}
                    >
                      {activeMember.isAppliedForEmergency ? "لغو درخواست وام" : "ثبت تقاضای ضروری"}
                    </button>
                  </div>
                </div>

                {activeMember.isAppliedForEmergency && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5 text-right font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-blue-950 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        درخواست وام ضروری شما فعال است
                      </span>
                      {activeMember.emergencyLoanRequestTime && (
                        <span className="text-[9px] text-blue-800 font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-150">
                          ثبت: {toPersianDigits(new Date(activeMember.emergencyLoanRequestTime).toLocaleDateString('fa-IR'))}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-900 leading-relaxed">
                      📌 <b>تداوم خودکار اولویت:</b> در صورت عدم اختصاص در این دوره، درخواست شما با اولویت زمانی به ماه‌های بعدی منتقل می‌شود و در هر زمان قابل لغو است.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Historical splits: Monthly Payments vs Received Loans (تفکیک شده) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-250 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-750" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">گزارش تفکیک شده مالی و تسهیلات همیار صندوق</span>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-end">
            <button
              onClick={() => setHistoryTab("deposits")}
              className={`py-1 px-3.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                historyTab === "deposits"
                  ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black"
                  : "text-slate-500 font-normal hover:text-slate-850"
              }`}
            >
              مبالغ واریز شده ماهیانه ({toPersianDigits(paidCount)} دوره)
            </button>
            <button
              onClick={() => setHistoryTab("withdrawals")}
              className={`py-1 px-3.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                historyTab === "withdrawals"
                  ? "bg-white text-blue-950 shadow-sm border border-slate-205 font-black"
                  : "text-slate-500 font-normal hover:text-blue-850"
              }`}
            >
              وام‌ها و دریافتی‌ها ({activeMember.hasWon ? "۱" : "۰"} مورد)
            </button>
          </div>
        </div>

        {/* Dynamic Inner Tab Display */}
        {historyTab === "deposits" ? (
          <div className="space-y-3 font-sans" id="member-deposits-log">
            {memberPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                هیچ‌گونه فیش پرداختی ماهیانه برای شما ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 rounded-lg">
                <table className="w-full text-right text-xs min-w-[700px] whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">دوره زمانی</th>
                      <th className="p-3">تاریخ و روز ثبت واریز</th>
                      <th className="p-3 text-emerald-800">قسط ثابت</th>
                      <th className="p-3 text-blue-800">سهم پس‌انداز گنجینه</th>
                      <th className="p-3 text-slate-700">جمع کل واریزی</th>
                      <th className="p-3">تراز امتیاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {memberPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold">تسهیلات {p.monthName}</td>
                        <td className="p-3 font-mono text-slate-655">{p.paymentDateShamsi} (روز {toPersianDigits(p.paymentDayShamsi)}م ماه)</td>
                        <td className="p-3 font-mono text-teal-700 font-bold">{formatCurrency(p.amount)}</td>
                        <td className="p-3 font-mono text-blue-700 font-bold">{formatCurrency(p.savingsAmount || 500000)}</td>
                        <td className="p-3 font-mono text-slate-800 font-black">{formatCurrency(p.amount + (p.savingsAmount || 500000))}</td>
                        <td className="p-3 font-mono font-black">
                          <span className={p.scoreDelta >= 0 ? "text-teal-700" : "text-rose-600"}>
                            {p.scoreDelta >= 0 ? "+" : ""}{toPersianDigits(new Intl.NumberFormat("en-US").format(p.scoreDelta))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4" id="member-withdrawals-log">
            {!activeMember.hasWon ? (
              <div className="py-8 text-center text-xs text-slate-400">
                صندوق تاکنون وام یا دریافتی به نام شما واگذار نکرده است. (هرموقع نام شما در قرعه بیرون بیاید، اطلاعات دریافت وام در این بخش ثبت می‌شود)
              </div>
            ) : (
              <div className="bg-emerald-50/40 p-5 rounded-lg border border-emerald-150 space-y-3 font-sans max-w-lg">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Award className="w-5 h-5 shrink-0" />
                  <h5 className="text-xs font-black">وام نوبتی دریافتی دوره {activeMember.winMonth}</h5>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-3 bg-white border border-slate-200 rounded">
                    <span className="text-slate-400 text-[10px] block">مبلغ کل دریافتی وام:</span>
                    <span className="text-base font-black text-emerald-800 block mt-1">{formatCurrency(mainLoanReceivedAmount)}</span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded">
                    <span className="text-slate-400 text-[10px] block">دوره واگذاری مصوب:</span>
                    <span className="text-sm font-black text-slate-850 block mt-1">{activeMember.winMonth}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed bg-white/70 p-2.5 rounded border border-slate-100">
                  📝 طبق مفاد تفاهم‌نامه صندوق قرض‌الحسنه، اعضایی که در قرعه‌کشی برنده می‌شوند تا پایان دوره و تصفیه نهایی سایر اعضا، از لیستِ شانس قرعه‌کشی‌های نوبتی بعدی خارج خواهند شد تا شانس برابری برای همگان حفظ شود.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
