/* dsh-cam-window — browser half.
 * 视频弹窗：每 2 秒轮询 mqtt-hub 的 /api/cam/state；当 ESP32-CAM 实时流
 * （stream）运行时，在当前窗口弹出画中画视频（<img> 播放 MJPEG 流），
 * 流停止自动关闭。纯 React.createElement，无构建步骤。
 */
window.__ModuleLoader__.load({
  id: "dsh-cam-window",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const React = require("react");
    const { useState, useEffect } = React;
    const h = React.createElement;

    const HUB = "http://127.0.0.1:3000";            // mqtt-hub 地址
    const EVENTS_URL = HUB + "/api/cam/events";     // SSE 事件流（非轮询）
    const STREAM_URL = HUB + "/api/cam/preview.mjpeg";

    const DIM_KEY = "dsh-cam-window.dim";

    function CamWindow() {
      const [streaming, setStreaming] = useState(false);
      const [hidden, setHidden] = useState(false);
      const [online, setOnline] = useState(false);
      const [dim, setDim] = useState(() => {
        try { return parseInt(localStorage.getItem(DIM_KEY) || "0", 10) || 0; }
        catch { return 0; }
      });

      // 事件驱动（非轮询）：订阅 mqtt-hub 的 /api/cam/events SSE。
      // ESP32-CAM 日常不上电，不做定时询问——连接时收到一次当前状态快照，
      // 之后只由 device.online/offline、device.state 事件触发 UI 变化。
      // mqtt-hub 不在线时连接失败，指数退避重连（2s→…→最长 30s），安静重试。
      useEffect(() => {
        let alive = true;
        let timer = null;
        let controller = null;
        let buffer = "";
        const BASE_MS = 2000;
        const MAX_MS = 30000;
        let delay = BASE_MS;

        const apply = (j) => {
          if (!j) return;
          if (typeof j.online === "boolean") setOnline(j.online);
          if (typeof j.streaming === "boolean") setStreaming(j.streaming);
        };
        const handleLine = (line) => {
          if (!line.startsWith("data:")) return; // 跳过 event:/:ping 等行
          const raw = line.slice(5).trim();
          if (!raw) return;
          try { apply(JSON.parse(raw)); } catch { /* 忽略坏帧 */ }
        };

        const connect = async () => {
          try {
            const resp = await fetch(EVENTS_URL);
            if (!alive) return;
            if (!resp.ok || !resp.body) throw new Error("http " + resp.status);
            delay = BASE_MS; // 连上了：下次断线从基准重试
            controller = resp.body.getReader();
            const dec = new TextDecoder();
            buffer = "";
            for (;;) {
              const { value, done } = await controller.read();
              if (done || !alive) break;
              buffer += dec.decode(value, { stream: true });
              let idx;
              while ((idx = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, idx).replace(/\r$/, "");
                buffer = buffer.slice(idx + 1);
                if (line) handleLine(line);
              }
            }
          } catch {
            if (!alive) return;
            setOnline(false);
            setStreaming(false);
          }
          if (alive) {
            delay = Math.min(delay * 2, MAX_MS); // 失败退避；正常断流也从容重连
            timer = setTimeout(connect, delay);
          }
        };

        connect();
        return () => {
          alive = false;
          if (timer) clearTimeout(timer);
          try { controller && controller.cancel(); } catch {}
        };
      }, []);

      // 重新睁眼（stream 重新启动）时恢复弹窗
      useEffect(() => {
        if (streaming) setHidden(false);
      }, [streaming]);

      if (!streaming || hidden) return null;

      const size = dim === 0 ? { width: "480px" } : { width: "300px" };
      return h("div", {
        style: Object.assign({
          position: "fixed",
          top: "5vh",                 // 顶部居中，避免遮挡底部 prompt 输入框
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#0b1220",
          border: "1px solid #334155",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,.65)",
          fontFamily: 'system-ui, "PingFang SC", sans-serif',
        }, size),
      },
        // 标题栏
        h("div", {
          style: {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 12px", background: "#16233d", color: "#e2e8f0",
            fontSize: "12px", fontWeight: 600,
          },
        },
          h("span", null, "📷 ESP32-CAM 实时视频", online ? "" : "（离线）"),
          h("div", { style: { display: "flex", gap: "6px" } },
            h("button", {
              onClick: () => setDim(dim === 0 ? 1 : 0),
              style: { background: "transparent", border: "1px solid #475569", color: "#94a3b8", borderRadius: "6px", cursor: "pointer", fontSize: "11px", padding: "2px 8px" },
            }, dim === 0 ? "缩小" : "放大"),
            h("button", {
              onClick: () => setHidden(true),
              style: { background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: "6px", cursor: "pointer", fontSize: "11px", padding: "2px 8px" },
            }, "✕"),
          ),
        ),
        // 视频画面（MJPEG 流；加时间戳避免浏览器缓存旧流）
        h("img", {
          src: STREAM_URL + "?t=" + Date.now(),
          style: { width: "100%", display: "block", background: "#000", minHeight: "120px" },
          alt: "ESP32-CAM 实时视频",
        }),
        // 底部提示
        h("div", {
          style: { padding: "5px 12px", background: "#0f172a", color: "#64748b", fontSize: "11px" },
        }, "流运行中 · 说「看一眼你面前」可拍照解析，说「闭上眼睛」关闭"),
      );
    }

    function apply(ctx) {
      ctx.slots.register(
        { name: "shell.overlay", id: "dsh-cam-window", order: 80, inject: () => ({}) },
        CamWindow
      );
    }

    module.exports = { apply, inject: ["slots"] };
    return module.exports;
  },
});
