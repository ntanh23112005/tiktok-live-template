import { normalizeEvent } from "./core.js";

export class TikTokSource {
  constructor(engine, changed) {
    this.engine = engine;
    this.changed = changed;
    this.conn = null;
    this.generation = 0;
    this.timer = null;
    this.state = {
      status: "disconnected",
      username: "",
      roomId: "",
      error: "",
      attempt: 0,
    };
  }
  async connect(username) {
    username = String(username || "")
      .trim()
      .replace(/^@/, "");
    if (!/^[\w.]{2,50}$/.test(username))
      throw new Error("Nhập @username TikTok, không nhập đường link.");
    this.disconnect();
    this.state.username = username;
    this.state.attempt = 0;
    this.open(this.generation);
  }
  async open(generation) {
    if (generation !== this.generation) return;
    this.state.status = "connecting";
    this.state.error = "";
    this.changed();
    try {
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } =
        await import("tiktok-live-connector");
      if (generation !== this.generation) return;
      const conn = new TikTokLiveConnection(this.state.username, {
        processInitialData: false,
        enableExtendedGiftInfo: false,
      });
      this.conn = conn;
      const valid = () => generation === this.generation && this.conn === conn;
      const retry = (error) => {
        if (!valid()) return;
        this.conn = null;
        try {
          conn.disconnect();
        } catch {}
        this.state.status = "retrying";
        this.state.error = String(
          error?.message || error || "Mất kết nối",
        ).slice(0, 400);
        const delay = Math.min(30, 2 ** Math.min(5, ++this.state.attempt));
        this.engine.log(
          "warn",
          `TikTok: ${this.state.error}. Thử lại sau ${delay} giây.`,
        );
        this.changed();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.open(generation), delay * 1000);
      };
      conn.on(ControlEvent.ERROR, (e) => {
        if (valid()) {
          this.state.error = String(e?.message || e).slice(0, 400);
          this.changed();
        }
      });
      conn.on(ControlEvent.DISCONNECTED, () =>
        retry("Phòng đã ngắt hoặc kết thúc LIVE"),
      );
      for (const [event, kind] of [
        [WebcastEvent.CHAT, "comment"],
        [WebcastEvent.GIFT, "gift"],
        [WebcastEvent.LIKE, "like"],
        [WebcastEvent.FOLLOW, "follow"],
        [WebcastEvent.SHARE, "share"],
        ...(WebcastEvent.MEMBER ? [[WebcastEvent.MEMBER,"join"]] : []),
      ]) {
        conn.on(event, (data) => {
          if (valid())
            this.engine.ingest(normalizeEvent(kind, data, this.state.roomId));
        });
      }
      try {
        const result = await conn.connect();
        if (!valid()) {
          conn.disconnect();
          return;
        }
        this.state = {
          ...this.state,
          status: "connected",
          roomId: String(result?.roomId || conn.roomId || ""),
          error: "",
          attempt: 0,
        };
        this.engine.beginSession(this.state.roomId);
        this.engine.log(
          "info",
          `Đã nhận sự kiện phòng @${this.state.username}.`,
        );
        this.changed();
      } catch (error) {
        retry(error);
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.state.status = "error";
      this.state.error = `Không tải được connector: ${error.message}. Chạy npm ci rồi mở lại.`;
      this.changed();
    }
  }
  disconnect() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    const conn = this.conn;
    this.conn = null;
    try {
      conn?.disconnect();
    } catch {}
    this.state = {
      ...this.state,
      status: "disconnected",
      error: "",
      roomId: "",
      attempt: 0,
    };
    this.changed();
  }
}
