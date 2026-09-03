import React, { useState, useEffect } from "react";
import { Member, Payment, FundSettings, FundCycle, PERS_MONTH_NAMES, MessageTemplate } from "../types";
import { 
  toPersianDigits, 
  formatCurrency, 
  calculatePaymentScore, 
  gregorianToJalali,
  getDaysInJalaliMonth,
  getTodayJalali,
  getPrevJalaliMonth,
  getNextJalaliMonth
} from "../utils/jalali";
import { 
  sendTelegramMessage, 
  formatTelegramMessage, 
  DEFAULT_TELEGRAM_TEMPLATE,
  INITIAL_MESSAGE_TEMPLATES,
  getTelegramDirectLink,
  formatPhoneForTelegram
} from "../utils/telegram";
import { 
  Users, UserPlus, Coins, Calendar, Check, X, AlertCircle, Trash2, Edit2,
  Settings as SettingsIcon, Save, RefreshCw, Trophy, Info, Key, Shield, Eye, EyeOff, Filter,
  Send, Bot, MessageSquare, Loader2, CheckCircle2, Radio, Image as ImageIcon, Upload, Link as LinkIcon,
  Layers, Download, Database, FileCode, Copy, CheckCircle, Code, HelpCircle,
  Phone, ExternalLink, Plus, RotateCcw, Share2, CheckCheck, BellRing, FileText, Clock,
  ChevronRight, ChevronLeft, CalendarDays, Compass
} from "lucide-react";
import LotteryDraw from "./LotteryDraw";
import CycleManager from "./CycleManager";

