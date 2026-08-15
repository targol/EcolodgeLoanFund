import { formatCurrency, toPersianDigits } from "./jalali";

export const DEFAULT_TELEGRAM_TEMPLATE = `🎉 <b>نتیجه قرعه‌کشی {ماه} {نام_صندوق}</b>

🏆 <b>برنده خوش‌شانس این دوره:</b>
👤 <b>{نام_برنده}</b>

💰 <b>مبلغ تسهیلات:</b> {مبلغ_وام} تومان
📅 <b>تاریخ برگزاری:</b> {تاریخ_قرعه_کشی}
📌 <b>نوع تسهیلات:</b> {نوع_وام}

🎬 <i>ویدیو و شبیه‌سازی انیمیشنی قرعه‌کشی انجام شد.</i>

✨ ضمن تبریک فراوان به برنده محترم، از تمامی اعضای خوش‌حساب صندوق بابت مشارکت صمیمانه سپاسگزاریم! 🙏`;

export interface TelegramMessageData {
  winnerName: string;
  fundName: string;
  monthName: string;
  amountStr: string;
  dateStr: string;
  loanTypeStr: string;
}

export function formatTelegramMessage(
  template: string,
  data: TelegramMessageData
): string {
  let msg = template || DEFAULT_TELEGRAM_TEMPLATE;

  msg = msg.replace(/\{نام_برنده\}|\{winner_name\}/g, data.winnerName);
  msg = msg.replace(/\{نام_صندوق\}|\{fund_name\}/g, data.fundName);
  msg = msg.replace(/\{ماه\}|\{month_name\}/g, data.monthName);
  msg = msg.replace(/\{مبلغ_وام\}|\{amount\}/g, data.amountStr);
  msg = msg.replace(/\{تاریخ_قرعه_کشی\}|\{draw_date\}/g, data.dateStr);
  msg = msg.replace(/\{نوع_وام\}|\{loan_type\}/g, data.loanTypeStr);

  return msg;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return {
      success: false,
      error: "توکن ربات یا شناسه چت (Chat ID) گروه تلگرام مشخص نشده است."
    };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageText,
        parse_mode: "HTML"
      })
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data.description || "خطا در ارسال پیام به تلگرام (لطفاً توکن ربات و Chat ID را بررسی کنید)"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "خطای عدم دسترسی یا شبکه هنگام ارتباط با آدرس API تلگرام"
    };
  }
}
