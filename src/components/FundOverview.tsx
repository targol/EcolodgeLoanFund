import { Member, Payment, LotteryResult, FundSettings, PERS_MONTH_NAMES, FundCycle } from "../types";
import { toPersianDigits, formatCurrency } from "../utils/jalali";
import { Trophy, Sparkles, TrendingUp, Shield, Wallet } from "lucide-react";
import { motion } from "motion/react";

interface FundOverviewProps {
  members: Member[];
  payments: Payment[];
  lotteries: LotteryResult[];
  settings: FundSettings;
  cycles?: FundCycle[];
}

export default function FundOverview({ members, payments, lotteries, settings, cycles }: FundOverviewProps) {
  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  
  // Active cycle determination
  const activeCycle = cycles?.find(c => c.status === "active") || (cycles && cycles[cycles.length - 1]);
  const activeCycleMembers = activeCycle?.memberIds 
    ? members.filter(m => activeCycle.memberIds.includes(m.id) && m.isActive !== false) 
    : members.filter(m => m.isActive !== false);
  
  // Active cycle calculations
  const totalActiveMembers = activeCycleMembers.length;
  const totalActiveShares = activeCycleMembers.reduce((sum, m) => {
    const shares = activeCycle?.memberShares?.[m.id] ?? m.currentCycleShares ?? 1;
    return sum + shares;
  }, 0);
  
  const monthlyLoanAmount = activeCycle?.monthlyAmount || settings.monthlyAmount || 5500000;
  const monthlySavingsAmount = activeCycle?.savingsAmount || settings.savingsAmount || 500000;
  const monthlyTotalPerShare = monthlyLoanAmount + monthlySavingsAmount;

  // Monthly expected totals
  const expectedMonthlyCommitment = totalActiveShares * monthlyTotalPerShare;
  const expectedMonthlyLoanPool = totalActiveShares * monthlyLoanAmount;
  const expectedMonthlySavingsPool = totalActiveShares * monthlySavingsAmount;

  // Current month collected payments for active members
  const currentMonthPayments = payments.filter(
    p => p.monthName === currentMonthName && 
         p.status === "paid" && 
         activeCycleMembers.some(m => m.id === p.memberId)
  );
  const totalCollectedLoanMonth = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalCollectedSavingsMonth = currentMonthPayments.reduce((sum, p) => sum + (p.savingsAmount || 0), 0);
  const totalCollectedMonth = totalCollectedLoanMonth + totalCollectedSavingsMonth;

  // Current Cycle Lotteries & Completed Months Count
  const currentCycleNumber = activeCycle?.cycleNumber || settings.currentCycleNumber || 3;
  const cycleLotteries = lotteries.filter(l => l.cycleNumber === currentCycleNumber || (!l.cycleNumber && activeCycle?.status === "active"));
  
  // Completed months in active cycle (based on lotteries or pastWinners, minimum 5 for cycle 3)
  const completedMonthsCount = Math.max(
    cycleLotteries.filter(l => l.loanType === "main" || !l.loanType).length,
    activeCycle?.pastWinners?.length || 0,
    5
  );

  // Accumulated Savings portfolio sum across cycle (Gold Fund Principal):
  // Formula: completedMonthsCount * totalActiveShares * monthlySavingsAmount
  const monthlySavingsPool = totalActiveShares * monthlySavingsAmount;
  const totalGoldDeposits = completedMonthsCount * monthlySavingsPool; // e.g. 5 * 10 * 500k = 25,000,000

  // Profit up to this moment announced by admin (total profit from cycle start up to now)
  const goldProfitToman = (settings.goldFundProfitToman !== undefined && settings.goldFundProfitToman !== null)
    ? Number(settings.goldFundProfitToman)
    : (activeCycle?.goldFundProfitToman ?? 0);

  // Total Gold Asset Value = Principal (from paid months) + Profit up to now
  const totalGoldValue = totalGoldDeposits + goldProfitToman;
  const hasRegisteredProfit = goldProfitToman > 0;
  const goldGrowthPercent = totalGoldDeposits > 0 
    ? ((goldProfitToman / totalGoldDeposits) * 100).toFixed(1) 
    : "0";

  // Gold per share breakdown
  const goldTotalPerShare = totalActiveShares > 0 ? Math.round(totalGoldValue / totalActiveShares) : 0;

  // Spent emergency loans from savings
  const totalEmergencyLoansPaid = lotteries
    .filter(l => l.loanType === "emergency")
    .reduce((sum, l) => sum + l.totalPoolAmount, 0);

  // Available emergency loan pool
  const allPaidPayments = payments.filter(p => p.status === "paid");
  const accumulatedSavingsTotal = Math.max(totalGoldDeposits, allPaidPayments.reduce((sum, p) => sum + (p.savingsAmount || 0), 0));
  const netEmergencyPoolAvailable = Math.max(0, accumulatedSavingsTotal - totalEmergencyLoansPaid);

  // Total life of fund pool (all paid amount including installments & savings)
  const totalPaidAllTime = allPaidPayments.reduce((sum, p) => sum + p.amount + (p.savingsAmount || 0), 0);

  // Scoring leaderboards (highest score first)
  const topMembers = [...activeCycleMembers].sort((a, b) => b.score - a.score).slice(0, 3);

  // Unified list of winners for the active cycle history
  const activeCycleWinnersList = (() => {
    const list: { id: string; monthName: string; winnerName: string; totalPoolAmount: number; loanType: string; drawMethod?: string }[] = [];
    
    // First from lotteries matching this cycle
    cycleLotteries.forEach((lot) => {
      list.push({
        id: lot.id,
        monthName: lot.monthName,
        winnerName: lot.winnerName,
        totalPoolAmount: lot.totalPoolAmount || expectedMonthlyLoanPool,
        loanType: lot.loanType || "main",
        drawMethod: lot.drawMethod
      });
    });

    // Also include pastWinners from cycle definition if not in list
    if (activeCycle?.pastWinners) {
      activeCycle.pastWinners.forEach((pw, idx) => {
        const exists = list.some(item => item.monthName === pw.monthName && item.winnerName === pw.winnerName);
        if (!exists) {
          list.push({
            id: `past_${idx}`,
            monthName: pw.monthName,
            winnerName: pw.winnerName,
            totalPoolAmount: expectedMonthlyLoanPool,
            loanType: pw.loanType || "main",
            drawMethod: "manual"
          });
        }
      });
    }

    return list;
  })();

  // Latest lottery winner for hero presentation (takes the latest main winner of active cycle)
  const latestMainWinner = [...activeCycleWinnersList].reverse().find(w => w.loanType === "main" || !w.loanType);
  const latestLotteryWinner = latestMainWinner || (activeCycleWinnersList.length > 0 ? activeCycleWinnersList[activeCycleWinnersList.length - 1] : (lotteries.length > 0 ? lotteries[lotteries.length - 1] : null));

  return (
    <div className="space-y-6 font-sans" id="fund-overview-container">
      {/* Prominent Hero Showcase for Latest Lottery Winner (Board Top Highlight) */}
      {latestLotteryWinner && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-teal-800/80 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 z-10 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300/30">
                  🎉 آخرین برنده قرعه‌کشی ({latestLotteryWinner.monthName})
                </span>
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ✓ ثبت قطعی در سامانه
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{latestLotteryWinner.winnerName}</span>
              </h3>
              <p className="text-xs text-teal-200 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>مبلغ تسهیلات پرداختی: <strong className="text-amber-300 font-mono text-sm">{formatCurrency(latestLotteryWinner.totalPoolAmount)}</strong></span>
                <span>• وضعیت ماه‌ها: <strong className="text-white">{toPersianDigits(completedMonthsCount)} ماه انجام‌شده</strong> از {toPersianDigits(activeCycle?.totalMonths || 10)} ماه</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 z-10 w-full md:w-auto justify-end">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-teal-200 block">ماه نوبت بعدی قرعه‌کشی</span>
              <span className="text-xs font-black text-amber-300 font-mono">
                {PERS_MONTH_NAMES[settings.currentMonthIndex]} {toPersianDigits(settings.currentYear)}
              </span>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute right-1/4 -top-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Right Column (2/3 width on desktop) - Key Statistics Cards */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Unified Card 1: Total Monthly Collection (Loans + Savings) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            id="stat-card-collected"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>وصولی تعهدات ماه جاری</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded font-bold">
                    {PERS_MONTH_NAMES[settings.currentMonthIndex]}
                  </span>
                </p>
                <div className="mt-2">
                  <span className="text-xl font-black text-teal-800 tracking-tight font-mono">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(totalCollectedMonth))}
                  </span>
                  <span className="text-xs mr-1 text-slate-400">تومان</span>
                </div>
              </div>
              <div className="p-2 bg-teal-50 border border-teal-100 rounded text-teal-800">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-medium text-slate-500">کل تعهد مصوب ماه ({toPersianDigits(totalActiveShares)} سهم):</span>
                <span className="font-black text-slate-800 font-mono">{formatCurrency(expectedMonthlyCommitment)}</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>واریزی هر سهم: {formatCurrency(monthlyTotalPerShare)}</span>
                <span className="font-bold text-teal-700">
                  {expectedMonthlyCommitment > 0 ? toPersianDigits(Math.round((totalCollectedMonth / expectedMonthlyCommitment) * 100)) : "۰"}٪ وصول‌شده
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-teal-700 h-full rounded-full transition-all duration-500"
                style={{ width: `${expectedMonthlyCommitment > 0 ? Math.min(100, (totalCollectedMonth / expectedMonthlyCommitment) * 100) : 0}%` }}
              />
            </div>
          </motion.div>

          {/* Card 2: Main Monthly Lottery Loan Pool */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            id="stat-card-lottery-amount"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-slate-700 mb-1">مبلغ وام قرعه‌کشی هر ماه</p>
                <div className="mt-2">
                  <span className="text-xl font-black text-indigo-900 tracking-tight font-mono">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(expectedMonthlyLoanPool))}
                  </span>
                  <span className="text-xs mr-1 text-slate-400">تومان</span>
                </div>
              </div>
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-indigo-800">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-medium text-slate-500">قسط وام هر سهم:</span>
                <span className="font-black text-indigo-900 font-mono">
                  {formatCurrency(monthlyLoanAmount)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                محاسبه وام: {toPersianDigits(totalActiveShares)} سهم فعال × {formatCurrency(monthlyLoanAmount)}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Accumulated Gold Savings Portfolio with Transparent Breakdown */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-amber-50/50 p-5 rounded-xl border border-amber-200/90 shadow-sm flex flex-col justify-between"
            id="stat-card-accumulated-savings"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-amber-950 mb-1 flex items-center gap-1">
                  <span>صندوق پس‌انداز طلا (انباشته)</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-200/60 text-amber-900 rounded font-bold">
                    {hasRegisteredProfit ? `${toPersianDigits(goldGrowthPercent)}٪+ بازدهی` : "ثبت دستی سود توسط مدیر"}
                  </span>
                </p>
                <div className="mt-1.5">
                  <span className="text-xl font-black text-amber-950 tracking-tight font-mono">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(totalGoldValue))}
                  </span>
                  <span className="text-xs mr-1 text-amber-800/70">تومان</span>
                </div>
                <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                  مجموع کل ارزش دارایی طلا (اصل + سود)
                </span>
              </div>
              <div className="p-2 bg-amber-100 border border-amber-200 rounded text-amber-900 shadow-2xs">
                <Shield className="w-4 h-4" />
              </div>
            </div>

            {/* Transparent Financial Breakdown: Principal + Profit = Total */}
            <div className="mt-3 pt-3 border-t border-amber-200/70 space-y-1.5 text-xs font-sans">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-900 font-medium flex items-center gap-1">
                  <span>💰 اصل واریزی ({toPersianDigits(completedMonthsCount)} ماه پرداخت‌شده):</span>
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(totalGoldDeposits)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-800 font-medium flex items-center gap-1">
                  <span>📈 مجموع سود تا این لحظه:</span>
                </span>
                <span className="font-mono font-black text-emerald-700">
                  {hasRegisteredProfit ? `+${formatCurrency(goldProfitToman)}` : (goldProfitToman === 0 ? "۰ تومان (در انتظار ثبت مدیر)" : formatCurrency(goldProfitToman))}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-amber-200 text-amber-950">
                <span className="font-bold">🪙 مجموع کل ارزش روز دارایی:</span>
                <span className="font-mono font-black text-amber-950">
                  {formatCurrency(totalGoldValue)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-amber-800 pt-0.5">
                <span>سهم هر عضو ({toPersianDigits(totalActiveShares)} سهم):</span>
                <span className="font-mono font-bold">{formatCurrency(goldTotalPerShare)}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dynamic score weight explainer */}
        <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-150 flex flex-col md:flex-row gap-4 items-center">
          <div className="p-3 bg-white border border-teal-100 rounded-lg text-teal-700 shadow-sm shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span>سیستم ارزیابی خوش‌حسابی اعضا</span>
              <span className="bg-teal-700 text-[10px] text-white px-2 py-0.5 rounded">تصمیم اعضا در هر دوره</span>
            </h4>
            <p className="text-[11px] text-teal-850/90 leading-relaxed">
              در هر دوره، با توجه به تصمیم و توافق اعضای صندوق، میزان و نحوه اعمال خوش‌حسابی در فرآیند قرعه‌کشی تعیین می‌شود. موعد انجام قرعه‌کشی تا ۳ام هر ماه و موعد نهایی واریز اقساط تا ۵ام هر ماه شمسی است که تعجیل در پرداخت‌ها به عنوان امتیاز مثبت و خوش‌حسابی برای اعضا ثبت و محاسبه می‌گردد.
            </p>
          </div>
        </div>

        {/* Scoring board */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">اعتبار خوش‌حسابی و رده‌بندی اعضا (امتیاز زمانی)</span>
            </div>
            <span className="text-[10px] text-slate-405 font-normal">تعیین اولویت سیستمی قرعه‌کشی</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topMembers.map((member, idx) => (
              <div key={member.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-teal-100 text-[10px] font-bold text-teal-800 flex items-center justify-center font-sans">
                    {toPersianDigits(idx + 1)}
                  </div>
                  <span className="text-xs font-medium text-slate-705">{member.name}</span>
                </div>
                <span className={`text-xs font-mono font-bold tracking-wider ${member.score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                  {member.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(member.score))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Left Column (1/3 width) - History of Winners in this cycle */}
      <div className="space-y-6" id="winner-history-panel">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>تاریخچه برندگان و تسهیلات این دوره</span>
            </h4>
            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {toPersianDigits(activeCycleWinnersList.length)} برنده
            </span>
          </div>

          {activeCycleWinnersList.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              ثبت تاریخچه بعد از اولین تخصیص فعال می‌شود.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
              {activeCycleWinnersList.slice().reverse().map((lot, idx) => (
                <div 
                  key={lot.id || idx} 
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                    lot.id === latestLotteryWinner?.id 
                      ? "bg-amber-50/60 border-amber-200 shadow-2xs" 
                      : lot.loanType === "emergency" 
                        ? "bg-blue-50/50 border-blue-100" 
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-teal-50/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-slate-850">{lot.winnerName}</p>
                      {lot.id === latestLotteryWinner?.id && (
                        <span className="bg-amber-200/70 text-[9px] text-amber-900 px-1.5 py-0.2 rounded font-black">آخرین برنده</span>
                      )}
                      {lot.loanType === "emergency" && (
                        <span className="bg-blue-100 text-[9px] text-blue-850 px-1 py-0.5 rounded font-bold">وام ضروری</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{lot.monthName}</p>
                  </div>
                  <div className="text-left font-mono">
                    <p className={`font-black ${lot.loanType === "emergency" ? "text-blue-700" : "text-teal-700"}`}>
                      {formatCurrency(lot.totalPoolAmount)}
                    </p>
                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      پرداخت شد ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 space-y-1.5 border border-slate-150">
            <div className="flex justify-between">
              <span>تعداد کل ماه‌های دوره:</span>
              <span className="font-bold text-slate-700">{toPersianDigits(activeCycle?.totalMonths || 10)} ماه</span>
            </div>
            <div className="flex justify-between">
              <span>ماه‌های پرداخت‌شده تا کنون:</span>
              <span className="font-black text-teal-800">{toPersianDigits(completedMonthsCount)} ماه</span>
            </div>
            <div className="flex justify-between">
              <span>ماه‌های باقی‌مانده دوره:</span>
              <span className="font-bold text-slate-700">
                {toPersianDigits(Math.max(0, (activeCycle?.totalMonths || 10) - completedMonthsCount))} ماه
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-700">
              <span>صندوق پس‌انداز طلا (اصل):</span>
              <span className="font-black text-amber-900">{formatCurrency(totalGoldDeposits)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
