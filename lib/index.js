// dsh-cam-window — host half（无 host 服务；仅声明插件存在供 client 挂载）。
export const name = "dsh-cam-window";

export function apply(ctx) {
  // 视频弹窗逻辑完全在浏览器侧（lib/client.js）：轮询 mqtt-hub 状态，
  // stream 运行时自动弹出播放 MJPEG 实时视频。
}
