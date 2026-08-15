import React, { useState, useEffect } from "react";
import { Member, Payment, LotteryResult, FundSettings, FundCycle, PERS_MONTH_NAMES } from "./types";
import { getInitialMockData, calculatePaymentScore, toPersianDigits, formatCurrency, gregorianToJalali } from "./utils/jalali";
import FundOverview from "./components/FundOverview";
import AdminPanel from "./components/AdminPanel";
import MemberPanel from "./components/MemberPanel";
import ConstitutionModal from "./components/ConstitutionModal";
import { 
  Lock, User, Landmark, HelpCircle, ShieldCheck, UserCheck, Key, Eye, EyeOff, AlertCircle
} from "lucide-react";

export default function App() {
  // Core unified state
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lotteries, setLotteries] = useState<LotteryResult[]>([]);
  const [cycles, setCycles] = useState<FundCycle[]>([]);
  const [settings, setSettings] = useState<FundSettings>({
    fundName: "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی",
    monthlyAmount: 5500000,
    savingsAmount: 500000,
    lotteryDayOfMonth: 1,
    autoDrawOnFirstOfMonth: true,
    currentYear: 1405,
    currentMonthIndex: 5,
    currentCycleNumber: 3,
    goldInvestmentNote: "مبالغ پس‌انداز در صندوق طلا سرمایه‌گذاری شده و ارزش روز آن در پایان دوره تعیین خواهد شد.",
    goldFundValueToman: 18500000,
    adminPassword: "admin",
    telegramBotToken: "",
    telegramChatId: "",
    enableTelegramNotification: true,
    telegramMessageTemplate: `🎉 <b>نتیجه قرعه‌کشی {ماه} {نام_صندوق}</b>

🏆 <b>برنده خوش‌شانس این دوره:</b>
👤 <b>{نام_برنده}</b>

💰 <b>مبلغ تسهیلات:</b> {مبلغ_وام} تومان
📅 <b>تاریخ برگزاری:</b> {تاریخ_قرعه_کشی}
📌 <b>نوع تسهیلات:</b> {نوع_وام}

🎬 <i>ویدیو و شبیه‌سازی انیمیشنی قرعه‌کشی با موفقیت انجام گردید.</i>

✨ ضمن تبریک فراوان به برنده محترم، از تمامی اعضای خوش‌حساب صندوق بابت مشارکت صمیمانه سپاسگزاریم! 🙏`
  });

  const [isConstitutionOpen, setIsConstitutionOpen] = useState<boolean>(false);

  // Role switching
  const [currentRole, setCurrentRole] = useState<"admin" | "member">("admin");
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);

  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [typedAdminPassword, setTypedAdminPassword] = useState<string>("");
  const [adminAuthError, setAdminAuthError] = useState<string>("");
  const [showAdminPassInput, setShowAdminPassInput] = useState<boolean>(false);

  // Initialize state from localStorage or load high fidelity mock data
  useEffect(() => {
    const CURRENT_VERSION = "v6.0_multi_cycles_gold";
    const savedVersion = localStorage.getItem("mehr_fund_db_version");
    
    // If version changed, preserve telegram settings if user already configured them
    const savedSettingsRaw = localStorage.getItem("mehr_fund_settings");
    let preservedTelegramToken = "";
    let preservedTelegramChatId = "";
    if (savedSettingsRaw) {
      try {
        const parsed = JSON.parse(savedSettingsRaw);
        preservedTelegramToken = parsed.telegramBotToken || "";
        preservedTelegramChatId = parsed.telegramChatId || "";
      } catch (e) {
        console.error(e);
      }
    }

    if (savedVersion !== CURRENT_VERSION) {
      localStorage.setItem("mehr_fund_db_version", CURRENT_VERSION);
    }

    const savedMembers = localStorage.getItem("mehr_fund_members");
    const savedPayments = localStorage.getItem("mehr_fund_payments");
    const savedLotteries = localStorage.getItem("mehr_fund_lotteries");
    const savedSettings = localStorage.getItem("mehr_fund_settings");
    const savedCycles = localStorage.getItem("mehr_fund_cycles");

    if (savedMembers && savedPayments && savedLotteries && savedSettings && savedCycles) {
      let parsedMembers: Member[] = JSON.parse(savedMembers);
      let parsedLotteries: LotteryResult[] = JSON.parse(savedLotteries);
      let parsedSettings: FundSettings = JSON.parse(savedSettings);
      let parsedPayments: Payment[] = JSON.parse(savedPayments);
      let parsedCycles: FundCycle[] = JSON.parse(savedCycles);

      // Auto update Zainab Salar -> Zainab Salari in existing storage
      parsedMembers = parsedMembers.map(m => {
        if (m.name.includes("زینب سالار") && !m.name.includes("زینب سالاری")) {
          return { ...m, name: m.name.replace("زینب سالار", "زینب سالاری") };
        }
        return m;
      });

      parsedLotteries = parsedLotteries.map(l => {
        if (l.winnerName.includes("زینب سالار") && !l.winnerName.includes("زینب سالاری")) {
          return { ...l, winnerName: l.winnerName.replace("زینب سالار", "زینب سالاری") };
        }
        return l;
      });

      if (preservedTelegramToken && !parsedSettings.telegramBotToken) {
        parsedSettings.telegramBotToken = preservedTelegramToken;
      }
      if (preservedTelegramChatId && !parsedSettings.telegramChatId) {
        parsedSettings.telegramChatId = preservedTelegramChatId;
      }

      setMembers(parsedMembers);
      setPayments(parsedPayments);
      setLotteries(parsedLotteries);
      setSettings(parsedSettings);
      setCycles(parsedCycles);

      localStorage.setItem("mehr_fund_members", JSON.stringify(parsedMembers));
      localStorage.setItem("mehr_fund_lotteries", JSON.stringify(parsedLotteries));
      localStorage.setItem("mehr_fund_settings", JSON.stringify(parsedSettings));
      localStorage.setItem("mehr_fund_cycles", JSON.stringify(parsedCycles));
    } else {
      // Load premium default mock data
      const defaults = getInitialMockData();
      if (preservedTelegramToken) defaults.settings.telegramBotToken = preservedTelegramToken;
      if (preservedTelegramChatId) defaults.settings.telegramChatId = preservedTelegramChatId;

      setMembers(defaults.members);
      setPayments(defaults.payments);
      setLotteries(defaults.lotteries);
      setSettings(defaults.settings);
      setCycles(defaults.cycles || []);
      
      // Save them instantly
      localStorage.setItem("mehr_fund_members", JSON.stringify(defaults.members));
      localStorage.setItem("mehr_fund_payments", JSON.stringify(defaults.payments));
      localStorage.setItem("mehr_fund_lotteries", JSON.stringify(defaults.lotteries));
      localStorage.setItem("mehr_fund_settings", JSON.stringify(defaults.settings));
      localStorage.setItem("mehr_fund_cycles", JSON.stringify(defaults.cycles || []));
    }
  }, []);

  // Dynamic Favicon and Title Update based on Settings
  useEffect(() => {
    if (settings.fundName) {
      document.title = settings.fundName;
    }

    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "shortcut icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }

    if (settings.logoUrl) {
      link.href = settings.logoUrl;
    } else {
      // Create a clean default SVG favicon with Teal theme
      const svgIcon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%23134e4a%22/><text y=%2265%22 font-size=%2250%22 font-weight=%22bold%22 text-anchor=%22middle%22 x=%2250%22 fill=%22white%22 font-family=%22sans-serif%22>م</text></svg>`;
      link.href = svgIcon;
    }
  }, [settings.logoUrl, settings.fundName]);

  // Helper to persist current state
  const persistState = (
    newMembers: Member[], 
    newPayments: Payment[], 
    newLotteries: LotteryResult[], 
    newSettings: FundSettings,
    newCycles?: FundCycle[]
  ) => {
    setMembers(newMembers);
    setPayments(newPayments);
    setLotteries(newLotteries);
    setSettings(newSettings);
    if (newCycles) {
      setCycles(newCycles);
      localStorage.setItem("mehr_fund_cycles", JSON.stringify(newCycles));
    }

    localStorage.setItem("mehr_fund_members", JSON.stringify(newMembers));
    localStorage.setItem("mehr_fund_payments", JSON.stringify(newPayments));
    localStorage.setItem("mehr_fund_lotteries", JSON.stringify(newLotteries));
    localStorage.setItem("mehr_fund_settings", JSON.stringify(newSettings));
  };

  // Cycle management handlers
  const handleAddCycle = (newCycle: FundCycle) => {
    const updatedCycles = [...cycles, newCycle];
    let updatedSettings = { ...settings };
    if (newCycle.status === "active") {
      updatedCycles.forEach(c => {
        if (c.id !== newCycle.id) c.status = "archived";
      });
      updatedSettings.currentCycleNumber = newCycle.cycleNumber;
      updatedSettings.monthlyAmount = newCycle.monthlyAmount;
      updatedSettings.savingsAmount = newCycle.savingsAmount;
    }
    persistState(members, payments, lotteries, updatedSettings, updatedCycles);
  };

  const handleUpdateCycle = (cycleId: string, updatedFields: Partial<FundCycle>) => {
    const updatedCycles = cycles.map(c => c.id === cycleId ? { ...c, ...updatedFields } : c);
    persistState(members, payments, lotteries, settings, updatedCycles);
  };

  const handleSetActiveCycle = (cycleNumber: number) => {
    const updatedCycles = cycles.map(c => ({
      ...c,
      status: c.cycleNumber === cycleNumber ? "active" : "archived"
    }));
    const activeC = updatedCycles.find(c => c.cycleNumber === cycleNumber);
    let updatedSettings = { ...settings, currentCycleNumber: cycleNumber };
    if (activeC) {
      updatedSettings.monthlyAmount = activeC.monthlyAmount;
      updatedSettings.savingsAmount = activeC.savingsAmount;
    }
    persistState(members, payments, lotteries, updatedSettings, updatedCycles);
  };

  // Add a new member
  const handleAddMember = (name: string, password?: string) => {
    const newId = `mem_${Date.now()}`;
    const colors = [
      "from-teal-500 to-emerald-600",
      "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-sky-500 to-blue-600",
      "from-violet-500 to-indigo-600",
      "from-fuchsia-500 to-purple-600"
    ];
    // Create Shamsi date for today
    const autoJoinDate = toPersianDigits(gregorianToJalali(new Date()));

    const newMember: Member = {
      id: newId,
      name,
      phone: "", // No phone needed
      password: password || "123",
      joinDateShamsi: autoJoinDate,
      score: 0,
      hasWon: false,
      winMonth: null,
      avatarColor: colors[members.length % colors.length],
      isAppliedForLoan: false,
      isAppliedForEmergency: false
    };

    const updatedMembers = [...members, newMember];
    persistState(updatedMembers, payments, lotteries, settings);
  };

  // Update a member (e.g., name or password)
  const handleUpdateMember = (id: string, updatedFields: Partial<Member>) => {
    const updatedMembers = members.map(m => {
      if (m.id === id) {
        return { ...m, ...updatedFields };
      }
      return m;
    });

    // Also sync winnerName in lotteries if member name changed
    let updatedLotteries = lotteries;
    if (updatedFields.name) {
      updatedLotteries = lotteries.map(lot => {
        if (lot.winnerId === id) {
          return { ...lot, winnerName: updatedFields.name! };
        }
        return lot;
      });
    }

    persistState(updatedMembers, payments, updatedLotteries, settings);
  };

  // Remove a member
  const handleRemoveMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    const updatedPayments = payments.filter(p => p.memberId !== id);
    persistState(updatedMembers, updatedPayments, lotteries, settings);
  };

  // Record payment for a member
  const handleRecordPayment = (memberId: string, day: number) => {
    const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
    
    // Check if the member has already won
    const targetMember = members.find(m => m.id === memberId);
    const hasAlreadyWon = targetMember ? targetMember.hasWon : false;
    
    // Total Amount paid including savings component
    const totalPayment = settings.monthlyAmount + (settings.savingsAmount || 500000);
    const scoreCalculation = calculatePaymentScore(day, totalPayment, settings.lotteryDayOfMonth);
    const actualScoreDelta = hasAlreadyWon ? 0 : scoreCalculation.score;
    
    // 1. Build payment object
    const newPayment: Payment = {
      id: `p_${Date.now()}`,
      memberId,
      monthName: currentMonthName,
      amount: settings.monthlyAmount,
      savingsAmount: settings.savingsAmount || 500000,
      paymentDayShamsi: day,
      paymentDateShamsi: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
      scoreDelta: actualScoreDelta,
      status: "paid"
    };

    // Filter out duplicate records
    const filteredPayments = payments.filter(p => !(p.memberId === memberId && p.monthName === currentMonthName));
    const updatedPayments = [...filteredPayments, newPayment];

    // 2. Add score delta to the member
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, score: m.score + actualScoreDelta };
      }
      return m;
    });

    persistState(updatedMembers, updatedPayments, lotteries, settings);
  };

  // Toggle dynamic application statuses for loans from Member panel
  const handleToggleApplyForLoan = (memberId: string, type: "main" | "emergency") => {
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        if (type === "main") {
          const nextApplied = !m.isAppliedForLoan;
          return {
            ...m,
            isAppliedForLoan: nextApplied,
            loanRequestTime: nextApplied ? Date.now() : undefined
          };
        } else {
          const nextEmergency = !m.isAppliedForEmergency;
          return {
            ...m,
            isAppliedForEmergency: nextEmergency,
            emergencyLoanRequestTime: nextEmergency ? Date.now() : undefined
          };
        }
      }
      return m;
    });
    persistState(updatedMembers, payments, lotteries, settings);
  };

  // Handle successful Lottery / direct win draw
  const handleDrawSuccess = (
    winnerId: string, 
    method: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual",
    loanType: "main" | "emergency",
    customAmount?: number,
    customWinnerDate?: string // Editable win date!
  ) => {
    const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
    const totalAmount = loanType === "main" ? (members.length * settings.monthlyAmount) : (customAmount || 2000000);

    // 1. Update winner status
    const updatedMembers = members.map(m => {
      if (m.id === winnerId) {
        if (loanType === "main") {
          return {
            ...m,
            hasWon: true,
            winMonth: currentMonthName,
            isAppliedForLoan: false // clear application flag of main loan on winning!
          };
        } else {
          // emergency loan winner
          return {
            ...m,
            isAppliedForEmergency: false // clear emergency application flag on winning
          };
        }
      }
      return m;
    });

    // Check if drawing main loan and all members have won!
    let finalMembers = [...updatedMembers];
    let showResetNotification = false;
    if (loanType === "main") {
      const remainingUnwon = updatedMembers.filter(m => !m.hasWon).length;
      if (remainingUnwon === 0) {
        // Automatically start the next round! Reset winner status of everyone for the next round
        finalMembers = updatedMembers.map(m => ({
          ...m,
          hasWon: false,
          winMonth: null,
          isAppliedForLoan: false,
          isAppliedForEmergency: false
        }));
        showResetNotification = true;
      }
    }

    // 2. Save lottery winner result (using custom editable win date if provided)
    const winnerName = members.find(m => m.id === winnerId)?.name || "عضو ناشناس";
    const finalDrawDate = customWinnerDate || `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۵`;

    const newResult: LotteryResult = {
      id: `lot_${Date.now()}`,
      monthName: currentMonthName,
      winnerId,
      winnerName,
      drawDateShamsi: finalDrawDate,
      totalPoolAmount: totalAmount,
      drawMethod: method,
      participantsCount: members.length,
      loanType: loanType
    };
    const updatedLotteries = [...lotteries, newResult];

    // 3. Increment the month (Rotate to next month) ONLY if drawing MAIN loan
    let updatedSettings = { ...settings };
    if (loanType === "main") {
      let nextMonthIndex = settings.currentMonthIndex + 1;
      let nextYear = settings.currentYear;
      if (nextMonthIndex > 11) {
        nextMonthIndex = 0;
        nextYear += 1;
      }
      updatedSettings = {
        ...settings,
        currentMonthIndex: nextMonthIndex,
        currentYear: nextYear
      };
    }

    persistState(finalMembers, payments, updatedLotteries, updatedSettings);
    setIsAdminAuthenticated(true); // retains active authentication smoothly
    
    if (showResetNotification) {
      alert("🎉 تبریک! همه اعضا در این دور از صندوق برنده شدند و تسهیلات خود را دریافت کردند.\nدور جدید صندوق به صورت خودکار آغاز شد و وضعیت برندگان مجدداً فعال گردید.");
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<FundSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    persistState(members, payments, lotteries, updatedSettings);
  };

  // Reset core cycle to base state
  const handleResetFundCycle = () => {
    const defaults = getInitialMockData();
    persistState(defaults.members, defaults.payments, defaults.lotteries, defaults.settings);
  };

  // Admin login process handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings.adminPassword || "admin";
    if (typedAdminPassword === correctPassword) {
      setIsAdminAuthenticated(true);
      setAdminAuthError("");
      setTypedAdminPassword("");
    } else {
      setAdminAuthError("رمز عبور مدیر صندوق نادرست است.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans leading-relaxed pb-12 antialiased" dir="rtl">
      
      {/* Decorative Top Accent Bar */}
      <div className="h-1.5 bg-teal-800 w-full" />

      {/* Primary Header Card with brand & stats */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2" id="app-header">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="w-14 h-14 rounded-xl bg-teal-900 text-white flex items-center justify-center shadow-lg shadow-teal-900/10 overflow-hidden border border-teal-800 shrink-0">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.fundName} 
                  className="w-full h-full object-contain bg-white p-1"
                />
              ) : (
                <Landmark className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                <h1 className="text-lg font-black text-slate-800">{settings.fundName}</h1>
                <button
                  type="button"
                  onClick={() => setIsConstitutionOpen(true)}
                  className="bg-teal-100 hover:bg-teal-200 text-teal-850 text-[10px] px-2.5 py-1.5 rounded-lg font-bold border border-teal-150 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  <HelpCircle className="w-3 px-0 text-teal-700" />
                  <span>مشاهده اساسنامه صندوق</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                قسط ماهیانه: <b className="text-teal-900 font-extrabold">{formatCurrency(settings.monthlyAmount)}</b> + پس‌انداز: <b className="text-blue-900 font-extrabold">{formatCurrency(settings.savingsAmount || 500000)}</b> • موعد قرعه‌کشی: {toPersianDigits(settings.lotteryDayOfMonth)}ام هر ماه شمسی
              </p>
            </div>
          </div>

          {/* Interactive Role Switcher Widget */}
          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">هویت فعال جاری سیستم:</span>
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-205 flex gap-1 font-sans">
              <button
                onClick={() => {
                  setCurrentRole("admin");
                }}
                disabled={isDrawingActive}
                className={`py-2 px-5 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  currentRole === "admin"
                    ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-teal-700" />
                <span>پنل مدیریت (ادمین)</span>
              </button>
              <button
                onClick={() => {
                  setCurrentRole("member");
                }}
                disabled={isDrawingActive}
                className={`py-2 px-5 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  currentRole === "member"
                    ? "bg-white text-teal-850 shadow-sm border border-slate-200 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <User className="w-3.5 h-3.5 text-teal-700" />
                <span>پنل حساب شخصی اعضا</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Row 1: Shared Core Overview / Dashboard (Visible to both profiles to maintain financial clarity) */}
        <section className="space-y-3" id="shared-dashboard">
          <FundOverview 
            members={members}
            payments={payments}
            lotteries={lotteries}
            settings={settings}
          />
        </section>

        {/* Row 2: Responsive Panel display depending on active role */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              {currentRole === "admin" ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <h2 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">میز مانیتورینگ و فرامین ادمین صندوق</h2>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <h2 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">میزکار اعتباری و پرونده تعهد کاربری</h2>
                </>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-sans">
              دوره حسابرسی جاری: <strong className="font-bold text-slate-700">{PERS_MONTH_NAMES[settings.currentMonthIndex]} {toPersianDigits(settings.currentYear)}</strong>
            </div>
          </div>

          {currentRole === "admin" ? (
            // Check if admin is authenticated
            !isAdminAuthenticated ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto p-6 text-right font-sans" id="admin-auth-panel">
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-teal-50 text-teal-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-teal-100">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">کد امنیتی ورود به مدیریت صندوق</h4>
                  <p className="text-[10px] text-slate-400 mt-1">تغییر تراز مالی و برگزاری قرعه‌کشی نیاز به رمز ادمین دارد.</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {adminAuthError && (
                    <div className="p-2 bg-rose-50 text-rose-700 text-[11px] rounded flex items-center gap-1.5 border border-rose-100 font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>{adminAuthError}</span>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type={showAdminPassInput ? "text" : "password"}
                      placeholder="پیش‌فرض: admin"
                      value={typedAdminPassword}
                      onChange={(e) => {
                        setTypedAdminPassword(e.target.value);
                        setAdminAuthError("");
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-850 font-bold focus:outline-none focus:border-teal-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassInput(!showAdminPassInput)}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPassInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 bg-teal-800 hover:bg-teal-900 text-white font-black rounded text-xs transition-all shadow cursor-pointer"
                    >
                      تایید کد عبور مدیریت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminAuthenticated(true);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded text-xs font-bold cursor-pointer"
                    >
                      بای‌پس دمو
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <AdminPanel 
                members={members}
                payments={payments}
                lotteries={lotteries}
                settings={settings}
                cycles={cycles}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onRemoveMember={handleRemoveMember}
                onRecordPayment={handleRecordPayment}
                onUpdateSettings={handleUpdateSettings}
                onDrawSuccess={handleDrawSuccess}
                onResetFundCycle={handleResetFundCycle}
                isDrawingActive={isDrawingActive}
                setIsDrawingActive={setIsDrawingActive}
                onToggleApplyForLoan={handleToggleApplyForLoan}
                onAddCycle={handleAddCycle}
                onUpdateCycle={handleUpdateCycle}
                onSetActiveCycle={handleSetActiveCycle}
              />
            )
          ) : (
            <MemberPanel 
              members={members}
              payments={payments}
              settings={settings}
              cycles={cycles}
              onRecordPayment={handleRecordPayment}
              onToggleApplyForLoan={handleToggleApplyForLoan}
            />
          )}
        </section>

      </main>

      {/* Minimalistic Signature Footer */}
      <footer className="mt-12 text-center text-[10px] text-slate-400 max-w-md mx-auto px-4">
        <p>پلتفرم {settings.fundName || "صندوق قرض‌الحسنه و پس‌انداز منظم مهر البرز"} • توسعه به شیوه توازن هندسی مدرن با تداوم خوش‌حسابی اعضا</p>
      </footer>

      {/* Constitution Modal Backdrop rendering */}
      <ConstitutionModal 
        isOpen={isConstitutionOpen} 
        onClose={() => setIsConstitutionOpen(false)} 
        fundName={settings.fundName}
      />

    </div>
  );
}
