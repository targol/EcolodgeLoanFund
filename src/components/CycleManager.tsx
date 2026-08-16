import React, { useState, useEffect } from "react";
import { Member, Payment, FundCycle, FundSettings, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency } from "../utils/jalali";
import { 
  Layers, Plus, Calendar, CheckCircle2, Clock, Sparkles, TrendingUp,
  Award, Shield, Users, Info, ChevronRight, Check, AlertCircle, Coins,
  History, ArrowUpRight, Flame, BarChart3, Database, FileSpreadsheet, Trophy,
  Lock, Unlock, Edit3, Save, CheckCircle
} from "lucide-react";

interface CycleManagerProps {
  cycles: FundCycle[];
  members: Member[];
  payments?: Payment[];
  settings: FundSettings;
  onAddCycle: (newCycle: FundCycle) => void;
  onUpdateCycle: (cycleId: string, updatedFields: Partial<FundCycle>) => void;
  onSetActiveCycle: (cycleNumber: number) => void;
  onUpdateSettings?: (newSettings: Partial<FundSettings>) => void;
}

export default function CycleManager({
  cycles,
  members,
  payments = [],
  settings,
  onAddCycle,
  onUpdateCycle,
  onSetActiveCycle,
  onUpdateSettings
}: CycleManagerProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    cycles.find(c => c.status === "active")?.id || cycles[cycles.length - 1]?.id || "cycle_3"
  );
  const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);
  const [isEditCycleModalOpen, setIsEditCycleModalOpen] = useState(false);
  const [isCloseCycleModalOpen, setIsCloseCycleModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "matrix" | "gold_tracker">("detail");

  // Admin Gold Valuation Live Input States
  const [goldValueInput, setGoldValueInput] = useState<string>(
    (settings.goldFundValueToman || 18500000).toString()
  );
  const [goldNoteInput, setGoldNoteInput] = useState<string>(
    settings.goldInvestmentNote || "مبالغ پس‌انداز ماهانه در صندوق طلا سرمایه‌گذاری شده و ارزش روز آن در پایان دوره تعیین خواهد شد."
  );
  const [goldSaveSuccess, setGoldSaveSuccess] = useState(false);

  useEffect(() => {
    setGoldValueInput((settings.goldFundValueToman || 18500000).toString());
    setGoldNoteInput(
      settings.goldInvestmentNote || "مبالغ پس‌انداز ماهانه در صندوق طلا سرمایه‌گذاری شده و ارزش روز آن در پایان دوره تعیین خواهد شد."
    );
  }, [settings.goldFundValueToman, settings.goldInvestmentNote]);

  const handleSaveGoldValuation = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Number(goldValueInput);
    if (isNaN(numericVal) || numericVal < 0) {
      alert("لطفاً یک رقم معتبر برای ارزش روز طلا وارد کنید.");
      return;
    }
    if (onUpdateSettings) {
      onUpdateSettings({
        goldFundValueToman: numericVal,
        goldInvestmentNote: goldNoteInput
      });
      setGoldSaveSuccess(true);
      setTimeout(() => setGoldSaveSuccess(false), 3000);
    }
  };

  // New Cycle Form state
  const nextCycleNum = (cycles.length > 0 ? Math.max(...cycles.map(c => c.cycleNumber)) : 0) + 1;
  const [newCycleTitle, setNewCycleTitle] = useState(`دوره ${toPersianDigits(nextCycleNum)} (${toPersianDigits(settings.currentYear + 1)} - ${toPersianDigits(settings.currentYear + 2)})`);
  const [newMonthlyAmount, setNewMonthlyAmount] = useState<string>("5500000");
  const [newSavingsAmount, setNewSavingsAmount] = useState<string>("500000");
  const [newTotalMonths, setNewTotalMonths] = useState<number>(10);
  const [newStartDate, setNewStartDate] = useState<string>(`${toPersianDigits(settings.currentYear + 1)}/۰۱/۰۱`);
  const [newEndDate, setNewEndDate] = useState<string>(`${toPersianDigits(settings.currentYear + 1)}/۱۰/۳۰`);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.filter(m => (m.participatedCycles || []).includes(settings.currentCycleNumber || 3)).map(m => m.id)
  );
  const [memberSharesInput, setMemberSharesInput] = useState<Record<string, number>>(
    members.reduce((acc, m) => ({ ...acc, [m.id]: m.currentCycleShares || 1 }), {})
  );
  const [newNotes, setNewNotes] = useState<string>("");
  const [newGoldNote, setNewGoldNote] = useState<string>("مبالغ پس‌انداز ماهانه در صندوق طلا سرمایه‌گذاری شده و ارزش روز آن در پایان دوره تعیین خواهد شد.");

  // Edit Active Cycle Form State
  const currentCycle = cycles.find(c => c.id === selectedCycleId) || cycles[0];
  const isCurrentCycleLocked = currentCycle?.status === "completed";

  const [editTitle, setEditTitle] = useState(currentCycle?.title || "");
  const [editMonthlyAmount, setEditMonthlyAmount] = useState<string>((currentCycle?.monthlyAmount || settings.monthlyAmount || 5500000).toString());
  const [editSavingsAmount, setEditSavingsAmount] = useState<string>((currentCycle?.savingsAmount || settings.savingsAmount || 500000).toString());
  const [editStartDate, setEditStartDate] = useState(currentCycle?.startShamsiDate || "");
  const [editEndDate, setEditEndDate] = useState(currentCycle?.endShamsiDate || "");
  const [editNotes, setEditNotes] = useState(currentCycle?.notes || "");
  const [editGoldNote, setEditGoldNote] = useState(currentCycle?.goldInvestmentNote || "");
  const [editMemberIds, setEditMemberIds] = useState<string[]>(currentCycle?.memberIds || members.map(m => m.id));
  const [editMemberShares, setEditMemberShares] = useState<Record<string, number>>(
    currentCycle?.memberShares || members.reduce((acc, m) => ({ ...acc, [m.id]: m.currentCycleShares || 1 }), {})
  );

  useEffect(() => {
    if (currentCycle) {
      setEditTitle(currentCycle.title);
      setEditMonthlyAmount((currentCycle.monthlyAmount || settings.monthlyAmount || 5500000).toString());
      setEditSavingsAmount((currentCycle.savingsAmount || settings.savingsAmount || 500000).toString());
      setEditStartDate(currentCycle.startShamsiDate);
      setEditEndDate(currentCycle.endShamsiDate || "");
      setEditNotes(currentCycle.notes || "");
      setEditGoldNote(currentCycle.goldInvestmentNote || "");
      setEditMemberIds(currentCycle.memberIds || members.map(m => m.id));
      setEditMemberShares(currentCycle.memberShares || members.reduce((acc, m) => ({ ...acc, [m.id]: m.currentCycleShares || 1 }), {}));
    }
  }, [currentCycle, settings.monthlyAmount, settings.savingsAmount, members]);

  const handleToggleEditMember = (memberId: string) => {
    if (editMemberIds.includes(memberId)) {
      setEditMemberIds(editMemberIds.filter(id => id !== memberId));
    } else {
      setEditMemberIds([...editMemberIds, memberId]);
      if (!editMemberShares[memberId]) {
        setEditMemberShares({ ...editMemberShares, [memberId]: 1 });
      }
    }
  };

  const handleEditMemberShareChange = (memberId: string, delta: number) => {
    const current = editMemberShares[memberId] || 1;
    const updated = Math.max(1, current + delta);
    setEditMemberShares({
      ...editMemberShares,
      [memberId]: updated
    });
  };

  const handleQuickAdjustShare = (memberId: string, newShareCount: number) => {
    if (!currentCycle || currentCycle.status === "completed") return;
    const safeCount = Math.max(1, newShareCount);
    const updatedShares = {
      ...(currentCycle.memberShares || {}),
      [memberId]: safeCount
    };
    onUpdateCycle(currentCycle.id, {
      memberShares: updatedShares
    });
  };

  const handleToggleMemberSelect = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
      if (!memberSharesInput[memberId]) {
        setMemberSharesInput({ ...memberSharesInput, [memberId]: 1 });
      }
    }
  };

  const handleShareCountChange = (memberId: string, shares: number) => {
    setMemberSharesInput({
      ...memberSharesInput,
      [memberId]: Math.max(1, shares)
    });
  };

  const handleCreateNewCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleTitle.trim()) return;

    const newCycle: FundCycle = {
      id: `cycle_${Date.now()}`,
      cycleNumber: nextCycleNum,
      title: newCycleTitle.trim(),
      status: "active",
      startShamsiDate: newStartDate,
      endShamsiDate: newEndDate,
      monthlyAmount: Number(newMonthlyAmount) || 5000000,
      savingsAmount: Number(newSavingsAmount) || 500000,
      totalMonths: newTotalMonths || 10,
      memberIds: selectedMemberIds,
      memberShares: memberSharesInput,
      notes: newNotes,
      goldInvestmentNote: newGoldNote,
      accumulatedSavingsPool: 0,
      pastWinners: []
    };

    onAddCycle(newCycle);
    setIsNewCycleModalOpen(false);
    setSelectedCycleId(newCycle.id);
  };

  const handleSaveActiveCycleEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCycle) return;
    if (currentCycle.status === "completed") {
      alert("⚠️ این دوره بسته شده و قابلیت تغییر ندارد.");
      return;
    }

    onUpdateCycle(currentCycle.id, {
      title: editTitle.trim(),
      monthlyAmount: Number(editMonthlyAmount) || currentCycle.monthlyAmount,
      savingsAmount: Number(editSavingsAmount) || currentCycle.savingsAmount,
      startShamsiDate: editStartDate.trim(),
      endShamsiDate: editEndDate.trim(),
      notes: editNotes.trim(),
      goldInvestmentNote: editGoldNote.trim(),
      memberIds: editMemberIds,
      memberShares: editMemberShares
    });

    setIsEditCycleModalOpen(false);
    alert("مشخصات دوره و سهم اعضا با موفقیت ذخیره و اعمال گردید.");
  };

  const handleCloseAndLockCycle = () => {
    if (!currentCycle) return;
    if (currentCycle.status === "completed") return;

    onUpdateCycle(currentCycle.id, {
      status: "completed"
    });
    setIsCloseCycleModalOpen(false);
    alert(`🔒 پرونده «${currentCycle.title}» با موفقیت نهایی و به صورت کامل قفل گردید. این دوره دیگر قابل تغییر نخواهد بود.`);
  };

  // Calculate total shares for current cycle
  const totalShares = currentCycle?.memberIds.reduce((sum, mId) => {
    return sum + (currentCycle.memberShares?.[mId] || 1);
  }, 0) || currentCycle?.memberIds.length || 0;

  // Calculate total savings deposits from paid payments
  const totalSavingsDeposited = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.savingsAmount || 0), 0);

  const currentGoldFundValuation = Number(goldValueInput) || settings.goldFundValueToman || 18500000;
  const baseSavingsDeposits = totalSavingsDeposited > 0 ? totalSavingsDeposited : 16500000;
  const goldProfitToman = currentGoldFundValuation - baseSavingsDeposits;
  const goldGrowthRatePercent = ((goldProfitToman / baseSavingsDeposits) * 100).toFixed(1);
  const goldValuePerShare = Math.round(currentGoldFundValuation / (totalShares || 11));

  return (
    <div className="space-y-6 font-sans" id="cycle-manager-container">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-850">مدیریت دوره‌های صندوق و سوابق اعضا</h3>
              <span className="text-[10px] font-bold bg-teal-100/70 text-teal-800 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                <Shield className="w-3 h-3 text-teal-700" />
                قفل خودکار دوره‌های بسته شده
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              صندوق اکنون در <span className="font-bold text-teal-700">دوره سوم</span> قرار دارد. دوره‌های بسته شده غیرقابل ویرایش و دائمی هستند.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-view switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode("detail")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "detail" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              مشاهده دوره‌ها
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "matrix" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ماتریس سوابق اعضا
            </button>
            <button
              onClick={() => setViewMode("gold_tracker")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                viewMode === "gold_tracker" ? "bg-amber-500 text-white shadow-xs" : "text-amber-900 hover:text-amber-950 font-bold"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>ارزش‌گذاری و صندوق طلا</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewCycleModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>شروع دوره جدید</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DETAIL OF CYCLES */}
      {viewMode === "detail" && (
        <div className="space-y-5">
          {/* Cycle selector buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cycles.map(cycle => {
              const isSelected = cycle.id === selectedCycleId;
              const isLocked = cycle.status === "completed";
              const isActive = cycle.status === "active";
              return (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-right relative overflow-hidden ${
                    isSelected
                      ? "bg-teal-50/50 border-teal-700 ring-2 ring-teal-600/20 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isActive 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {isActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          دوره جاری فعال
                        </>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          بسته شده و قفل
                        </>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      دوره #{toPersianDigits(cycle.cycleNumber)}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-1.5">
                    {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span>{cycle.title}</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">قسط ماهانه:</span>
                      <strong className="font-bold text-slate-700">{formatCurrency(cycle.monthlyAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">پس‌انداز طلا:</span>
                      <strong className="font-bold text-teal-700">{formatCurrency(cycle.savingsAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">تعداد اعضا/سهم:</span>
                      <strong className="font-bold text-slate-700">{toPersianDigits(cycle.memberIds?.length || 0)} عضو</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">مدت دوره:</span>
                      <strong className="font-bold text-slate-700">{toPersianDigits(cycle.totalMonths)} ماه</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active / Selected Cycle Detailed Sheet */}
          {currentCycle && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Security Banner for Locked / Closed Cycle */}
              {isCurrentCycleLocked ? (
                <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 block">🔒 پرونده دوره مختومه و قفل‌شده (اسناد غیرقابل تغییر)</span>
                      <span className="text-[11px] text-slate-500">
                        این دوره رسماً خاتمه یافته و کلیه مبالغ اقساط، سهم‌ها و اسناد برندگان آن جهت حفظ انضباط مالی برای همیشه قفل است.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
                    بایگانی غیرقابل تغییر
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-emerald-900 block">🟢 دوره در حال اجرا و فعال</span>
                      <span className="text-[11px] text-emerald-700">
                        این دوره جاری است. پس از اتمام پرداخت‌ها و قرعه‌کشی‌ها، می‌توانید پرونده دوره را قفل و مختومه نمایید.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditCycleModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>ویرایش اطلاعات دوره</span>
                    </button>
                    <button
                      onClick={() => setIsCloseCycleModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>بستن و قفل نهایی دوره</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{currentCycle.title}</h3>
                    {currentCycle.status === "active" ? (
                      <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                        دوره جاری
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        مختومه / بایگانی
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    بازه زمانی: {currentCycle.startShamsiDate} تا {currentCycle.endShamsiDate || "نامشخص"} • مدت دوره: {toPersianDigits(currentCycle.totalMonths)} ماه
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentCycle.status !== "active" && (
                    <button
                      onClick={() => onSetActiveCycle(currentCycle.cycleNumber)}
                      className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                    >
                      فعال‌سازی این دوره به عنوان دوره جاری
                    </button>
                  )}
                </div>
              </div>

              {/* Cycle Financial Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                  <span className="text-[11px] text-slate-400 block font-medium">مبلغ قسط ثابت ماهانه</span>
                  <span className="text-sm font-black text-slate-850 mt-1 block">
                    {formatCurrency(currentCycle.monthlyAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">به ازای هر سهم</span>
                </div>

                <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-150">
                  <span className="text-[11px] text-teal-700 block font-medium">مبلغ پس‌انداز ماهانه (صندوق طلا)</span>
                  <span className="text-sm font-black text-teal-900 mt-1 block">
                    {formatCurrency(currentCycle.savingsAmount)}
                  </span>
                  <span className="text-[10px] text-teal-600">به ازای هر سهم در ماه</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                  <span className="text-[11px] text-slate-400 block font-medium">مجموع پرداختی ماهانه هر سهم</span>
                  <span className="text-sm font-black text-slate-850 mt-1 block">
                    {formatCurrency(currentCycle.monthlyAmount + currentCycle.savingsAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">قسط + پس‌انداز</span>
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-150">
                  <span className="text-[11px] text-indigo-700 block font-medium">مبلغ کل وام قرعه‌کشی</span>
                  <span className="text-sm font-black text-indigo-900 mt-1 block">
                    {formatCurrency(currentCycle.monthlyAmount * totalShares)}
                  </span>
                  <span className="text-[10px] text-indigo-600">{toPersianDigits(totalShares)} سهم مشارکت</span>
                </div>
              </div>

              {/* Cycle Notes / Gold strategy */}
              {currentCycle.notes && (
                <div className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">یادداشت و ویژگی‌های دوره: </span>
                    <span>{currentCycle.notes}</span>
                    {currentCycle.goldInvestmentNote && (
                      <p className="mt-1 text-amber-800 text-[11px] leading-relaxed">
                        🪙 <strong>وضعیت صندوق طلا:</strong> {currentCycle.goldInvestmentNote}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Members in this cycle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>اعضای مشارکت‌کننده در این دوره ({toPersianDigits(currentCycle.memberIds.length)} اقامتگاه / {toPersianDigits(totalShares)} سهم)</span>
                  </h4>
                  {isCurrentCycleLocked && (
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      لیست اعضای دوره قفل است
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {currentCycle.memberIds.map(mId => {
                    const member = members.find(m => m.id === mId);
                    const shares = currentCycle.memberShares?.[mId] || 1;
                    const isWinner = member?.hasWon && member?.winMonth;
                    return (
                      <div
                        key={mId}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 rounded-full bg-teal-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {member?.representativeName ? member.representativeName[0] : (member?.name?.[0] || "ع")}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-slate-800 block truncate">{member?.name || mId}</span>
                            <span className="text-[10px] text-slate-400">
                              {member?.representativeName ? `نماینده: ${member.representativeName}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCurrentCycleLocked ? (
                            <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
                              <button
                                type="button"
                                title="کاهش سهم"
                                disabled={shares <= 1}
                                onClick={() => handleQuickAdjustShare(mId, shares - 1)}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 font-bold"
                              >
                                -
                              </button>
                              <span className="px-1.5 py-0.5 font-bold text-[11px] text-indigo-900 bg-indigo-50/60 min-w-[34px] text-center">
                                {toPersianDigits(shares)} سهم
                              </span>
                              <button
                                type="button"
                                title="افزایش سهم"
                                onClick={() => handleQuickAdjustShare(mId, shares + 1)}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            shares > 1 && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                {toPersianDigits(shares)} سهم
                              </span>
                            )
                          )}
                          {isWinner ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                              برنده {member?.winMonth}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              در نوبت
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Past Winners / Lottery History in this cycle */}
              {currentCycle.pastWinners && currentCycle.pastWinners.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>تاریخچه برندگان و پرداخت تسهیلات در این دوره ({toPersianDigits(currentCycle.pastWinners.length)} مورد)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {currentCycle.pastWinners.map((win, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-amber-50/40 border border-amber-200/80 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-slate-850 block truncate">{win.winnerName}</span>
                            <span className="text-[10px] text-amber-800 font-mono">{win.monthName}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          {win.loanType === "emergency" ? "وام ضروری" : "پرداخت شد"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SENIORITY & MULTI-CYCLE PARTICIPATION MATRIX */}
      {viewMode === "matrix" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-700" />
                <span>ماتریس جامع سوابق عضویت و شاخص قدمت اعضا</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                جدول ردیابی حضور اعضا در دوره‌های ۱، ۲ و ۳ جهت تعیین اولویت‌ها و امتیازات دوره‌های آتی صندوق
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">
                ⭐ عضو موسس (۳ دوره کامل)
              </span>
              <span className="px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded font-bold">
                🥈 باسابقه (۲ دوره)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                  <th className="p-3 font-bold">نام اقامتگاه بومگردی</th>
                  <th className="p-3 font-bold">نماینده</th>
                  <th className="p-3 font-bold text-center">دوره اول (۱۴۰۳)</th>
                  <th className="p-3 font-bold text-center">دوره دوم (۱۴۰۴)</th>
                  <th className="p-3 font-bold text-center">دوره سوم جاری (۱۴۰۵)</th>
                  <th className="p-3 font-bold text-center">سهم در دوره جاری</th>
                  <th className="p-3 font-bold text-center">شاخص سابقه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => {
                  const partCycles = member.participatedCycles || [3];
                  const inC1 = partCycles.includes(1);
                  const inC2 = partCycles.includes(2);
                  const inC3 = partCycles.includes(3);
                  const cycleCount = partCycles.length;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            {member.name[0]}
                          </div>
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{member.representativeName || "—"}</td>
                      
                      {/* Cycle 1 */}
                      <td className="p-3 text-center">
                        {inC1 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200">
                            <Check className="w-3 h-3" /> عضو
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Cycle 2 */}
                      <td className="p-3 text-center">
                        {inC2 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200">
                            <Check className="w-3 h-3" /> عضو
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Cycle 3 */}
                      <td className="p-3 text-center">
                        {inC3 ? (
                          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[11px] font-bold border border-teal-300">
                            <Check className="w-3 h-3" /> فعال
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Shares */}
                      <td className="p-3 text-center font-bold text-slate-700">
                        {inC3 ? (
                          <span className={member.currentCycleShares && member.currentCycleShares > 1 ? "text-indigo-700 font-black" : ""}>
                            {toPersianDigits(member.currentCycleShares || 1)} سهم
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Seniority Index */}
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cycleCount === 3
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : cycleCount === 2
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {toPersianDigits(cycleCount)} دوره عضویت ({cycleCount === 3 ? "طلایی / موسس" : cycleCount === 2 ? "نقره‌ای" : "عضو"})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: GOLD INVESTMENT & ACCUMULATED SAVINGS TRACKER */}
      {viewMode === "gold_tracker" && (
        <div className="space-y-5">
          {/* Admin Gold Valuation Live Input Panel */}
          <div className="bg-white rounded-xl border border-amber-300 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">ثبت و برآورد ارزش روز دارایی طلا توسط ادمین</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    تعیین ارزش روز دارایی‌های خریداری شده با پس‌انداز اعضا جهت شفاف‌سازی و تصمیم‌گیری تسویه پایان دوره
                  </p>
                </div>
              </div>

              {goldSaveSuccess && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>ارزش روز با موفقیت ذخیره گردید</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveGoldValuation} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ارزش برآوردی کل دارایی طلا (تومان):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100000"
                    value={goldValueInput}
                    onChange={(e) => setGoldValueInput(e.target.value)}
                    required
                    className="w-full p-2.5 bg-amber-50/40 border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-950 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <span className="text-[10px] text-amber-800 font-bold block mt-1">
                  معادل: {formatCurrency(Number(goldValueInput) || 0)}
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  یادداشت و استراتژی کشف ارزش طلا:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={goldNoteInput}
                    onChange={(e) => setGoldNoteInput(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 shadow cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>ثبت و ذخیره ارزش روز</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  این رقم و یادداشت مستقیماً در پنل کاربری اعضا و برآوردهای مالی نمایش داده می‌شود.
                </span>
              </div>
            </form>
          </div>

          {/* Gold Performance & Strategic Dashboard */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white rounded-xl border border-amber-300/80 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200">
              <div>
                <h3 className="text-base font-black text-amber-950">گزارش بازدهی و پس‌انداز انباشته اعضا</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  تحلیل و پایش دارایی طلای خریداری شده از محل پس‌انداز ماهانه ۵۰۰ هزار تومانی هر سهم
                </p>
              </div>

              <div className="text-left bg-white/90 p-3 rounded-lg border border-amber-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block font-medium">ارزش روز ثبت‌شده کل دارایی</span>
                <span className="text-lg font-black text-amber-900 font-mono">
                  {formatCurrency(currentGoldFundValuation)}
                </span>
              </div>
            </div>

            {/* Financial Performance KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[11px] text-slate-500 block font-medium">سرمایه اولیه خرید طلا (واریزی‌ها)</span>
                <span className="text-sm font-black text-slate-800 mt-1 block font-mono">
                  {formatCurrency(baseSavingsDeposits)}
                </span>
                <span className="text-[10px] text-slate-400">۳ ماه اول × ۱۱ سهم</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[11px] text-amber-800 block font-medium">ارزش روز کل طلا (ثبت ادمین)</span>
                <span className="text-sm font-black text-amber-950 mt-1 block font-mono">
                  {formatCurrency(currentGoldFundValuation)}
                </span>
                <span className="text-[10px] text-amber-700">برآورد لحظه‌ای بازار</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[11px] text-emerald-700 block font-medium">سود / بازدهی انباشته طلا</span>
                <span className={`text-sm font-black mt-1 block font-mono ${goldProfitToman >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {goldProfitToman >= 0 ? `+${formatCurrency(goldProfitToman)}` : formatCurrency(goldProfitToman)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {goldProfitToman >= 0 ? `+${toPersianDigits(goldGrowthRatePercent)}% رشد سرمایه` : "افت ارزش"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-[11px] text-indigo-700 block font-medium">ارزش برآوردی به ازای هر ۱ سهم</span>
                <span className="text-sm font-black text-indigo-900 mt-1 block font-mono">
                  {formatCurrency(goldValuePerShare)}
                </span>
                <span className="text-[10px] text-indigo-600">تقسیم بر {toPersianDigits(totalShares)} سهم فعال</span>
              </div>
            </div>

            {/* Strategic Notes Alert */}
            <div className="p-4 bg-white rounded-lg border border-amber-200 space-y-2 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 mb-1">سازوکار انتقال مبلغ انباشته به دوره‌های بعدی:</h4>
                  <p className="text-slate-600">
                    با توجه به اینکه مبالغ پس‌انداز ماهانه هر سهم (۵۰۰,۰۰۰ تومان در ماه) به صورت متمرکز در صندوق طلا سرمایه‌گذاری شده است، 
                    میزان نهایی ارزش دارایی در پایان دوره سوم (پس از اتمام تمام اقساط) به ارزش روز طلا محاسبه و ارزش نهایی آن کشف خواهد شد.
                  </p>
                  <p className="text-slate-600 mt-1">
                    در پایان دوره، در مورد نحوه انتقال این مبلغ انباشته (به صورت افزایش سرمایه پایه اعضا در دور چهارم، یا بازپرداخت، یا تجمیع به عنوان وام بدون کارمزد) توسط مجمع اعضا تصمیم‌گیری خواهد شد.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-amber-100">
                <Award className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-teal-950 mb-1">استراتژی عضوگیری و امتیازدهی در دوره‌های آتی:</h4>
                  <p className="text-slate-600">
                    سابقه اعضا در دوره‌های اول، دوم و سوم به عنوان امتیاز قدمت و اعتبار لحاظ خواهد شد. اعضای موسس و باسابقه در اولویت‌بندی دوره‌های بعدی و ضرایب تسهیلات در جایگاه ویژه قرار خواهند گرفت.
                  </p>
                </div>
              </div>
            </div>

            {/* Per-Member Gold Savings Breakdown Table */}
            <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>سهم اختصاصی هر یک از اعضا از سبد طلای صندوق (دوره ۳)</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-amber-50/80 text-amber-950 border-b border-amber-200 text-[11px]">
                      <th className="p-2.5 font-bold">نام اقامتگاه / عضو</th>
                      <th className="p-2.5 font-bold text-center">تعداد سهم</th>
                      <th className="p-2.5 font-bold text-center">مجموع پس‌انداز واریزی (۳ ماه)</th>
                      <th className="p-2.5 font-bold text-center">ارزش برآوردی سهم از طلا</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members
                      .filter(m => (m.participatedCycles || [3]).includes(3))
                      .map(member => {
                        const shares = member.currentCycleShares || 1;
                        const memberPaidSavings = shares * 500000 * 3;
                        const memberEstimatedGold = goldValuePerShare * shares;

                        return (
                          <tr key={member.id} className="hover:bg-amber-50/30">
                            <td className="p-2.5 font-bold text-slate-800">
                              {member.name} {member.representativeName ? `(${member.representativeName})` : ""}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={shares > 1 ? "font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200" : "text-slate-600"}>
                                {toPersianDigits(shares)} سهم
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-700">
                              {formatCurrency(memberPaidSavings)}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-900">
                              {formatCurrency(memberEstimatedGold)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACTIVE CYCLE */}
      {isEditCycleModalOpen && currentCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 text-right max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-700" />
                <h3 className="text-sm font-black text-slate-850">ویرایش مشخصات و سهم‌های دوره فعال ({currentCycle.title})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCycleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActiveCycleEdits} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان دوره:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مبلغ قسط ثابت ماهانه (تومان):</label>
                  <input
                    type="number"
                    step="500000"
                    value={editMonthlyAmount}
                    onChange={(e) => setEditMonthlyAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{formatCurrency(Number(editMonthlyAmount) || 0)}</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مبلغ پس‌انداز ماهانه (تومان):</label>
                  <input
                    type="number"
                    step="100000"
                    value={editSavingsAmount}
                    onChange={(e) => setEditSavingsAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                  <span className="text-[10px] text-teal-600 mt-0.5 block">{formatCurrency(Number(editSavingsAmount) || 0)}</span>
                </div>
              </div>

              {/* Live Summary Calculation Box */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-teal-950">
                  <span>مجموع پرداختی ماهانه هر سهم:</span>
                  <span className="text-sm font-black text-teal-900">
                    {formatCurrency((Number(editMonthlyAmount) || 0) + (Number(editSavingsAmount) || 0))}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-teal-800 pt-2 border-t border-teal-100">
                  <div>
                    <span className="text-teal-600 block">تعداد اعضای انتخابی:</span>
                    <strong>{toPersianDigits(editMemberIds.length)} عضو</strong>
                  </div>
                  <div>
                    <span className="text-teal-600 block">مجموع کل سهم‌ها:</span>
                    <strong className="text-indigo-800 font-black">
                      {toPersianDigits(editMemberIds.reduce((sum, mId) => sum + (editMemberShares[mId] || 1), 0))} سهم
                    </strong>
                  </div>
                  <div>
                    <span className="text-teal-600 block">مبلغ کل وام ماهانه:</span>
                    <strong className="text-teal-950 font-black">
                      {formatCurrency((Number(editMonthlyAmount) || 0) * editMemberIds.reduce((sum, mId) => sum + (editMemberShares[mId] || 1), 0))}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Members & Shares Configuration in Active Cycle */}
              <div>
                <label className="block font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>تنظیم اعضا و تعداد سهم هر شخص در این دوره:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (تیک عضویت و مشخص کردن تعداد سهم)
                  </span>
                </label>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {members.map(member => {
                    const isIncluded = editMemberIds.includes(member.id);
                    const shares = editMemberShares[member.id] || 1;
                    return (
                      <div
                        key={member.id}
                        className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2 text-xs ${
                          isIncluded
                            ? "bg-white border-teal-200 shadow-2xs"
                            : "bg-slate-100/60 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => handleToggleEditMember(member.id)}
                            className="rounded text-teal-800 focus:ring-teal-700 w-4 h-4 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 block truncate">{member.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {member.representativeName ? `نماینده: ${member.representativeName}` : ""}
                            </span>
                          </div>
                        </div>

                        {isIncluded && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-500">تعداد سهم:</span>
                            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md overflow-hidden">
                              <button
                                type="button"
                                disabled={shares <= 1}
                                onClick={() => handleEditMemberShareChange(member.id, -1)}
                                className="px-2 py-0.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 font-bold text-[11px] text-indigo-900 bg-white min-w-[32px] text-center">
                                {toPersianDigits(shares)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEditMemberShareChange(member.id, 1)}
                                className="px-2 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ شروع:</label>
                  <input
                    type="text"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ پایان:</label>
                  <input
                    type="text"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت‌های دوره:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">استراتژی طلا و پس‌انداز:</label>
                <textarea
                  rows={2}
                  value={editGoldNote}
                  onChange={(e) => setEditGoldNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCycleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-lg shadow cursor-pointer"
                >
                  ذخیره تغییرات دوره و سهم‌ها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE & PERMANENTLY LOCK CYCLE */}
      {isCloseCycleModalOpen && currentCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-700 pb-3 border-b border-rose-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">بستن و قفل نهایی پرونده دوره</h3>
                <span className="text-[11px] text-rose-700">اقدام حساس و غیرقابل بازگشت</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              با تایید این عملیات، پرونده <strong>«{currentCycle.title}»</strong> رسماً خاتمه‌یافته تلقی شده و به حالت <strong>قفل کامل</strong> در می‌آید.
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 space-y-1 font-medium">
              <p>⚠️ پس از بستن دوره، دیگر هیچ کاربری امکان تغییر مبالغ، سهم‌ها، تاریخ‌ها و برندگان را نخواهد داشت.</p>
              <p>🔒 اسناد مالی به عنوان سوابق رسمی و دست‌نخورده در سامانه بایگانی می‌شوند.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCloseCycleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleCloseAndLockCycle}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-lg text-xs shadow cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>تایید و قفل دائمی دوره</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: START NEW CYCLE */}
      {isNewCycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-right max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-850">پیکربندی و راه‌اندازی دوره جدید صندوق</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCycleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCycle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان دوره:</label>
                  <input
                    type="text"
                    value={newCycleTitle}
                    onChange={(e) => setNewCycleTitle(e.target.value)}
                    required
                    placeholder="مثال: دوره چهارم (۱۴۰۶)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت دوره (تعداد ماه‌ها):</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={newTotalMonths}
                    onChange={(e) => setNewTotalMonths(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ قسط ثابت ماهانه (تومان):</label>
                  <input
                    type="number"
                    step="500000"
                    value={newMonthlyAmount}
                    onChange={(e) => setNewMonthlyAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{formatCurrency(Number(newMonthlyAmount))}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ پس‌انداز ماهانه هر سهم (تومان):</label>
                  <input
                    type="number"
                    step="100000"
                    value={newSavingsAmount}
                    onChange={(e) => setNewSavingsAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                  <span className="text-[10px] text-teal-600 mt-0.5 block">{formatCurrency(Number(newSavingsAmount))}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ شروع دوره (شمسی):</label>
                  <input
                    type="text"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ پایان دوره (شمسی):</label>
                  <input
                    type="text"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Select participating members and shares */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب اعضای حاضر در این دوره و تعیین تعداد سهم: ({toPersianDigits(selectedMemberIds.length)} عضو انتخاب شده)
                </label>

                <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  {members.map(member => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    const shares = memberSharesInput[member.id] || 1;
                    return (
                      <div
                        key={member.id}
                        className={`p-2 rounded-md flex items-center justify-between text-xs transition-colors ${
                          isSelected ? "bg-teal-50 border border-teal-200" : "bg-white border border-slate-100"
                        }`}
                      >
                        <div
                          onClick={() => handleToggleMemberSelect(member.id)}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMemberSelect(member.id)}
                            className="rounded text-teal-700"
                          />
                          <span className="font-bold text-slate-800">{member.name}</span>
                          <span className="text-[10px] text-slate-400">({member.representativeName || "عضو"})</span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] text-slate-500 font-medium">تعداد سهم:</span>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={shares}
                              onChange={(e) => handleShareCountChange(member.id, Number(e.target.value))}
                              className="w-12 p-1 bg-white border border-slate-200 rounded text-center font-bold text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes & Gold Strategy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت و استراتژی پس‌انداز و طلا:</label>
                <textarea
                  rows={2}
                  value={newGoldNote}
                  onChange={(e) => setNewGoldNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCycleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-lg text-xs shadow cursor-pointer"
                >
                  ایجاد و راه‌اندازی دوره جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
