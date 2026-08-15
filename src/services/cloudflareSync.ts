import { Member, Payment, LotteryResult, FundSettings, FundCycle } from "../types";

export interface SyncPayload {
  members: Member[];
  payments: Payment[];
  lotteries: LotteryResult[];
  settings: FundSettings;
  cycles: FundCycle[];
  lastUpdated?: string;
}

export type CloudSyncStatus = "synced" | "syncing" | "offline" | "error";

class CloudflareSyncService {
  private syncStatus: CloudSyncStatus = "synced";
  private listeners: ((status: CloudSyncStatus, detail?: string) => void)[] = [];
  private debounceTimer: any = null;

  public subscribe(listener: (status: CloudSyncStatus, detail?: string) => void) {
    this.listeners.push(listener);
    listener(this.syncStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setStatus(status: CloudSyncStatus, detail?: string) {
    this.syncStatus = status;
    this.listeners.forEach(l => l(status, detail));
  }

  public async fetchRemoteData(): Promise<SyncPayload | null> {
    try {
      this.setStatus("syncing", "در حال دریافت داده‌ها از سرور...");
      const res = await fetch("/api/data", { method: "GET" });
      if (!res.ok) {
        this.setStatus("offline", "حالت ذخیره‌سازی محلی");
        return null;
      }
      const json = await res.json();
      if (json && json.exists && json.data) {
        this.setStatus("synced", "همگام با سرور ابری");
        return json.data as SyncPayload;
      }
      this.setStatus("synced", "متصل به سرور");
      return null;
    } catch (e) {
      this.setStatus("offline", "حالت ذخیره‌سازی محلی (LocalStorage)");
      return null;
    }
  }

  public saveToCloud(payload: SyncPayload) {
    // Clear debounce
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.setStatus("syncing", "در حال ذخیره در سرور ابری...");

    this.debounceTimer = setTimeout(async () => {
      try {
        const payloadWithTime = {
          ...payload,
          lastUpdated: new Date().toISOString()
        };

        const res = await fetch("/api/data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payloadWithTime)
        });

        if (res.ok) {
          this.setStatus("synced", "ذخیره در سرور ابری با موفقیت انجام شد");
        } else {
          this.setStatus("offline", "ذخیره محلی انجام شد (سرور در دسترس نبود)");
        }
      } catch (err) {
        this.setStatus("offline", "ذخیره در حافظه محلی مرورگر");
      }
    }, 600);
  }
}

export const cloudSyncService = new CloudflareSyncService();