interface AdminPanelProps {
  members: Member[];
  payments: Payment[];
  lotteries: any[];
  settings: FundSettings;
  cycles?: FundCycle[];
  onAddMember: (name: string, password?: string, shares?: number, isFoundingMember?: boolean, phone?: string) => void;
  onUpdateMember: (id: string, updatedFields: Partial<Member>) => void;
  onRemoveMember: (id: string) => void;
  onRecordPayment: (memberId: string, day: number) => void;
  onApprovePayment?: (paymentId: string, finalDay?: number) => void;
  onUpdatePaymentDate?: (paymentId: string, newDay: number) => void;
  onRejectPayment?: (paymentId: string) => void;
  onUpdateSettings: (newSettings: Partial<FundSettings>) => void;
  onDrawSuccess: (winnerId: string, method: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual", loanType: "main" | "emergency", customAmount?: number, customWinnerDate?: string) => void;
  onUndoLottery?: (lotteryId: string) => void;
  onResetFundCycle: () => void;
  onImportDatabase?: (data: { members: Member[]; payments: Payment[]; lotteries: any[]; settings: FundSettings; cycles?: FundCycle[] }) => void;
  isDrawingActive: boolean;
  setIsDrawingActive: (val: boolean) => void;
  onToggleApplyForLoan?: (memberId: string, type: "main" | "emergency") => void;
  onAddCycle?: (newCycle: FundCycle) => void;
  onUpdateCycle?: (cycleId: string, updatedFields: Partial<FundCycle>) => void;
  onSetActiveCycle?: (cycleNumber: number) => void;
}

export default function AdminPanel({
  members,
  payments,
  lotteries,
  settings,
  cycles = [],
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onRecordPayment,
  onApprovePayment,
  onUpdatePaymentDate,
  onRejectPayment,
  onUpdateSettings,
  onDrawSuccess,
  onUndoLottery,
  onResetFundCycle,
  onImportDatabase,
  isDrawingActive,
  setIsDrawingActive,
  onToggleApplyForLoan,
  onAddCycle,
  onUpdateCycle,
  onSetActiveCycle
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"payments" | "members" | "cycles" | "draw" | "messaging" | "settings">("payments");
  
  // Active cycle computation
  const activeCycle = cycles.find(c => c.status === "active") || cycles.find(c => c.cycleNumber === settings.currentCycleNumber) || cycles[cycles.length - 1];
  const activeCycleMembers = activeCycle?.memberIds 
    ? members.filter(m => activeCycle.memberIds.includes(m.id) && m.isActive !== false) 
    : members.filter(m => m.isActive !== false);

  // Form states - Add user
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("123");
  const [newShares, setNewShares] = useState<number>(1);
  const [newIsFoundingMember, setNewIsFoundingMember] = useState<boolean>(false);
  const [formError, setFormError] = useState("");

  // Filtering list of members by lottery / activity status
  const [lotteryFilter, setLotteryFilter] = useState<"all" | "active_cycle" | "inactive" | "not_won" | "previously_won">("all");

  // Inline editing member name & password & phone states
  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [tempUserName, setTempUserName] = useState("");
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [tempUserPassword, setTempUserPassword] = useState("");
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(null);
  const [tempUserPhone, setTempUserPhone] = useState("");

  // Payment Recording & Reviewing State inline
  const [recordingPaymentForMemberId, setRecordingPaymentForMemberId] = useState<string | null>(null);
  const [paymentDayInput, setPaymentDayInput] = useState<number>(1);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentDay, setEditingPaymentDay] = useState<number>(1);
  const [isReviewingPending, setIsReviewingPending] = useState<boolean>(false);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "paid" | "unpaid">("all");

  // Unified Telegram & Messaging Hub states
  const [messagingSubTab, setMessagingSubTab] = useState<"sender" | "templates" | "settings">("sender");
  const [messageTarget, setMessageTarget] = useState<"group" | "unpaid" | "single">("unpaid");
  const [selectedSingleMemberId, setSelectedSingleMemberId] = useState<string>("");
  const [templatesList, setTemplatesList] = useState<MessageTemplate[]>(
    settings.messageTemplates && settings.messageTemplates.length > 0
      ? settings.messageTemplates
      : INITIAL_MESSAGE_TEMPLATES
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    settings.messageTemplates?.[1]?.id || settings.messageTemplates?.[0]?.id || INITIAL_MESSAGE_TEMPLATES[1].id
  );
  const [customMessageBody, setCustomMessageBody] = useState<string>(
    (settings.messageTemplates && (settings.messageTemplates[1]?.content || settings.messageTemplates[0]?.content)) || INITIAL_MESSAGE_TEMPLATES[1].content
  );
  const [messageSendStatus, setMessageSendStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg?: string }>({ type: "idle" });
  const [copiedTextFeedback, setCopiedTextFeedback] = useState<string | null>(null);

  // Template Manager Editor States
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormTitle, setTemplateFormTitle] = useState("");
  const [templateFormCategory, setTemplateFormCategory] = useState<MessageTemplate["category"]>("reminder");
  const [templateFormBody, setTemplateFormBody] = useState("");
  const [editTplTitle, setEditTplTitle] = useState("");
  const [editTplContent, setEditTplContent] = useState("");
  const [isAddingNewTemplate, setIsAddingNewTemplate] = useState(false);
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplContent, setNewTplContent] = useState("");
  const [newTplCategory, setNewTplCategory] = useState<MessageTemplate["category"]>("custom");

  // Settings edit state
  const [editPriceAmount, setEditPriceAmount] = useState<string>(settings.monthlyAmount.toString());
  const [editSavingsAmount, setEditSavingsAmount] = useState<string>((settings.savingsAmount || 500000).toString());
  const [editFundName, setEditFundName] = useState<string>(settings.fundName);
  const [editLotteryDayOfMonth, setEditLotteryDayOfMonth] = useState<number>(settings.lotteryDayOfMonth || 1);
  const [editAutoDrawOnFirst, setEditAutoDrawOnFirst] = useState<boolean>(settings.autoDrawOnFirstOfMonth ?? true);
  const [editAdminPassword, setEditAdminPassword] = useState<string>(settings.adminPassword || "admin");
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Fund Custom Logo & Favicon
  const [editLogoUrl, setEditLogoUrl] = useState<string>(settings.logoUrl || "");

  // Database Backup, Restore, and GitLab Export states
  const [isGitLabExportModalOpen, setIsGitLabExportModalOpen] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: "idle" | "success" | "error"; msg?: string }>({ type: "idle" });
  const [isCopiedGitLabConfig, setIsCopiedGitLabConfig] = useState(false);

  const handleDownloadBackupJson = () => {
    try {
      const fullBackup = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        exportDateShamsi: toPersianDigits(gregorianToJalali(new Date())),
        settings: {
          ...settings,
          fundName: editFundName,
          monthlyAmount: Number(editPriceAmount) || settings.monthlyAmount,
          savingsAmount: Number(editSavingsAmount) || settings.savingsAmount,
          lotteryDayOfMonth: editLotteryDayOfMonth,
          autoDrawOnFirstOfMonth: editAutoDrawOnFirst,
          adminPassword: editAdminPassword,
          logoUrl: editLogoUrl,
          goldFundProfitToman: Number(editGoldProfit) !== undefined && !isNaN(Number(editGoldProfit)) ? Number(editGoldProfit) : (settings.goldFundProfitToman ?? 0),
          goldFundValueToman: Number(editGoldFundValue) || (settings.goldFundValueToman ?? (20000000 + (Number(editGoldProfit) || 0))),
          goldInvestmentNote: editGoldInvestmentNote,
          telegramBotToken: editTelegramBotToken,
          telegramChatId: editTelegramChatId,
          enableTelegramNotification: editEnableTelegram,
          telegramMessageTemplate: editTelegramMessageTemplate
        },
        members,
        payments,
        lotteries,
        cycles
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sandogh-database-backup-${toPersianDigits(settings.currentYear)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupFeedback({
        type: "success",
        msg: "نسخه پشتیبان کامل پایگاه داده (JSON) با موفقیت دانلود شد."
      });
      setTimeout(() => setBackupFeedback({ type: "idle" }), 4000);
    } catch (err: any) {
      setBackupFeedback({
        type: "error",
        msg: "خطا در تولید فایل پشتیبان: " + (err?.message || "نامشخص")
      });
    }
  };

  const handleFileUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed.members || !Array.isArray(parsed.members)) {
            throw new Error("فرمت فایل نامعتبر است (آرایه اعضا یافت نشد).");
          }
          if (onImportDatabase) {
            onImportDatabase({
              members: parsed.members,
              payments: parsed.payments || [],
              lotteries: parsed.lotteries || [],
              settings: parsed.settings || settings,
              cycles: parsed.cycles || cycles
            });
            // Update local edit form states immediately
            if (parsed.settings) {
              setEditFundName(parsed.settings.fundName || editFundName);
              setEditPriceAmount(String(parsed.settings.monthlyAmount || editPriceAmount));
              setEditSavingsAmount(String(parsed.settings.savingsAmount || editSavingsAmount));
              setEditLogoUrl(parsed.settings.logoUrl || "");
              setEditAdminPassword(parsed.settings.adminPassword || editAdminPassword);
              setEditGoldProfit(String(parsed.settings.goldFundProfitToman !== undefined ? parsed.settings.goldFundProfitToman : 0));
              setEditGoldFundValue(String(parsed.settings.goldFundValueToman || (20000000 + (parsed.settings.goldFundProfitToman || 0))));
              setEditGoldInvestmentNote(parsed.settings.goldInvestmentNote || editGoldInvestmentNote);
              setEditTelegramBotToken(parsed.settings.telegramBotToken || editTelegramBotToken);
              setEditTelegramChatId(parsed.settings.telegramChatId || editTelegramChatId);
            }
            setBackupFeedback({
              type: "success",
              msg: "پایگاه داده با موفقیت از فایل پشتیبان بازگردانی شد! 🎉"
            });
            setTimeout(() => setBackupFeedback({ type: "idle" }), 4000);
          }
        } catch (err: any) {
          setBackupFeedback({
            type: "error",
            msg: "خطا در بارگذاری فایل پشتیبان: " + (err?.message || "فرمت JSON نامعتبر")
          });
        }
      };
    }
  };

  const getGitLabConfigSnippet = () => {
    const currentDb = {
      settings: {
        ...settings,
        fundName: editFundName,
        monthlyAmount: Number(editPriceAmount) || settings.monthlyAmount,
        savingsAmount: Number(editSavingsAmount) || settings.savingsAmount,
        adminPassword: editAdminPassword,
        logoUrl: editLogoUrl,
        goldFundProfitToman: Number(editGoldProfit) !== undefined && !isNaN(Number(editGoldProfit)) ? Number(editGoldProfit) : (settings.goldFundProfitToman ?? 0),
        goldFundValueToman: Number(editGoldFundValue) || (settings.goldFundValueToman ?? (20000000 + (Number(editGoldProfit) || 0))),
        goldInvestmentNote: editGoldInvestmentNote,
        telegramBotToken: editTelegramBotToken,
        telegramChatId: editTelegramChatId,
        enableTelegramNotification: editEnableTelegram,
        telegramMessageTemplate: editTelegramMessageTemplate
      },
      members,
      payments,
      lotteries,
      cycles
    };
    return JSON.stringify(currentDb, null, 2);
  };

  // Gold Fund Valuation, Profit & Note (Entered manually by admin based on market)
  const [editGoldProfit, setEditGoldProfit] = useState<string>((settings.goldFundProfitToman !== undefined ? settings.goldFundProfitToman : 0).toString());
  const [editGoldFundValue, setEditGoldFundValue] = useState<string>((settings.goldFundValueToman || (20000000 + (settings.goldFundProfitToman || 0))).toString());
  const [editGoldInvestmentNote, setEditGoldInvestmentNote] = useState<string>(
    settings.goldInvestmentNote || "مبالغ پس‌انداز ماهانه (۵ میلیون تومان در ماه با تکمیل فیش‌ها) در صندوق طلا سرمایه‌گذاری شده و سود و ارزش روز آن در پایان دوره تعیین خواهد شد."
  );

  // Telegram Integration States
  const [editTelegramBotToken, setEditTelegramBotToken] = useState<string>(settings.telegramBotToken || "");
  const [editTelegramChatId, setEditTelegramChatId] = useState<string>(settings.telegramChatId || "");
  const [editEnableTelegram, setEditEnableTelegram] = useState<boolean>(settings.enableTelegramNotification ?? true);
  const [editTelegramMessageTemplate, setEditTelegramMessageTemplate] = useState<string>(
    settings.telegramMessageTemplate || DEFAULT_TELEGRAM_TEMPLATE
  );
  const [telegramTestStatus, setTelegramTestStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg?: string }>({ type: "idle" });

  const handleTestTelegram = async () => {
    if (!editTelegramBotToken || !editTelegramChatId) {
      setTelegramTestStatus({
        type: "error",
        msg: "لطفاً توکن ربات تلگرام و Chat ID گروه را وارد کنید."
      });
      return;
    }
    setTelegramTestStatus({ type: "loading" });
    const testMsg = formatTelegramMessage(editTelegramMessageTemplate, {
      winnerName: "تست - اقامتگاه بومگردی نمادین",
      fundName: editFundName,
      monthName: `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`,
      amountStr: formatCurrency(members.length * Number(editPriceAmount)),
      dateStr: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
      loanTypeStr: "وام اصلی (پیام آزمایشی ارسال سیستم)"
    });

    const res = await sendTelegramMessage(editTelegramBotToken, editTelegramChatId, testMsg);
    if (res.success) {
      setTelegramTestStatus({ type: "success", msg: "پیام آزمایشی با موفقیت به گروه تلگرام ارسال شد! 🎉" });
    } else {
      setTelegramTestStatus({ type: "error", msg: res.error || "خطا در ارسال پیام تلگرام" });
    }
  };

  // Sync edit states whenever settings prop changes
  React.useEffect(() => {
    setEditPriceAmount(settings.monthlyAmount.toString());
    setEditSavingsAmount((settings.savingsAmount || 500000).toString());
    setEditFundName(settings.fundName);
    setEditLotteryDayOfMonth(settings.lotteryDayOfMonth || 1);
    setEditAutoDrawOnFirst(settings.autoDrawOnFirstOfMonth ?? true);
    setEditAdminPassword(settings.adminPassword || "admin");
    setEditLogoUrl(settings.logoUrl || "");
    setEditGoldProfit((settings.goldFundProfitToman !== undefined ? settings.goldFundProfitToman : 0).toString());
    setEditGoldFundValue((settings.goldFundValueToman || (totalSavingsPaidAllTime > 0 ? totalSavingsPaidAllTime : 20000000)).toString());
    setEditGoldInvestmentNote(
      settings.goldInvestmentNote || "مبالغ پس‌انداز ماهانه (۵ میلیون تومان در ماه با تکمیل فیش‌ها) در صندوق طلا سرمایه‌گذاری شده و سود و ارزش روز آن در پایان دوره تعیین خواهد شد."
    );
    setEditTelegramBotToken(settings.telegramBotToken || "");
    setEditTelegramChatId(settings.telegramChatId || "");
    setEditEnableTelegram(settings.enableTelegramNotification ?? true);
    setEditTelegramMessageTemplate(settings.telegramMessageTemplate || DEFAULT_TELEGRAM_TEMPLATE);
    if (settings.messageTemplates && settings.messageTemplates.length > 0) {
      setTemplatesList(settings.messageTemplates);
    }
  }, [settings]);

  // Standalone Telegram Broadcast State
  const [standaloneMessage, setStandaloneMessage] = useState<string>("");
  const [standaloneSendStatus, setStandaloneSendStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg?: string }>({ type: "idle" });

  const handleSendStandaloneTelegram = async () => {
    const botToken = editTelegramBotToken || settings.telegramBotToken;
    const chatId = editTelegramChatId || settings.telegramChatId;

    if (!botToken || !chatId) {
      setStandaloneSendStatus({
        type: "error",
        msg: "لطفاً ابتدا توکن ربات تلگرام و Chat ID گروه را در فیلدهای بالا وارد کنید."
      });
      return;
    }

    if (!standaloneMessage.trim()) {
      setStandaloneSendStatus({
        type: "error",
        msg: "متن پیام نمی‌تواند خالی باشد."
      });
      return;
    }

    setStandaloneSendStatus({ type: "loading" });

    const formattedMsg = formatTelegramMessage(standaloneMessage, {
      winnerName: "نام عضو برنده",
      fundName: editFundName || settings.fundName,
      monthName: `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`,
      amountStr: formatCurrency(members.length * Number(editPriceAmount || settings.monthlyAmount)),
      dateStr: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
      loanTypeStr: "تسهیلات اصلی"
    });

    const res = await sendTelegramMessage(botToken, chatId, formattedMsg);
    if (res.success) {
      setStandaloneSendStatus({
        type: "success",
        msg: "پیام اختصاصی با موفقیت به گروه تلگرام ارسال گردید! 🎉"
      });
      setStandaloneMessage("");
    } else {
      setStandaloneSendStatus({
        type: "error",
        msg: res.error || "خطا در ارسال پیام به گروه تلگرام"
      });
    }
  };
  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  const totalAmountToCalculateScore = settings.monthlyAmount + (settings.savingsAmount || 500000);

  const handleSaveSettings = () => {
    onUpdateSettings({
      fundName: editFundName,
      monthlyAmount: Number(editPriceAmount),
      savingsAmount: Number(editSavingsAmount),
      lotteryDayOfMonth: editLotteryDayOfMonth,
      autoDrawOnFirstOfMonth: editAutoDrawOnFirst,
      adminPassword: editAdminPassword,
      logoUrl: editLogoUrl,
      goldFundProfitToman: Number(editGoldProfit) !== undefined && !isNaN(Number(editGoldProfit)) ? Number(editGoldProfit) : 0,
      goldFundValueToman: Number(editGoldFundValue) || ((totalSavingsPaidAllTime > 0 ? totalSavingsPaidAllTime : 20000000) + (Number(editGoldProfit) || 0)),
      goldFundProfitManuallySet: true,
      goldInvestmentNote: editGoldInvestmentNote,
      telegramBotToken: editTelegramBotToken,
      telegramChatId: editTelegramChatId,
      enableTelegramNotification: editEnableTelegram,
      telegramMessageTemplate: editTelegramMessageTemplate,
    });
    alert("تنظیمات عمومی، ارزش صندوق طلا، لوگو و اطلاع‌رسانی با موفقیت ذخیره گردید!");
  };
  const totalSavingsPaidAllTime = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.savingsAmount || 0), 0);
  
  // Accumulated emergency loan payments subtracted to calculate net pool
  const totalEmergencySpent = lotteries
    .filter(l => l.loanType === "emergency")
    .reduce((sum, l) => sum + (l.totalPoolAmount || 0), 0);

  const netSavingsPool = Math.max(0, totalSavingsPaidAllTime - totalEmergencySpent);

  // Active cycle unpaid members for current month
  const unpaidActiveMembers = activeCycleMembers.filter(m => {
    const payment = payments.find(p => p.memberId === m.id && p.monthName === currentMonthName && p.status === "paid");
    return !payment;
  });

  const getDynamicMessageFor = (target: "group" | "unpaid" | "single", memberId?: string, rawTemplate?: string) => {
    const tpl = rawTemplate !== undefined ? rawTemplate : customMessageBody;
    
    // Choose member for placeholder resolution
    let targetMember: Member | undefined = undefined;
    if (memberId) {
      targetMember = members.find(m => m.id === memberId);
    } else if (target === "single" && selectedSingleMemberId) {
      targetMember = members.find(m => m.id === selectedSingleMemberId);
    } else if (target === "unpaid" && unpaidActiveMembers.length > 0) {
      targetMember = unpaidActiveMembers[0];
    } else if (members.length > 0) {
      targetMember = members[0];
    }
    
    const shares = targetMember ? (activeCycle?.memberShares?.[targetMember.id] || targetMember.currentCycleShares || 1) : 1;
    const instAmt = (activeCycle?.monthlyAmount || settings.monthlyAmount) * shares;
    const savAmt = (activeCycle?.savingsAmount || settings.savingsAmount || 500000) * shares;
    const totAmt = instAmt + savAmt;
    
    // Find last winner for {نام_برنده}
    const lastLottery = lotteries && lotteries.length > 0 ? lotteries[lotteries.length - 1] : undefined;
    const lastWinnerMember = lastLottery ? members.find(m => m.id === lastLottery.winnerMemberId) : undefined;
    const winnerNameResolved = lastWinnerMember ? lastWinnerMember.name : (targetMember ? targetMember.name : "نام عضو برنده");

    return formatTelegramMessage(tpl, {
      winnerName: winnerNameResolved,
      fundName: editFundName || settings.fundName,
      monthName: currentMonthName,
      amountStr: formatCurrency(activeCycleMembers.length * (activeCycle?.monthlyAmount || settings.monthlyAmount)),
      dateStr: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/${toPersianDigits(editLotteryDayOfMonth || 1)}`,
      loanTypeStr: "تسهیلات اصلی",
      memberName: targetMember ? targetMember.name : (target === "unpaid" ? "عضو محترم" : "تمامی اعضا"),
      memberPhone: targetMember?.phone || "",
      installmentAmountStr: formatCurrency(instAmt),
      savingsAmountStr: formatCurrency(savAmt),
      totalAmountStr: formatCurrency(totAmt),
      sharesCountStr: toPersianDigits(shares),
      dueDateStr: `${toPersianDigits(editLotteryDayOfMonth || 5)}ام ${PERS_MONTH_NAMES[settings.currentMonthIndex]}`
    });
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("پر کردن نام عضو الزامی است.");
      return;
    }
    onAddMember(newName.trim(), newPassword || "123", newShares, newIsFoundingMember, newPhone.trim());
    setNewName("");
    setNewPhone("");
    setNewPassword("123");
    setNewShares(1);
    setNewIsFoundingMember(false);
    setFormError("");
  };

  const handleToggleMemberActive = (member: Member) => {
    const nextActive = member.isActive === false ? true : false;
    onUpdateMember(member.id, { isActive: nextActive });
    if (activeCycle && onUpdateCycle) {
      const currentIds = activeCycle.memberIds || [];
      let updatedIds: string[];
      if (nextActive) {
        updatedIds = currentIds.includes(member.id) ? currentIds : [...currentIds, member.id];
      } else {
        updatedIds = currentIds.filter(id => id !== member.id);
      }
      onUpdateCycle(activeCycle.id, { memberIds: updatedIds });
    }
  };

  const filteredMembers = members.filter((member) => {
    const isMemberActiveInCycle = member.isActive !== false && (!activeCycle?.memberIds || activeCycle.memberIds.includes(member.id));
    if (lotteryFilter === "active_cycle") return isMemberActiveInCycle;
    if (lotteryFilter === "inactive") return !isMemberActiveInCycle;
    if (lotteryFilter === "not_won") return isMemberActiveInCycle && !member.hasWon;
    if (lotteryFilter === "previously_won") return member.hasWon;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="admin-panel-root">
      {/* Admin Tab Header */}
      <div className="border-b border-slate-200 flex flex-wrap justify-between items-center px-6 pt-4 gap-2 bg-slate-50/50">
        <div className="flex gap-1 sm:gap-4">
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "payments"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Coins className="w-4 h-4 text-slate-400" />
            <span>ثبت و تایید پرداخت‌ها</span>
            {unpaidActiveMembers.length > 0 && (
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unpaidActiveMembers.length)} باقی‌مانده
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "members"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>تعریف رمز و اعضا</span>
          </button>

          <button
            onClick={() => setActiveTab("cycles")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "cycles"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>دوره‌ها و سوابق صندوق</span>
            <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">
              دوره ۳
            </span>
          </button>

          <button
            onClick={() => setActiveTab("draw")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 relative cursor-pointer ${
              activeTab === "draw"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Trophy className="w-4 h-4 text-slate-400" />
            <span>برگزاری قرعه‌کشی</span>
            {activeCycleMembers.filter(m => !m.hasWon).length > 0 && (
              <span className="absolute top-1 -left-2 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("messaging")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 relative cursor-pointer ${
              activeTab === "messaging"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>پیام‌رسانی و تلگرام</span>
            {unpaidActiveMembers.length > 0 && (
              <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unpaidActiveMembers.length)} فیش ثبت‌نشده
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "settings"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-slate-400" />
            <span>تنظیمات عمومی</span>
          </button>
        </div>
        
        <div className="pb-4">
          <span className="text-[10px] font-sans font-black bg-teal-50 text-teal-800 border border-teal-150 px-2.5 py-1 rounded">
            پنل فرماندهی {settings.fundName}
          </span>
        </div>
      </div>

      {/* Admin Body Content */}
      <div className="p-6">
        
        {/* Tab 1: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="space-y-4" id="admin-payments-subview">
            {/* Shamsi Month & Accounting Period Navigator Banner */}
            <div className="p-4 bg-white border border-teal-200/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-teal-900 text-white flex items-center justify-center shadow-md shadow-teal-900/10 shrink-0">
                  <CalendarDays className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">تقویم و ماه حسابرسی مالی:</span>
                    <span className="text-xs font-black text-teal-950 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      {PERS_MONTH_NAMES[settings.currentMonthIndex]} {toPersianDigits(settings.currentYear)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ثبت فیش‌ها، لیست وصولی‌ها، بدهکاران و محاسبات تراز بر اساس ماه انتخابی زیر انجام می‌شود.
                  </p>
                </div>
              </div>

              {/* Month Switcher Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {/* Previous Month */}
                <button
                  type="button"
                  onClick={() => {
                    const prev = getPrevJalaliMonth(settings.currentYear, settings.currentMonthIndex);
                    onUpdateSettings({
                      currentYear: prev.year,
                      currentMonthIndex: prev.monthIndex
                    });
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="رفتن به ماه قبل"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <span>ماه قبل</span>
                </button>

                {/* Direct Month Select */}
                <select
                  value={settings.currentMonthIndex}
                  onChange={(e) => {
                    onUpdateSettings({
                      currentMonthIndex: parseInt(e.target.value, 10)
                    });
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs font-sans"
                >
                  {PERS_MONTH_NAMES.map((mName, idx) => (
                    <option key={idx} value={idx}>
                      ماه {toPersianDigits(idx + 1)}: {mName}
                    </option>
                  ))}
                </select>

                {/* Direct Year Select */}
                <select
                  value={settings.currentYear}
                  onChange={(e) => {
                    onUpdateSettings({
                      currentYear: parseInt(e.target.value, 10)
                    });
                  }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs font-sans"
                >
                  {[1403, 1404, 1405, 1406, 1407, 1408].map((yr) => (
                    <option key={yr} value={yr}>
                      سال {toPersianDigits(yr)}
                    </option>
                  ))}
                </select>

                {/* Next Month */}
                <button
                  type="button"
                  onClick={() => {
                    const next = getNextJalaliMonth(settings.currentYear, settings.currentMonthIndex);
                    onUpdateSettings({
                      currentYear: next.year,
                      currentMonthIndex: next.monthIndex
                    });
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="رفتن به ماه بعد"
                >
                  <span>ماه بعد</span>
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>

                {/* Go to Today Button */}
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayJalali();
                    onUpdateSettings({
                      currentYear: today.year,
                      currentMonthIndex: today.monthIndex
                    });
                    setPaymentDayInput(today.day);
                    if (editingPaymentId) {
                      setEditingPaymentDay(today.day);
                    }
                  }}
                  className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="تنظیم خودکار تقویم و ماه حسابرسی به تاریخ امروز"
                >
                  <Compass className="w-3.5 h-3.5 text-teal-200" />
                  <span>📌 برو به امروز ({toPersianDigits(getTodayJalali().day)} {getTodayJalali().monthName})</span>
                </button>
              </div>
            </div>

            {/* Pending Receipts Alert & Unpaid Members Notification */}
            {activeCycleMembers.some(m => payments.some(p => p.memberId === m.id && p.monthName === currentMonthName && p.status === "pending_approval")) && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 font-sans shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-black text-amber-950">
                      تعداد {toPersianDigits(activeCycleMembers.filter(m => payments.some(p => p.memberId === m.id && p.monthName === currentMonthName && p.status === "pending_approval")).length)} فیش واریزی جدید توسط اعضا ثبت شده و در انتظار تایید نهایی شماست.
                    </span>
                    <span className="block text-[10px] text-amber-750 font-normal mt-0.5">
                      شما می‌توانید تاریخ واریز را بررسی، در صورت نیاز اصلاح کرده و فیش را نهایی کنید.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("pending")}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  فیلتر فیش‌های در انتظار تایید
                </button>
              </div>
            )}

            {unpaidActiveMembers.length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900 font-sans shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <span className="font-black text-rose-950">تعداد {toPersianDigits(unpaidActiveMembers.length)} عضو هنوز فیش واریزی ماه {currentMonthName} را ثبت نکرده‌اند.</span>
                    <span className="block text-[10px] text-rose-700 font-normal mt-0.5">می‌توانید با استفاده از سامانه پیام‌رسانی، به شماره همراه آن‌ها در تلگرام یادآوری بفرستید.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("messaging");
                    setMessageTarget("unpaid");
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>📢 ارسال پیام یادآوری تلگرام به همه ({toPersianDigits(unpaidActiveMembers.length)} نفر)</span>
                </button>
              </div>
            )}

            {/* Filter Tabs & Scope Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Payment Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  همه اعضا ({toPersianDigits(activeCycleMembers.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("pending")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    paymentFilter === "pending" 
                      ? "bg-amber-600 text-white shadow-sm" 
                      : "text-amber-800 hover:bg-amber-100/50"
                  }`}
                >
                  <span>⏳ در انتظار تایید</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${paymentFilter === "pending" ? "bg-white text-amber-800" : "bg-amber-200 text-amber-900"}`}>
                    {toPersianDigits(activeCycleMembers.filter(m => payments.some(p => p.memberId === m.id && p.monthName === currentMonthName && p.status === "pending_approval")).length)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("paid")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentFilter === "paid" ? "bg-teal-700 text-white shadow-sm" : "text-teal-800 hover:bg-teal-100/50"
                  }`}
                >
                  وصول‌شده ({toPersianDigits(activeCycleMembers.filter(m => payments.some(p => p.memberId === m.id && p.monthName === currentMonthName && p.status === "paid")).length)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter("unpaid")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentFilter === "unpaid" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 hover:bg-rose-100/50"
                  }`}
                >
                  پرداخت‌نشده ({toPersianDigits(unpaidActiveMembers.length)})
                </button>
              </div>

              {/* Active Cycle Badge */}
              <div className="text-[11px] font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-150 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                <span>{activeCycle?.title || 'دوره جاری'} ({toPersianDigits(activeCycleMembers.length)} عضو)</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs min-w-[850px] whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 col-span-1 border-t-0 border-r-0 border-l-0">
                  <tr>
                    <th className="p-3.5">نام عضو و سهم</th>
                    <th className="p-3.5">وضعیت واریزی ماه جاری</th>
                    <th className="p-3.5">شماره تماس / تلگرام</th>
                    <th className="p-3.5">تاریخ فیش (روز ماه)</th>
                    <th className="p-3.5">مبلغ تعهد کل</th>
                    <th className="p-3.5">امتیاز خوش‌حسابی</th>
                    <th className="p-3.5 text-center">عملیات بررسی، تایید و ویرایش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {activeCycleMembers
                    .filter((member) => {
                      const payment = payments.find(p => p.memberId === member.id && p.monthName === currentMonthName);
                      if (paymentFilter === "pending") return payment?.status === "pending_approval";
                      if (paymentFilter === "paid") return payment?.status === "paid";
                      if (paymentFilter === "unpaid") return !payment || payment.status === "unpaid";
                      return true;
                    })
                    .map((member) => {
                    const payment = payments.find(p => p.memberId === member.id && p.monthName === currentMonthName);
                    const isPaid = payment?.status === "paid";
                    const isPending = payment?.status === "pending_approval";
                    const memberShares = activeCycle?.memberShares?.[member.id] || member.currentCycleShares || 1;
                    const calculatedInstallment = (activeCycle?.monthlyAmount || settings.monthlyAmount) * memberShares;
                    const calculatedSavings = (activeCycle?.savingsAmount || settings.savingsAmount || 500000) * memberShares;
                    const totalCommitment = calculatedInstallment + calculatedSavings;
                    
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-850">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-slate-100 text-slate-605 flex items-center justify-center font-bold text-xs uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-805">{member.name}</span>
                                {member.isFoundingMember && (
                                  <span className="bg-amber-50 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-black border border-amber-200">
                                    ⭐️ هیئت موسس
                                  </span>
                                )}
                                {memberShares > 1 && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.2 rounded font-black border border-indigo-200">
                                    {toPersianDigits(memberShares)} سهم
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {member.hasWon && (
                                  <span className="bg-slate-100 text-[9px] px-1.5 py-0.2 rounded border border-slate-200 mr-1 inline-block text-slate-500 font-bold">
                                    برنده وام اصلی ({member.winMonth})
                                  </span>
                                )}
                                {member.isAppliedForLoan && (
                                  <span className="bg-teal-50 text-teal-800 text-[9px] px-1 py-0.2 rounded border border-teal-100 font-bold animate-pulse">
                                    تقاضای فعال وام اصلی
                                  </span>
                                )}
                                {member.isAppliedForEmergency && (
                                  <span className="bg-blue-50 text-blue-800 text-[9px] px-1 py-0.2 rounded border border-blue-100 font-bold">
                                    متقاضی وام ضروری
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <div>
                              <span className="text-teal-700 bg-teal-50 text-[10px] px-2.5 py-1 rounded border border-teal-100 font-black inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> تایید و وصول شد
                              </span>
                              {payment?.approvedAtShamsi && (
                                <span className="block text-[9px] text-slate-400 mt-0.5">تایید: {payment.approvedAtShamsi}</span>
                              )}
                            </div>
                          ) : isPending ? (
                            <div>
                              <span className="text-amber-800 bg-amber-100 text-[10px] px-2.5 py-1 rounded border border-amber-300 font-black inline-flex items-center gap-1 animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> ⏳ در انتظار تایید نهایی فیش
                              </span>
                              {payment?.receiptNote && (
                                <span className="block text-[9px] text-slate-600 mt-1 max-w-[160px] truncate" title={payment.receiptNote}>
                                  پیگیری: {payment.receiptNote}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-rose-500 bg-rose-50 text-[10px] px-2.5 py-1 rounded border border-rose-100 font-bold inline-flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> پرداخت نشده
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {member.phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-600">{toPersianDigits(member.phone)}</span>
                              {!isPaid && !isPending && (
                                <a
                                  href={getTelegramDirectLink(member.phone, getDynamicMessageFor("unpaid", member.id))}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 px-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded border border-sky-200 text-[9px] font-bold inline-flex items-center gap-1 transition-all"
                                  title="ارسال یادآوری در چت تلگرام عضو"
                                >
                                  <Send className="w-2.5 h-2.5 text-sky-600" />
                                  <span>یادآوری</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">بدون شماره</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {payment ? (
                            <div>
                              <span className="font-bold text-slate-800">{payment.paymentDateShamsi}</span>
                              <span className="text-[10px] text-slate-400 block">(روز {toPersianDigits(payment.paymentDayShamsi)}ام ماه)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          <span className="font-bold">{formatCurrency(payment ? (payment.amount + payment.savingsAmount) : totalCommitment)}</span>
                          <span className="text-[9px] text-slate-400 block font-sans">
                            ({formatCurrency(payment?.amount || calculatedInstallment)} قسط + {formatCurrency(payment?.savingsAmount || calculatedSavings)} طلا)
                          </span>
                        </td>
                        <td className="p-3.5">
                          {isPaid && payment ? (
                            <span className={`font-mono font-bold ${payment.scoreDelta >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                              {payment.scoreDelta >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(payment.scoreDelta))}
                            </span>
                          ) : isPending && payment ? (
                            <span className="font-mono text-[11px] text-amber-700 font-bold">
                              پیش‌بینی: {payment.scoreDelta >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(payment.scoreDelta))}
                            </span>
                          ) : (
                            <span className="text-slate-400">نامشخص</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center">
                            {/* IF ADMIN IS CURRENTLY REVIEWING / EDITING THIS PAYMENT */}
                            {editingPaymentId === (payment?.id || member.id) ? (
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 flex flex-col gap-3 min-w-[280px] max-w-sm text-right shadow-md">
                                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-700">
                                    {isReviewingPending ? "بررسی و تغییر تاریخ فیش واریزی:" : "ویرایش تاریخ فیش ثبت‌شده:"}
                                  </span>
                                  <span className="text-[10px] font-black text-teal-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                    روز {toPersianDigits(editingPaymentDay)}ام برج
                                  </span>
                                </div>

                                {payment?.receiptNote && (
                                  <div className="p-2 bg-white rounded border border-amber-200 text-[10px] text-slate-700">
                                    <span className="font-bold text-slate-500">یادداشت عضو:</span> {payment.receiptNote}
                                  </div>
                                )}

                                {/* Graphical Shamsi Calendar Grid Selector for Admin */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-bold text-slate-500 block">
                                      روز دقیق واریز ({PERS_MONTH_NAMES[settings.currentMonthIndex]} {toPersianDigits(settings.currentYear)}):
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const today = getTodayJalali();
                                        if (settings.currentMonthIndex !== today.monthIndex || settings.currentYear !== today.year) {
                                          onUpdateSettings({ currentMonthIndex: today.monthIndex, currentYear: today.year });
                                        }
                                        setEditingPaymentDay(today.day);
                                      }}
                                      className="text-[9px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 transition-all cursor-pointer flex items-center gap-0.5"
                                      title="تنظیم به روز جاری"
                                    >
                                      <span>📌 امروز ({toPersianDigits(getTodayJalali().day)})</span>
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-7 gap-1 text-center bg-white p-2 rounded-lg border border-slate-150 shadow-inner font-sans">
                                    {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w, index) => (
                                      <span key={index} className="text-[9px] text-slate-400 font-bold py-0.5">{w}</span>
                                    ))}
                                    {Array.from({ length: getDaysInJalaliMonth(settings.currentYear, settings.currentMonthIndex) }, (_, idx) => {
                                      const dayNum = idx + 1;
                                      const isSelected = editingPaymentDay === dayNum;
                                      const isEarly = dayNum <= settings.lotteryDayOfMonth;
                                      const isToday = getTodayJalali().day === dayNum && getTodayJalali().monthIndex === settings.currentMonthIndex && getTodayJalali().year === settings.currentYear;
                                      return (
                                        <button
                                          key={dayNum}
                                          type="button"
                                          onClick={() => setEditingPaymentDay(dayNum)}
                                          className={`h-7 rounded text-[11px] font-mono font-bold transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                                            isSelected 
                                              ? "bg-teal-700 text-white font-black scale-105 shadow-sm border border-teal-800 ring-2 ring-teal-500/50"
                                              : isEarly
                                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200"
                                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                                          }`}
                                          title={isEarly ? `تعجیل خوش‌حسابی (روز ${dayNum})` : `تاخیر دیرکرد (روز ${dayNum})`}
                                        >
                                          <span>{toPersianDigits(dayNum)}</span>
                                          {isToday && !isSelected && (
                                            <span className="w-1 h-1 rounded-full bg-teal-800 absolute bottom-0.5" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-500">امتیاز نهایی خوش‌حسابی:</span>
                                  {member.hasWon ? (
                                    <span className="font-bold text-teal-700">۰ امتیاز (معاف - برنده وام)</span>
                                  ) : (
                                    <span className={`font-bold font-mono ${calculatePaymentScore(editingPaymentDay, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                                      {calculatePaymentScore(editingPaymentDay, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? '+' : ''}
                                      {toPersianDigits(new Intl.NumberFormat("en-US").format(calculatePaymentScore(editingPaymentDay, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score))}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200">
                                  {isReviewingPending && payment ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          if (onApprovePayment) {
                                            onApprovePayment(payment.id, editingPaymentDay);
                                          }
                                          setEditingPaymentId(null);
                                        }}
                                        className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded py-1.5 text-[10px] font-extrabold cursor-pointer transition-colors"
                                      >
                                        ✅ تایید نهایی فیش با این تاریخ
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm("آیا از رد و حذف این فیش اطمینان دارید؟")) {
                                            if (onRejectPayment) onRejectPayment(payment.id);
                                            setEditingPaymentId(null);
                                          }
                                        }}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                                      >
                                        رد فیش
                                      </button>
                                    </div>
                                  ) : payment ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          if (onUpdatePaymentDate) {
                                            onUpdatePaymentDate(payment.id, editingPaymentDay);
                                          }
                                          setEditingPaymentId(null);
                                        }}
                                        className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded py-1.5 text-[10px] font-extrabold cursor-pointer transition-colors"
                                      >
                                        💾 ذخیره تاریخ اصلاح‌شده
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm("آیا از لغو و حذف کامل این واریزی اطمینان دارید؟")) {
                                            if (onRejectPayment) onRejectPayment(payment.id);
                                            setEditingPaymentId(null);
                                          }
                                        }}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded px-2 py-1.5 text-[10px] font-bold cursor-pointer"
                                      >
                                        حذف واریزی
                                      </button>
                                    </div>
                                  ) : null}
                                  
                                  <button
                                    onClick={() => setEditingPaymentId(null)}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded py-1 text-[10px] font-bold cursor-pointer transition-colors"
                                  >
                                    انصراف
                                  </button>
                                </div>
                              </div>
                            ) : isPending && payment ? (
                              /* Case: Member submitted pending receipt */
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPaymentId(payment.id);
                                    setEditingPaymentDay(payment.paymentDayShamsi);
                                    setIsReviewingPending(true);
                                  }}
                                  className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1 animate-bounce"
                                  style={{ animationDuration: "2s" }}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>بررسی و تایید فیش</span>
                                </button>
                              </div>
                            ) : isPaid && payment ? (
                              /* Case: Payment is already paid, allow admin to edit date */
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPaymentId(payment.id);
                                    setEditingPaymentDay(payment.paymentDayShamsi);
                                    setIsReviewingPending(false);
                                  }}
                                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                  <span>تغییر تاریخ</span>
                                </button>
                              </div>
                            ) : (
                              /* Case: Member has not paid yet -> direct record */
                              <div>
                                {recordingPaymentForMemberId === member.id ? (
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 flex flex-col gap-3 min-w-[280px] max-w-sm text-right shadow-sm">
                                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                                      <span className="text-[10px] font-bold text-slate-500">تاریخ ثبت فیش توسط ادمین:</span>
                                      <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                        روز {toPersianDigits(paymentDayInput)} از ۳۰/۳۱
                                      </span>
                                    </div>

                                    {/* Graphical Shamsi Calendar Grid Selector */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-bold text-slate-500 block">
                                          روز پرداخت ({PERS_MONTH_NAMES[settings.currentMonthIndex]} {toPersianDigits(settings.currentYear)}):
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const today = getTodayJalali();
                                            if (settings.currentMonthIndex !== today.monthIndex || settings.currentYear !== today.year) {
                                              onUpdateSettings({ currentMonthIndex: today.monthIndex, currentYear: today.year });
                                            }
                                            setPaymentDayInput(today.day);
                                          }}
                                          className="text-[9px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 transition-all cursor-pointer flex items-center gap-0.5"
                                          title="تنظیم به روز جاری"
                                        >
                                          <span>📌 امروز ({toPersianDigits(getTodayJalali().day)})</span>
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-7 gap-1 text-center bg-white p-2 rounded-lg border border-slate-150 shadow-inner font-sans">
                                        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w, index) => (
                                          <span key={index} className="text-[9px] text-slate-400 font-bold py-0.5">{w}</span>
                                        ))}
                                        {Array.from({ length: getDaysInJalaliMonth(settings.currentYear, settings.currentMonthIndex) }, (_, idx) => {
                                          const dayNum = idx + 1;
                                          const isSelected = paymentDayInput === dayNum;
                                          const isEarly = dayNum <= settings.lotteryDayOfMonth;
                                          const isToday = getTodayJalali().day === dayNum && getTodayJalali().monthIndex === settings.currentMonthIndex && getTodayJalali().year === settings.currentYear;
                                          return (
                                            <button
                                              key={dayNum}
                                              type="button"
                                              onClick={() => setPaymentDayInput(dayNum)}
                                              className={`h-7 rounded text-[11px] font-mono font-bold transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                                                isSelected 
                                                  ? "bg-teal-700 text-white font-black scale-105 shadow-sm border border-teal-800 ring-2 ring-teal-500/50"
                                                  : isEarly
                                                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200"
                                                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                                              }`}
                                              title={isEarly ? `تعجیل خوش‌حسابی (روز ${dayNum})` : `تاخیر دیرکرد (روز ${dayNum})`}
                                            >
                                              <span>{toPersianDigits(dayNum)}</span>
                                              {isToday && !isSelected && (
                                                <span className="w-1 h-1 rounded-full bg-teal-800 absolute bottom-0.5" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-500">تاثیر ارزش امتیاز خوش‌حسابی:</span>
                                      {member.hasWon ? (
                                        <span className="font-bold text-teal-700">۰ امتیاز (معاف - برنده تسهیلات)</span>
                                      ) : (
                                        <span className={`font-bold font-mono ${calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                                          {calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? '+' : ''}
                                          {toPersianDigits(new Intl.NumberFormat("en-US").format(calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score))}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex gap-2 pt-1.5 border-t border-slate-200">
                                      <button
                                        onClick={() => {
                                          onRecordPayment(member.id, paymentDayInput);
                                          setRecordingPaymentForMemberId(null);
                                        }}
                                        className="flex-1 bg-teal-800 hover:bg-teal-905 text-white rounded py-1.5 text-[10px] font-extrabold cursor-pointer transition-colors"
                                      >
                                        تایید نهایی و ثبت
                                      </button>
                                      <button
                                        onClick={() => setRecordingPaymentForMemberId(null)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                                      >
                                        لغو
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRecordingPaymentForMemberId(member.id);
                                      setPaymentDayInput(1); // default to superb day 1 (early)
                                    }}
                                    className="py-1 px-3 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded text-[11px] shadow-sm transition-all cursor-pointer"
                                  >
                                    ثبت مستقیم توسط ادمین
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl text-[11px] text-slate-500 flex items-start gap-2.5 border border-slate-200 leading-relaxed font-sans">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 mb-1">مکانیزم تبارسنجیِ پرداخت</p>
                <p className="text-[10px] leading-relaxed">
                  تعجیل در هر پرداختی منجر به انباشت فزآینده اولویت در قرعه‌کشی نوبتی می‌گردد. همچنین با استفاده از تقویم شمسی موجود در دکمه "ثبت فیش واریز"، می‌توانید روز دقیق عملکرد پرداختِ عضو را بدون ورود دستی ثبت و محاسبه نمایید.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: NEW MEMBERS MANAGEMENT AND PASSWORDS */}
        {activeTab === "members" && (
          <div className="space-y-4 animate-fadeIn" id="admin-members-subview">
            
            {/* Filter and Grouping Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 font-sans">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-700 font-bold" />
                <span className="text-xs font-bold text-slate-700">فیلتر و مدیریت پرونده اعضا و وضعیت فعالیت در دوره‌ها:</span>
              </div>
              <div className="bg-white p-1 rounded-lg border border-slate-200 flex flex-wrap gap-1 text-[11px]">
                <button
                  onClick={() => setLotteryFilter("all")}
                  className={`py-1 px-2.5 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "all" ? "bg-teal-700 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-850"
                  }`}
                >
                  همه اعضا ({toPersianDigits(members.length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("active_cycle")}
                  className={`py-1 px-2.5 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "active_cycle" ? "bg-emerald-700 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-850"
                  }`}
                >
                  فعال در دوره جاری ({toPersianDigits(activeCycleMembers.length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("inactive")}
                  className={`py-1 px-2.5 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "inactive" ? "bg-slate-700 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-850"
                  }`}
                >
                  غیرفعال ({toPersianDigits(members.filter(m => m.isActive === false || (activeCycle?.memberIds && !activeCycle.memberIds.includes(m.id))).length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("not_won")}
                  className={`py-1 px-2.5 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "not_won" ? "bg-amber-500 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-850"
                  }`}
                >
                  در انتظار قرعه ({toPersianDigits(activeCycleMembers.filter(m => !m.hasWon).length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("previously_won")}
                  className={`py-1 px-2.5 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "previously_won" ? "bg-teal-600 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-850"
                  }`}
                >
                  برندگان قبلی ({toPersianDigits(members.filter(m => m.hasWon).length)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Member Profile Form with Password */}
              <div className="bg-slate-50/55 p-5 rounded-xl border border-slate-200 flex flex-col justify-between h-fit">
                <form onSubmit={handleCreateMember} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <UserPlus className="w-5 h-5 text-teal-750" />
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">تعریف و ایجاد عضو جدید</h4>
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-rose-50 text-rose-700 text-[11px] rounded-lg border border-rose-100 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام و نام خانوادگی عضو</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مهران شریفی"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">شماره تماس / موبایل (جهت ارسال پیام تلگرام)</label>
                    <input
                      type="text"
                      placeholder="مثال: 09123456789"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-all font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">رمز عبور دلخواه برای عضو (جهت ورود به پنل شخصی)</label>
                    <input
                      type="text"
                      required
                      placeholder="پیش‌فرض: 123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-all"
                    />
                  </div>

                  {/* Share selector for new member */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">تعداد سهم در صندوق:</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden">
                        <button
                          type="button"
                          disabled={newShares <= 1}
                          onClick={() => setNewShares(Math.max(1, newShares - 1))}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 font-black text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-black text-xs text-indigo-900 bg-indigo-50 min-w-[32px] text-center">
                          {toPersianDigits(newShares)} سهم
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewShares(newShares + 1)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-black text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-teal-800 font-bold flex justify-between pt-1 border-t border-slate-100">
                      <span>مبلغ تعهد ماهانه:</span>
                      <span>{formatCurrency(newShares * (settings.monthlyAmount + (settings.savingsAmount || 500000)))}</span>
                    </div>
                  </div>

                  {/* Founding Member Checkbox */}
                  <label className="flex items-center gap-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newIsFoundingMember}
                      onChange={(e) => setNewIsFoundingMember(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                    />
                    <div className="text-right">
                      <span className="text-[11px] font-black text-amber-950 block">عضو هیئت موسس / هیأت امنا</span>
                      <span className="text-[9px] text-amber-800">تعیین عضو به عنوان هیات موسس صندوق</span>
                    </div>
                  </label>

                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-[10px] text-teal-905 leading-relaxed font-bold">
                    📌 <b>تاریخ شروع عضویت:</b> پرونده جدید به محض کلیک با تاریخ امروز سیستم به فهرست ملحق شده و فیش‌های دوره‌ای آن از ماه جاری آغاز خواهد شد. تلفن همراه لزومی ندارد.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-teal-850 hover:bg-teal-900 text-white font-black rounded-lg text-xs transition-all shadow cursor-pointer text-center"
                  >
                    ثبت پرونده و تولید رمز عبور
                  </button>
                </form>
              </div>

              {/* Members List and Accounts with editable features */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">فهرست حساب‌های کاربری مصوب ({toPersianDigits(filteredMembers.length)} حساب)</h4>
                
                {filteredMembers.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                    هیچ فولدری یا پرونده‌ای با مشخصات این فیلتر منطبق نیست.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-1">
                    {filteredMembers.map((member) => {
                      const isMemberActive = member.isActive !== false && (!activeCycle?.memberIds || activeCycle.memberIds.includes(member.id));
                      return (
                      <div 
                        key={member.id} 
                        className={`p-4 rounded-xl border bg-white transition-all shadow-sm flex flex-col justify-between gap-3 ${
                          !isMemberActive 
                            ? "border-slate-300 bg-slate-50/80 ring-1 ring-slate-200" 
                            : member.hasWon 
                              ? "border-teal-200 bg-teal-50/15 ring-1 ring-teal-100" 
                              : "border-slate-200 hover:border-teal-300"
                        }`}
                      >
                        {/* Member Active Status & Cycle Toggle Toolbar Banner */}
                        <div className={`p-2.5 rounded-lg flex items-center justify-between gap-2 border transition-all ${
                          isMemberActive 
                            ? "bg-emerald-50/90 border-emerald-200 shadow-2xs" 
                            : "bg-rose-50/90 border-rose-200 shadow-2xs"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {isMemberActive ? (
                              <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-300 animate-pulse"></span>
                                وضعیت: <span className="text-emerald-800 font-extrabold">فعال در دوره {toPersianDigits(activeCycle?.cycleNumber || 3)}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-rose-950 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
                                وضعیت: <span className="text-rose-700 font-extrabold">غیرفعال در دوره جاری</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleMemberActive(member)}
                            className={`text-[11px] px-3 py-1 rounded-md font-black transition-all cursor-pointer border shadow-sm ${
                              isMemberActive
                                ? "bg-white hover:bg-rose-100 text-rose-700 hover:text-rose-800 border-rose-200 hover:border-rose-300"
                                : "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800"
                            }`}
                            title={isMemberActive ? "غیرفعال کردن این عضو در دوره جاری" : "فعال کردن این عضو در دوره جاری"}
                          >
                            {isMemberActive ? "غیرفعال‌سازی" : "فعال‌سازی در دوره"}
                          </button>
                        </div>

                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            {editingNameUserId === member.id ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input 
                                  type="text" 
                                  autoFocus
                                  value={tempUserName}
                                  onChange={(e) => setTempUserName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (tempUserName.trim()) {
                                        onUpdateMember(member.id, { name: tempUserName.trim() });
                                        alert(`نام عضو به «${tempUserName.trim()}» تغییر یافت.`);
                                      }
                                      setEditingNameUserId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingNameUserId(null);
                                    }
                                  }}
                                  className="p-1 border border-teal-500 rounded text-xs font-bold flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (tempUserName.trim()) {
                                      onUpdateMember(member.id, { name: tempUserName.trim() });
                                      alert(`نام عضو به «${tempUserName.trim()}» تغییر یافت.`);
                                    }
                                    setEditingNameUserId(null);
                                  }}
                                  className="p-1.5 bg-teal-750 text-white rounded hover:bg-teal-800 cursor-pointer"
                                  title="ذخیره نام"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNameUserId(null)}
                                  className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
                                  title="انصراف"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-800 text-sm">{member.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNameUserId(member.id);
                                    setTempUserName(member.name);
                                  }}
                                  className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded cursor-pointer transition-colors"
                                  title="ویرایش نام عضو"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Founding Member Role Switcher Button */}
                            <div className="mt-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextState = !member.isFoundingMember;
                                  onUpdateMember(member.id, { isFoundingMember: nextState });
                                }}
                                className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                  member.isFoundingMember 
                                    ? "bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs" 
                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-850 hover:border-amber-200"
                                }`}
                                title="کلیک برای تغییر مستقیم سمت عضو"
                              >
                                <span>{member.isFoundingMember ? "⭐️ هیئت موسس (تغییر)" : "عضو عادی (تعیین به عنوان موسس)"}</span>
                              </button>
                            </div>

                            <span className="text-[10px] text-slate-400 block mt-1.5">
                              عضویت از: <b>{member.joinDateShamsi}</b>
                              {member.representativeName && (
                                <span className="mr-1 text-slate-500 font-bold">({member.representativeName})</span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              مجموع اعتبار خوش‌حسابی:{" "}
                              <b className={`font-mono ${member.score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                                {member.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(member.score))}
                              </b>
                            </span>

                            {/* Participated Cycles Badges */}
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span className="text-[9px] text-slate-400">سوابق دوره‌ها:</span>
                              {(member.participatedCycles || [3]).map(cNum => (
                                <span 
                                  key={cNum}
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    cNum === (activeCycle?.cycleNumber || 3) 
                                      ? "bg-teal-50 text-teal-800 border-teal-200" 
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  دوره {toPersianDigits(cNum)}
                                </span>
                              ))}
                              {member.currentCycleShares && member.currentCycleShares > 1 && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {toPersianDigits(member.currentCycleShares)} سهم
                                </span>
                              )}
                            </div>

                            {/* Direct Share Adjuster in Active Cycle */}
                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                              <div className="text-[10px] text-slate-600">
                                <span className="font-bold text-slate-800 block">سهم در دوره فعلی:</span>
                                <span className="text-[9px] text-teal-700 font-bold">
                                  ماهانه: {formatCurrency((member.currentCycleShares || 1) * ((activeCycle?.monthlyAmount || settings.monthlyAmount) + (activeCycle?.savingsAmount || settings.savingsAmount || 500000)))}
                                </span>
                              </div>
                              <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  title="کاهش سهم"
                                  disabled={(member.currentCycleShares || 1) <= 1}
                                  onClick={() => onUpdateMember(member.id, { currentCycleShares: Math.max(1, (member.currentCycleShares || 1) - 1) })}
                                  className="px-2 py-0.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 font-black text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 py-0.5 font-black text-[11px] text-indigo-900 bg-indigo-50/50 min-w-[28px] text-center">
                                  {toPersianDigits(member.currentCycleShares || 1)}
                                </span>
                                <button
                                  type="button"
                                  title="افزایش سهم"
                                  onClick={() => onUpdateMember(member.id, { currentCycleShares: (member.currentCycleShares || 1) + 1 })}
                                  className="px-2 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-black text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-left shrink-0">
                            {member.hasWon ? (
                              <span className="bg-teal-50 text-teal-800 text-[9px] px-2 py-0.5 rounded font-black border border-teal-100">
                                برنده وام ({member.winMonth})
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded font-black border border-amber-100">
                                در نوبت تسهیلات
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Phone Number Display & Inline Editor */}
                        <div className="pt-2 border-t border-slate-100 mt-1">
                          {editingPhoneUserId === member.id ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="text" 
                                autoFocus
                                value={tempUserPhone}
                                onChange={(e) => setTempUserPhone(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    onUpdateMember(member.id, { phone: tempUserPhone.trim() });
                                    setEditingPhoneUserId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingPhoneUserId(null);
                                  }
                                }}
                                className="p-1 border border-teal-500 rounded text-xs font-mono font-bold w-36 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="09123456789"
                                dir="ltr"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateMember(member.id, { phone: tempUserPhone.trim() });
                                  setEditingPhoneUserId(null);
                                }}
                                className="p-1.5 bg-teal-750 text-white rounded hover:bg-teal-800 cursor-pointer"
                                title="ذخیره شماره"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPhoneUserId(null)}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono text-[11px]">{member.phone ? toPersianDigits(member.phone) : "بدون شماره موبایل"}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPhoneUserId(member.id);
                                    setTempUserPhone(member.phone || "");
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-teal-700 cursor-pointer"
                                  title="ویرایش شماره موبایل"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              {member.phone && (
                                <a
                                  href={getTelegramDirectLink(member.phone, getDynamicMessageFor("single", member.id))}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-[10px] font-bold border border-sky-200 flex items-center gap-1 transition-all"
                                  title="ارسال پیام تلگرام به این عضو"
                                >
                                  <Send className="w-3 h-3 text-sky-600" />
                                  <span>پیام تلگرام</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                          {editingPasswordUserId === member.id ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="text" 
                                autoFocus
                                value={tempUserPassword}
                                onChange={(e) => setTempUserPassword(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (tempUserPassword.trim()) {
                                      onUpdateMember(member.id, { password: tempUserPassword.trim() });
                                      alert(`رمز عبور ${member.name} تغییر یافت.`);
                                    }
                                    setEditingPasswordUserId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingPasswordUserId(null);
                                  }
                                }}
                                className="p-1 border border-teal-500 rounded text-xs font-bold w-28 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="رمز جدید"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempUserPassword.trim()) {
                                    onUpdateMember(member.id, { password: tempUserPassword.trim() });
                                    alert(`رمز عبور ${member.name} تغییر یافت.`);
                                  }
                                  setEditingPasswordUserId(null);
                                }}
                                className="p-1.5 bg-teal-750 text-white rounded hover:bg-teal-800 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPasswordUserId(null)}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPasswordUserId(member.id);
                                setTempUserPassword(member.password);
                              }}
                              className="text-[10px] text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Key className="w-3 h-3 text-teal-650" />
                              <span>رمز پنل: {member.password} (تغییر)</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف پرونده ${member.name} مطمئن هستید؟ فرآیند بازنشانی واریزی‌ها و امتیازات این عضو قطع خواهد شد.`)) {
                                onRemoveMember(member.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded border border-transparent hover:border-rose-100 cursor-pointer transition-all"
                            title="حذف پرونده عضو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2.5: FUND CYCLES & SENIORITY */}
        {activeTab === "cycles" && (
          <CycleManager
            cycles={cycles}
            members={members}
            payments={payments}
            settings={settings}
            onAddCycle={onAddCycle || (() => {})}
            onUpdateCycle={onUpdateCycle || (() => {})}
            onSetActiveCycle={onSetActiveCycle || (() => {})}
            onUpdateSettings={onUpdateSettings}
          />
        )}

        {/* Tab 3: DRAW LOTTERY */}
        {activeTab === "draw" && (
          <LotteryDraw 
            members={activeCycleMembers}
            settings={settings}
            lotteries={lotteries}
            onDrawSuccess={onDrawSuccess}
            onUndoLottery={onUndoLottery}
            isDrawingActive={isDrawingActive}
            setIsDrawingActive={setIsDrawingActive}
            accumulatedSavingsPool={netSavingsPool}
            onToggleApplyForLoan={onToggleApplyForLoan}
          />
        )}

        {/* Tab 4: SETTINGS AND MASTER COMMANDS */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-fadeIn" id="admin-settings-subview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fund Policy Settings */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <SettingsIcon className="w-5 h-5 text-teal-750" />
                  <h4 className="text-sm font-black text-slate-800">تعدیل سیاست‌های مالی و هویتی قرض‌الحسنه</h4>
                </div>

                <div className="space-y-4 font-sans">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام اختصاصی صندوق قرض‌الحسنه</label>
                    <input
                      type="text"
                      value={editFundName}
                      onChange={(e) => setEditFundName(e.target.value)}
                      className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                    />
                  </div>

                  {/* Fund Logo / Favicon Upload & URL Setting */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-teal-700" />
                        <span>لوگوی اختصاصی صندوق و آیکون مرورگر (Favicon)</span>
                      </label>
                      {editLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditLogoUrl("")}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          حذف و بازگشت به پیش‌فرض
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Logo Preview box */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {editLogoUrl ? (
                          <img 
                            src={editLogoUrl} 
                            alt="پیش‌نمایش لوگو" 
                            className="w-full h-full object-contain p-1"
                            onError={() => alert("آدرس تصویر معتبر نیست یا قابل بارگذاری نمی‌باشد.")}
                          />
                        ) : (
                          <div className="text-center p-1">
                            <ImageIcon className="w-5 h-5 text-slate-400 mx-auto" />
                            <span className="text-[8px] text-slate-400 block mt-0.5 font-bold">لوگوی پیش‌فرض</span>
                          </div>
                        )}
                      </div>

                      {/* Upload / Link inputs */}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 py-2 px-3 bg-white hover:bg-teal-50 text-teal-900 border border-slate-250 hover:border-teal-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-teal-700" />
                            <span>بارگذاری تصویر لوگو از سیستم</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert("حجم تصویر نباید بیشتر از ۲ مگابایت باشد.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditLogoUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="یا وارد کردن لینک مستقیم تصویر (https://...)"
                            value={editLogoUrl.startsWith("data:") ? "تصویر بارگذاری شده از سیستم" : editLogoUrl}
                            onChange={(e) => setEditLogoUrl(e.target.value)}
                            disabled={editLogoUrl.startsWith("data:")}
                            className="w-full p-1.5 px-2.5 border border-slate-200 bg-white text-slate-800 text-[11px] font-mono rounded focus:outline-none focus:border-teal-600"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-slate-500 block leading-tight">
                      💡 با تنظیم لوگو، تصویر آن در هدر اصلی سامانه و همچنین به عنوان تب‌بار (Favicon) مرورگر اعضا به صورت خودکار نمایش داده می‌شود.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">قسط وام ماهانه هر سهم (تومان)</label>
                      <input
                        type="number"
                        value={editPriceAmount}
                        onChange={(e) => setEditPriceAmount(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                      <span className="text-[10px] text-teal-700 font-mono font-bold block mt-1">
                        {formatCurrency(Number(editPriceAmount) || 0)} (هر سهم)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">پس‌انداز طلا ماهانه هر سهم (تومان)</label>
                      <input
                        type="number"
                        value={editSavingsAmount}
                        onChange={(e) => setEditSavingsAmount(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                      <span className="text-[10px] text-blue-700 font-mono font-bold block mt-1">
                        {formatCurrency(Number(editSavingsAmount) || 0)} (هر سهم)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">روز موعد قرعه‌کشی</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={editLotteryDayOfMonth}
                        onChange={(e) => setEditLotteryDayOfMonth(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        روز {toPersianDigits(editLotteryDayOfMonth)} هر ماه
                      </span>
                    </div>
                  </div>

                  {/* Summary of Monthly Payment */}
                  <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-lg flex items-center justify-between text-xs text-teal-950 font-bold">
                    <span>مجموع پرداختی ماهانه هر سهم:</span>
                    <span className="font-mono text-sm text-teal-900 bg-white px-2.5 py-1 rounded border border-teal-200 shadow-2xs">
                      {formatCurrency((Number(editPriceAmount) || 0) + (Number(editSavingsAmount) || 0))}
                    </span>
                  </div>

                  {/* Auto Draw setting */}
                  <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-teal-900">اجرای خودکار قرعه‌کشی در روز اول ماه شمسی</span>
                      <span className="text-[10px] text-slate-500">انجام خودکار محاسبه امتیازات و انتخاب برنده در تاریخ اول هر ماه</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editAutoDrawOnFirst} 
                        onChange={(e) => setEditAutoDrawOnFirst(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
                    </label>
                  </div>

                  {/* Gold Investment, Profit & Valuation Setting */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-600" />
                        ثبت دستی سود و ارزش روز دارایی طلا (صندوق پس‌انداز)
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded">
                        واریز ۵ م.ت/ماه با تکمیل فیش‌ها
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-100/60 rounded border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                      ⚠️ <strong>توجه:</strong> در صندوق طلا سود سرمایه‌گذاری درصد مشخص و ثابتی ندارد و باید در هر مرتبه توسط ادمین بر اساس ارزش روز بازار وارد شود. می‌توانید سود یا مجموع ارزش دارایی را وارد کنید تا مقدار دیگر خودکار تراز گردد.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">📈 سود تا این لحظه (تومان):</label>
                        <input
                          type="number"
                          step="100000"
                          value={editGoldProfit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditGoldProfit(val);
                            const pNum = Number(val);
                            const base = totalSavingsPaidAllTime > 0 ? totalSavingsPaidAllTime : 20000000;
                            if (!isNaN(pNum)) {
                              setEditGoldFundValue((base + pNum).toString());
                            }
                          }}
                          className="w-full p-2.5 border border-emerald-300 bg-white text-emerald-950 font-mono font-black rounded text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-emerald-800 mt-0.5 block font-mono font-bold">
                          سود: +{formatCurrency(Number(editGoldProfit) || 0)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 mb-1">🪙 مجموع کل ارزش طلا (تومان):</label>
                        <input
                          type="number"
                          step="100000"
                          value={editGoldFundValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditGoldFundValue(val);
                            const tNum = Number(val);
                            const base = totalSavingsPaidAllTime > 0 ? totalSavingsPaidAllTime : 20000000;
                            if (!isNaN(tNum)) {
                              setEditGoldProfit((Math.max(0, tNum - base)).toString());
                            }
                          }}
                          className="w-full p-2.5 border border-amber-300 bg-white text-amber-950 font-mono font-black rounded text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-amber-800 mt-0.5 block font-mono font-bold">
                          مجموع: {formatCurrency(Number(editGoldFundValue) || 0)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">یادداشت راهبردی صندوق طلا:</label>
                        <input
                          type="text"
                          value={editGoldInvestmentNote}
                          onChange={(e) => setEditGoldInvestmentNote(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 bg-white text-slate-800 rounded text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          نمایش در داشبورد و پنل اعضا
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/50">
                      <button
                        type="button"
                        onClick={() => {
                          const base = totalSavingsPaidAllTime > 0 ? totalSavingsPaidAllTime : 20000000;
                          setEditGoldProfit("0");
                          setEditGoldFundValue(base.toString());
                          setEditGoldInvestmentNote("مبالغ پس‌انداز ماهانه (۵ میلیون تومان در ماه با تکمیل فیش‌ها) در صندوق طلا سرمایه‌گذاری شده و سود و ارزش روز آن در پایان دوره تعیین خواهد شد.");
                        }}
                        className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        بازنشانی سود به ۰ (تراز با اصل واریزی‌ها)
                      </button>
                      <span className="text-[10px] text-amber-700">
                        با فشردن دکمه «ذخیره تنظیمات سیستم»، داده‌ها در کلادفلر نیز به‌روز می‌شوند.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">کد عبور ادمین جهت ورود به پنل مدیریت</label>
                    <div className="relative">
                      <input
                        type={showAdminPass ? "text" : "password"}
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Save Button */}
                  <div className="pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="w-full py-3 px-4 bg-teal-850 hover:bg-teal-900 text-white font-black rounded-lg text-xs transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>ذخیره تنظیمات عمومی و اعمال بر صندوق جاری</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Fund Emergency Box */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80 mb-3">
                    <Shield className="w-5 h-5 text-rose-600 animate-pulse" />
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">فرامین حساس بازنشانی اضطراری</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    در صورت فعال‌سازی این دکمه، کلیه تراکنش‌های واریزی، پرونده‌های عضو اضافه شده، امتیازها و تاریخچه‌های قرعه‌کشی به صورت کامل ابطال گشته و مقادیر اولیه سند پیش‌فرم بارگذاری خواهد گشت. این فرآیند غیرقابل بازگشت است.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => {
                      if (confirm("⚠️ آیا کاملاً مایل هستید کل داده‌ها و تراکنش‌های صندوق را به حالت اولیه دمو بازگردانید؟")) {
                        onResetFundCycle();
                        alert("صندوق با موفقیت بازنشانی شد.");
                      }
                    }}
                    className="py-2.5 px-5 bg-rose-50 hover:bg-rose-105 border border-rose-200 text-rose-700 hover:text-white hover:bg-rose-600 transition-all font-black rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>ریست کامل و بازنشانی دیتابیس صندوق</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DATABASE MANAGEMENT & GITLAB & CLOUDFLARE HUB */}
            <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm space-y-5" id="database-gitlab-hub">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-indigo-100 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">مرکز پایگاه داده ابری کلودفلر و مخزن گیت‌لب (Cloudflare & GitLab Hub)</h4>
                    <p className="text-[11px] text-slate-500">حفاظت دائمی از داده‌ها و اتصال به سرور ابری کلودفلر بدون وابستگی به تغییرات کد</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setBackupFeedback({ type: "idle" });
                        const res = await fetch("/api/health");
                        if (res.ok) {
                          const json = await res.json();
                          if (json.kvBound) {
                            setBackupFeedback({
                              type: "success",
                              msg: `✅ اتصال پایگاه داده ابری کلودفلر (${json.bindingName || "EcolodgeFundLoan"}) با موفقیت تأیید شد و فعال است.`
                            });
                          } else {
                            setBackupFeedback({
                              type: "error",
                              msg: "⚠️ دیتابیس ابری هنوز در کلودفلر Bind نشده است (در حال حاضر داده‌ها روی حافظه پایدار مرورگر ذخیره می‌شوند)."
                            });
                          }
                        } else {
                          setBackupFeedback({
                            type: "idle",
                            msg: "در محیط محلی (Local Preview) هستید و داده‌ها روی حافظه پایدار مرورگر ذخیره می‌شوند."
                          });
                        }
                      } catch (err) {
                        setBackupFeedback({
                          type: "idle",
                          msg: "پایگاه داده به صورت آفلاین/محلی (LocalStorage) پایدار است."
                        });
                      }
                      setTimeout(() => setBackupFeedback({ type: "idle" }), 6000);
                    }}
                    className="text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تست وضعیت اتصال KV</span>
                  </button>
                </div>
              </div>

              {/* Informative Security Notice */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/90 to-sky-50/80 border border-indigo-100 rounded-xl space-y-3 text-xs text-indigo-950 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>نحوه عملکرد دیتابیس پایدار بر روی کلودفلر (Cloudflare Pages):</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900 pr-1">
                  سامانه به صورت دو لایه طراحی شده است: <b>۱) لایه ابری Cloudflare Pages Functions</b> (دیتابیس ابری KV/D1 که با کامیت‌های گیت‌لب هرگز پاک نمی‌شود) و <b>۲) لایه کش سریع مرورگر</b>. هر پرداختی که ثبت شود هم در فضای ابری ذخیره شده و هم در مرورگر در دسترس است.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 text-[11px]">
                    <span className="font-bold text-indigo-900 block mb-0.5">☁️ اتصال مستقیم Cloudflare Pages:</span>
                    کدهای آماده بک‌اند در مسیر <code className="text-indigo-700 font-mono">functions/api/data.ts</code> قرار دارند و به محض استقرار روی Cloudflare فعال می‌شوند.
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 text-[11px]">
                    <span className="font-bold text-indigo-900 block mb-0.5">🔒 امنیت کامل در گیت‌لب:</span>
                    تغییر یا پوش کدهای جدید در مخزن گیت‌لب، دیتابیس مستقل ابری را بازنویسی نخواهد کرد.
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Download Backup */}
                <button
                  type="button"
                  onClick={handleDownloadBackupJson}
                  className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>دانلود نسخه پشتیبان دیتابیس (JSON)</span>
                  <span className="text-[10px] text-indigo-200 font-normal">ذخیره کلیه اعضا، پرداخت‌ها، لوگو و تنظیمات</span>
                </button>

                {/* 2. Upload / Restore Backup */}
                <label className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group text-center">
                  <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>بازیابی و بارگذاری دیتابیس</span>
                  <span className="text-[10px] text-emerald-100 font-normal">بارگذاری فایل بک‌آپ JSON روی هر دستگاه</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUploadBackup}
                    className="hidden"
                  />
                </label>

                {/* 3. Export Code for GitLab */}
                <button
                  type="button"
                  onClick={() => setIsGitLabExportModalOpen(true)}
                  className="p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group"
                >
                  <FileCode className="w-5 h-5 text-indigo-300 group-hover:-translate-y-0.5 transition-transform" />
                  <span>استخراج داده‌ها برای سورس گیت‌لب</span>
                  <span className="text-[10px] text-slate-300 font-normal">مشاهده و کپی کدهای دیتابیس واقعی</span>
                </button>
              </div>

              {/* Status Message */}
              {backupFeedback.type !== "idle" && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  backupFeedback.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {backupFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{backupFeedback.msg}</span>
                </div>
              )}
            </div>

            {/* GitLab Export Modal */}
            {isGitLabExportModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-black text-slate-800">کدهای کانفیگ پایگاه داده برای گیت‌لب (GitLab Seed)</h3>
                    </div>
                    <button
                      onClick={() => setIsGitLabExportModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    اگر مایل هستید اطلاعات واقعی فعلی (اعضا، سهم‌ها، لوگو و تنظیمات) به عنوان دیتای پیش‌فرض در سورس‌کد گیت‌لب قرار گیرد، می‌توانید ساختار زیر را کپی کرده یا در فایل داده‌های اولیه پروژه جایگذاری نمایید:
                  </p>

                  <div className="relative flex-1 min-h-0 bg-slate-900 rounded-xl p-4 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                      <span className="font-mono">database_snapshot.json</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getGitLabConfigSnippet());
                          setIsCopiedGitLabConfig(true);
                          setTimeout(() => setIsCopiedGitLabConfig(false), 2500);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        {isCopiedGitLabConfig ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopiedGitLabConfig ? "کپی شد!" : "کپی تمام کدها"}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-indigo-200 overflow-auto p-2 leading-relaxed flex-1 mt-2 text-left" dir="ltr">
                      {getGitLabConfigSnippet()}
                    </pre>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsGitLabExportModalOpen(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      بستن پنجره
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getGitLabConfigSnippet());
                        setIsCopiedGitLabConfig(true);
                        setTimeout(() => setIsCopiedGitLabConfig(false), 2500);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {isCopiedGitLabConfig ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopiedGitLabConfig ? "کپی شد!" : "کپی کردن کدها در کلیپ‌بورد"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Link to Unified Messaging Hub */}
            <div className="bg-gradient-to-r from-sky-50 to-teal-50 p-6 rounded-xl border border-sky-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-100 text-sky-700 rounded-xl">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">سامانه یکپارچه پیام‌رسانی و تلگرام</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    بخش‌های ارسال پیام به گروه، یادآوری با شماره تلفن اعضا و مدیریت قالب‌های آماده در تب مجزا ادغام شدند.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("messaging")}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>ورود به بخش پیام‌رسانی و تلگرام</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: UNIFIED MESSAGING & TELEGRAM HUB */}
        {activeTab === "messaging" && (
          <div className="space-y-6 animate-fadeIn" id="admin-messaging-hub">
            {/* Messaging Hub Header & Sub-tabs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sky-600" />
                  <span>سامانه یکپارچه پیام‌رسانی و تلگرام {settings.fundName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ارسال هوشمند به گروه تلگرام صندوق، یادآوری به اعضا از طریق شماره تماس، و ویرایش یا تعریف قالب‌های آماده پیام
                </p>
              </div>

              {/* Sub-tab switcher */}
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start md:self-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMessagingSubTab("sender")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    messagingSubTab === "sender" 
                      ? "bg-white text-sky-700 font-black shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال پیام هوشمند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMessagingSubTab("templates")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    messagingSubTab === "templates" 
                      ? "bg-white text-sky-700 font-black shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>قالب‌های آماده ({toPersianDigits(templatesList.length)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMessagingSubTab("settings")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    messagingSubTab === "settings" 
                      ? "bg-white text-sky-700 font-black shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>تنظیمات ربات</span>
                  {editEnableTelegram && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: SMART MESSAGE SENDER */}
            {messagingSubTab === "sender" && (
              <div className="space-y-6">
                {/* 1. Message Target Selector */}
                <div className="space-y-2 font-sans">
                  <label className="block text-xs font-black text-slate-700">۱. مخاطب پیام را انتخاب نمایید:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Target Option 1: Group Broadcast */}
                    <button
                      type="button"
                      onClick={() => {
                        setMessageTarget("group");
                        const tpl = templatesList.find(t => t.id === "tpl_new_cycle_announcement") || templatesList.find(t => t.id === "tpl_lottery") || templatesList[0];
                        if (tpl) {
                          setSelectedTemplateId(tpl.id);
                          setCustomMessageBody(tpl.content);
                        }
                      }}
                      className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        messageTarget === "group"
                          ? "bg-sky-50/80 border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${messageTarget === "group" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          عمومی
                        </span>
                      </div>
                      <div>
                        <span className="font-black text-xs text-slate-800 block">ارسال به گروه تلگرام صندوق</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">اطلاعیه‌ها، آغاز ماه و نتایج قرعه‌کشی</span>
                      </div>
                    </button>

                    {/* Target Option 2: Unpaid Members */}
                    <button
                      type="button"
                      onClick={() => {
                        setMessageTarget("unpaid");
                        const tpl = templatesList.find(t => t.id === "tpl_unpaid_overdue") || templatesList.find(t => t.id === "tpl_payment_reminder") || templatesList[0];
                        if (tpl) {
                          setSelectedTemplateId(tpl.id);
                          setCustomMessageBody(tpl.content);
                        }
                      }}
                      className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                        messageTarget === "unpaid"
                          ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                          <BellRing className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-600 text-white">
                          {toPersianDigits(unpaidActiveMembers.length)} فیش ثبت‌نشده
                        </span>
                      </div>
                      <div>
                        <span className="font-black text-xs text-slate-800 block">یادآوری به افراد بدون فیش</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">ارسال پیام اختصاصی با شماره تماس هر عضو</span>
                      </div>
                    </button>

                    {/* Target Option 3: Single Member */}
                    <button
                      type="button"
                      onClick={() => {
                        setMessageTarget("single");
                        if (!selectedSingleMemberId && members.length > 0) {
                          setSelectedSingleMemberId(members[0].id);
                        }
                      }}
                      className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        messageTarget === "single"
                          ? "bg-teal-50/80 border-teal-600 ring-2 ring-teal-600/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${messageTarget === "single" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                          تک‌عضو
                        </span>
                      </div>
                      <div>
                        <span className="font-black text-xs text-slate-800 block">ارسال مستقیم به یک عضو</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">چت تلگرام شخصی با شماره همراه عضو</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Specific Target Controls for Single Member */}
                {messageTarget === "single" && (
                  <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3 font-sans">
                    <label className="block text-xs font-black text-teal-900">عضو مورد نظر را انتخاب فرمایید:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={selectedSingleMemberId}
                        onChange={(e) => setSelectedSingleMemberId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-teal-300 text-slate-800 font-bold rounded-lg text-xs focus:outline-none focus:border-teal-700"
                      >
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.phone ? `(${toPersianDigits(m.phone)})` : "(بدون شماره تلفن)"} - {toPersianDigits(m.currentCycleShares || 1)} سهم
                          </option>
                        ))}
                      </select>

                      {/* Selected Member Quick Card */}
                      {(() => {
                        const targetM = members.find(m => m.id === selectedSingleMemberId);
                        if (!targetM) return null;
                        return (
                          <div className="bg-white p-2.5 px-3.5 rounded-lg border border-teal-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-teal-700" />
                              <span className="font-mono text-slate-700">{targetM.phone ? toPersianDigits(targetM.phone) : "شماره‌ای ثبت نشده"}</span>
                            </div>
                            {targetM.phone && (
                              <a
                                href={getTelegramDirectLink(targetM.phone, getDynamicMessageFor("single", targetM.id))}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Send className="w-3 h-3" />
                                <span>باز کردن چت تلگرام</span>
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Specific Target Controls for Unpaid Members */}
                {messageTarget === "unpaid" && (
                  <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-3 font-sans">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-rose-700" />
                        <span className="text-xs font-black text-rose-950">
                          فهرست اعضای بدون فیش ماه {currentMonthName} ({toPersianDigits(unpaidActiveMembers.length)} عضو):
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-800 font-bold">
                        می‌توانید روی دکمه ارسال هر عضو کلیک کرده تا متن یادآوری اختصاصی او در تلگرام باز شود.
                      </span>
                    </div>

                    {unpaidActiveMembers.length === 0 ? (
                      <div className="bg-white p-6 rounded-lg border border-rose-200 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>تمامی اعضای دوره جاری فیش واریزی ماه {currentMonthName} را ثبت کرده‌اند! 🎉</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {unpaidActiveMembers.map(m => {
                          const mShares = activeCycle?.memberShares?.[m.id] || m.currentCycleShares || 1;
                          const mTotal = mShares * ((activeCycle?.monthlyAmount || settings.monthlyAmount) + (activeCycle?.savingsAmount || settings.savingsAmount || 500000));
                          const memberMsg = getDynamicMessageFor("unpaid", m.id);

                          return (
                            <div key={m.id} className="bg-white p-3 rounded-lg border border-rose-200 flex flex-col justify-between gap-2 shadow-2xs">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-slate-800">{m.name}</span>
                                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100">
                                    {toPersianDigits(mShares)} سهم
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                  <span className="font-mono">{m.phone ? toPersianDigits(m.phone) : "بدون شماره"}</span>
                                  <span className="font-bold text-rose-700 font-mono">{formatCurrency(mTotal)}</span>
                                </div>
                              </div>

                              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                                {m.phone ? (
                                  <a
                                    href={getTelegramDirectLink(m.phone, memberMsg)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>ارسال در تلگرام</span>
                                  </a>
                                ) : (
                                  <span className="flex-1 py-1.5 bg-slate-100 text-slate-400 rounded text-[9px] font-bold text-center">
                                    فاقد شماره موبایل
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(memberMsg);
                                    alert(`متن پیام اختصاصی یادآوری برای ${m.name} در کلیپ‌بورد کپی شد.`);
                                  }}
                                  className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                  title="کپی متن پیام اختصاصی"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Template Selector & Editor */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span>۲. انتخاب قالب پیام آماده و ویرایش متن:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMessagingSubTab("templates")}
                      className="text-[11px] text-sky-700 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                    >
                      مدیریت و تعریف قالب‌های جدید ←
                    </button>
                  </div>

                  {/* Preset Template Chips */}
                  <div className="flex flex-wrap gap-2">
                    {templatesList.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setCustomMessageBody(tpl.content);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          selectedTemplateId === tpl.id
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>{tpl.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Tag Helper Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400">درج متغیر هوشمند در متن:</span>
                    {[
                      "{نام_عضو}",
                      "{شماره_تلفن}",
                      "{ماه}",
                      "{مبلغ_کل}",
                      "{مبلغ_قسط}",
                      "{مبلغ_پس_انداز}",
                      "{مهلت_پرداخت}",
                      "{نام_صندوق}",
                      "{تعداد_سهم}",
                      "{نام_برنده}",
                      "{تاریخ_قرعه_کشی}"
                    ].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCustomMessageBody(prev => prev + " " + tag)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-[10px] font-mono font-bold rounded border border-slate-200 cursor-pointer transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Message Body Textarea */}
                  <div className="space-y-1">
                    <textarea
                      rows={6}
                      placeholder="متن پیام را اینجا تایپ یا ویرایش فرمایید (پشتیبانی از کدهای HTML مانند <b>متن پررنگ</b>)..."
                      value={customMessageBody}
                      onChange={(e) => setCustomMessageBody(e.target.value)}
                      className="w-full p-3.5 border border-slate-250 bg-slate-50/60 focus:bg-white text-slate-800 text-xs rounded-xl font-sans leading-relaxed focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                      dir="rtl"
                    />
                  </div>

                  {/* Live Substituted Preview Card */}
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                      <span className="font-bold flex items-center gap-1 text-sky-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>پیش‌نمایش زنده پیام ارسالی (با مقادیر جایگذاری‌شده):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const previewText = getDynamicMessageFor(messageTarget);
                          navigator.clipboard.writeText(previewText);
                          alert("متن پیش‌نمایش در کلیپ‌بورد کپی شد.");
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>کپی پیش‌نمایش</span>
                      </button>
                    </div>
                    <div 
                      className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans p-1" 
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: getDynamicMessageFor(messageTarget) }}
                    />
                  </div>

                  {/* Action Buttons: Send to Group / Copy / Send to Member */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {/* Send via Bot Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editTelegramBotToken.trim() || !editTelegramChatId.trim()) {
                            alert("لطفاً توکن ربات و آیدی چت تلگرام را در تب «تنظیمات ربات» وارد نمایید.");
                            setMessagingSubTab("settings");
                            return;
                          }
                          setStandaloneSendStatus({ type: "loading", msg: "در حال ارسال پیام به گروه تلگرام..." });
                          const finalMsg = getDynamicMessageFor(messageTarget);
                          const result = await sendTelegramMessage(editTelegramBotToken, editTelegramChatId, finalMsg);
                          if (result.success) {
                            setStandaloneSendStatus({ type: "success", msg: "پیام با موفقیت به گروه تلگرام ارسال گردید!" });
                          } else {
                            setStandaloneSendStatus({ type: "error", msg: `خطا در ارسال: ${result.error || 'ناشناخته'}` });
                          }
                          setTimeout(() => setStandaloneSendStatus({ type: "idle" }), 7000);
                        }}
                        disabled={standaloneSendStatus.type === "loading"}
                        className="py-2.5 px-6 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm transition-all flex items-center gap-2"
                      >
                        {standaloneSendStatus.type === "loading" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>ارسال مستقیم به گروه تلگرام با ربات</span>
                      </button>

                      {/* Direct Telegram Link if Single member */}
                      {messageTarget === "single" && (() => {
                        const targetM = members.find(m => m.id === selectedSingleMemberId);
                        if (!targetM?.phone) return null;
                        const links = getTelegramDirectLink(targetM.phone, getDynamicMessageFor("single", targetM.id));
                        return (
                          <a
                            href={links.directChatUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Phone className="w-4 h-4" />
                            <span>باز کردن چت تلگرام {targetM.name}</span>
                          </a>
                        );
                      })()}

                      {/* Copy Text Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const msg = getDynamicMessageFor(messageTarget);
                          navigator.clipboard.writeText(msg);
                          alert("متن نهایی پیام با موفقیت در کلیپ‌بورد کپی شد.");
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>کپی کردن متن پیام</span>
                      </button>
                    </div>

                    {standaloneSendStatus.type !== "idle" && (
                      <div className={`p-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-2 ${
                        standaloneSendStatus.type === "success" 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                          : standaloneSendStatus.type === "error"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-sky-50 text-sky-800 border border-sky-200"
                      }`}>
                        {standaloneSendStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {standaloneSendStatus.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{standaloneSendStatus.msg}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: TEMPLATES MANAGEMENT */}
            {messagingSubTab === "templates" && (
              <div className="space-y-6">
                {/* Header & Create New Template Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">مدیریت و ویرایش قالب‌های پیام آماده</h4>
                    <p className="text-xs text-slate-500 mt-0.5">شما می‌توانید متن‌های پیش‌فرض را ویرایش کرده یا قالب‌های پیام جدید تعریف نمایید.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplateId("new");
                        setTemplateFormTitle("");
                        setTemplateFormCategory("custom");
                        setTemplateFormBody("");
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ تعریف قالب جدید</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("آیا مایلید تمام قالب‌ها به متن‌های استاندارد اولیه بازنشانی شوند؟")) {
                          setTemplatesList(INITIAL_MESSAGE_TEMPLATES);
                          onUpdateSettings({ messageTemplates: INITIAL_MESSAGE_TEMPLATES });
                          alert("قالب‌های پیام به حالت پیش‌فرض بازنشانی گردیدند.");
                        }
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs cursor-pointer transition-all"
                      title="بازنشانی به قالب‌های پیش‌فرض"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit / Create Template Modal / In-line Form */}
                {editingTemplateId && (
                  <div className="p-5 bg-sky-50/70 border-2 border-sky-300 rounded-xl space-y-4 font-sans animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200">
                      <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                        <Edit2 className="w-4 h-4 text-sky-700" />
                        <span>{editingTemplateId === "new" ? "تعریف و ذخیره قالب پیام جدید" : "ویرایش متن قالب آماده"}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingTemplateId(null)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-sky-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان قالب پیام:</label>
                        <input
                          type="text"
                          placeholder="مثال: یادآوری تسویه حساب پایان سال"
                          value={templateFormTitle}
                          onChange={(e) => setTemplateFormTitle(e.target.value)}
                          className="w-full p-2.5 bg-white border border-sky-250 text-slate-800 font-bold rounded-lg text-xs focus:outline-none focus:border-sky-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">دسته‌بندی موضوعی:</label>
                        <select
                          value={templateFormCategory}
                          onChange={(e) => setTemplateFormCategory(e.target.value as any)}
                          className="w-full p-2.5 bg-white border border-sky-250 text-slate-800 font-bold rounded-lg text-xs focus:outline-none focus:border-sky-600"
                        >
                          <option value="reminder">⏰ یادآوری مهلت پرداخت</option>
                          <option value="overdue">🚨 هشدار تاخیر و معوقه</option>
                          <option value="announcement">📢 آغاز دوره و واریز ماهانه</option>
                          <option value="lottery">🎉 تبریک برنده قرعه‌کشی</option>
                          <option value="receipt">✅ تاییدیه ثبت فیش</option>
                          <option value="custom">✨ پیام عمومی و سفارشی</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">متن الگو و کدها:</label>
                        <div className="flex gap-1">
                          {["{نام_عضو}", "{ماه}", "{مبلغ_کل}", "{مهلت_پرداخت}", "{نام_صندوق}"].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setTemplateFormBody(prev => prev + " " + tag)}
                              className="px-1.5 py-0.5 bg-white text-sky-700 rounded text-[9px] font-mono font-bold border border-sky-200 cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={6}
                        placeholder="متن قالب را اینجا بنویسید..."
                        value={templateFormBody}
                        onChange={(e) => setTemplateFormBody(e.target.value)}
                        className="w-full p-3 bg-white border border-sky-250 text-slate-800 text-xs rounded-lg font-sans leading-relaxed focus:outline-none focus:border-sky-600"
                        dir="rtl"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-sky-200">
                      <button
                        type="button"
                        onClick={() => setEditingTemplateId(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!templateFormTitle.trim() || !templateFormBody.trim()) {
                            alert("عنوان و متن قالب نمی‌تواند خالی باشد.");
                            return;
                          }
                          let updated: MessageTemplate[];
                          if (editingTemplateId === "new") {
                            const newTpl: MessageTemplate = {
                              id: `tpl_custom_${Date.now()}`,
                              title: templateFormTitle.trim(),
                              category: templateFormCategory,
                              content: templateFormBody.trim()
                            };
                            updated = [...templatesList, newTpl];
                          } else {
                            updated = templatesList.map(t => t.id === editingTemplateId ? {
                              ...t,
                              title: templateFormTitle.trim(),
                              category: templateFormCategory,
                              content: templateFormBody.trim()
                            } : t);
                          }
                          setTemplatesList(updated);
                          onUpdateSettings({ messageTemplates: updated });
                          setEditingTemplateId(null);
                          alert("قالب با موفقیت ذخیره گردید.");
                        }}
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-lg text-xs shadow-sm cursor-pointer"
                      >
                        ذخیره قالب پیام
                      </button>
                    </div>
                  </div>
                )}

                {/* Templates Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templatesList.map(tpl => (
                    <div key={tpl.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="font-black text-xs text-slate-800">{tpl.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                            {tpl.category === "reminder" ? "⏰ یادآوری" : tpl.category === "overdue" ? "🚨 هشدار تاخیر" : tpl.category === "lottery" ? "🎉 قرعه‌کشی" : tpl.category === "receipt" ? "✅ تاییدیه" : "📢 اطلاع‌رسانی"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto line-clamp-4">
                          {tpl.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            setCustomMessageBody(tpl.content);
                            setMessagingSubTab("sender");
                          }}
                          className="text-[11px] font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>استفاده برای ارسال ←</span>
                        </button>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplateId(tpl.id);
                              setTemplateFormTitle(tpl.title);
                              setTemplateFormCategory(tpl.category);
                              setTemplateFormBody(tpl.content);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 rounded border border-slate-200 cursor-pointer"
                            title="ویرایش این قالب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {templatesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف قالب «${tpl.title}» اطمینان دارید؟`)) {
                                  const updated = templatesList.filter(t => t.id !== tpl.id);
                                  setTemplatesList(updated);
                                  onUpdateSettings({ messageTemplates: updated });
                                }
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded border border-slate-200 cursor-pointer"
                              title="حذف قالب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: TELEGRAM BOT & GROUP CONFIG */}
            {messagingSubTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-sky-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">تنظیمات ربات و ارسال خودکار نتایج به گروه تلگرام</h4>
                        <p className="text-[11px] text-slate-500">ارسال خودکار ویدیو و نتیجه قرعه‌کشی پس از برگزاری یا در اول ماه</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editEnableTelegram} 
                        onChange={(e) => setEditEnableTelegram(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-sky-600" />
                        <span>توکن اختصاصی ربات تلگرام (Bot Token)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="123456789:AAG..."
                        value={editTelegramBotToken}
                        onChange={(e) => setEditTelegramBotToken(e.target.value)}
                        className="w-full p-2.5 border border-slate-250 bg-white text-slate-800 font-mono text-xs rounded focus:outline-none focus:border-sky-500"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">دریافت شده از ربات BotFather@ تلگرام</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                        <span>شناسه چت یا آیدی گروه (Chat ID / Username)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="-100123456789 یا @my_fund_channel"
                        value={editTelegramChatId}
                        onChange={(e) => setEditTelegramChatId(e.target.value)}
                        className="w-full p-2.5 border border-slate-250 bg-white text-slate-800 font-mono text-xs rounded focus:outline-none focus:border-sky-500"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">آیدی عددی منفی یا یوزرنام کانال/گروه تلگرام</span>
                    </div>
                  </div>

                  {/* Action Buttons & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="py-2.5 px-6 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>ذخیره تنظیمات ربات</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={telegramTestStatus.type === "loading"}
                        className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                      >
                        {telegramTestStatus.type === "loading" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>ارسال پیام آزمایشی به تلگرام</span>
                      </button>
                    </div>

                    {telegramTestStatus.type !== "idle" && (
                      <div className={`p-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-2 ${
                        telegramTestStatus.type === "success" 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                          : telegramTestStatus.type === "error"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-sky-50 text-sky-800 border border-sky-200"
                      }`}>
                        {telegramTestStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {telegramTestStatus.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{telegramTestStatus.msg}</span>
                      </div>
                    )}
                  </div>

                  {/* Instructions Guide Card */}
                  <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 space-y-2 text-xs text-amber-900 font-sans">
                    <p className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-700" />
                      <span>راهنمای اتصال سریع ربات تلگرام به گروه صندوق:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed pr-2">
                      <li>در تلگرام وارد ربات <b>BotFather@</b> شوید و فرمان <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">/newbot</code> را ارسال کرده و نام ربات را ثبت کنید.</li>
                      <li>کد توکن اختصاصی دریافتی (API Token) را کپی کرده و در فیلد بالا قرار دهید.</li>
                      <li>ربات را به گروه یا کانال تلگرام صندوق اضافه کرده و آن را به عنوان <b>مدیر (Admin)</b> با دسترسی ارسال پیام تنظیم کنید.</li>
                      <li>آیدی عددی منفی گروه (مثلاً <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">-100123456789</code>) یا یوزرنام کانال را در فیلد Chat ID وارد کرده و دکمه تست را بزنید.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
