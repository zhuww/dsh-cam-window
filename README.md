# dsh-cam-window

> ESP32-CAM 实时视频弹窗：当 mqtt-hub 上的摄像头**开始实时流**时，自动在 DSH Web UI 里弹出一个画中画视频窗口；**流停止自动关闭**。

配合 [mqtt-hub](../mqtt-hub)（通用 MQTT 物联网中枢）使用：ESP32-CAM 通过 UDP 把 JPEG 分片推给 hub，hub 重组成 MJPEG 流，本插件在浏览器侧把它显示出来。

## 行为

- 通过 **SSE** 订阅 `http://127.0.0.1:3000/api/cam/events`（不是轮询），拿到 `{"streaming": true|false}` 状态；
- `streaming=true` → 在窗口右下角弹出画中画，用 `<img>` 播放 `http://127.0.0.1:3000/api/cam/preview.mjpeg`；
- 用户手动关掉后，若流停过又重新开始（「重新睁眼」），弹窗会自动恢复；
- 纯浏览器半区实现，宿主侧 `lib/index.js` 只为声明插件存在（无 host 服务）。

## 安装

`~/.dsh/profiles/web/package.json`：

```jsonc
"dependencies": {
  "dsh-cam-window": "link:/绝对路径/dsh-cam-window"
}
```

并把 `dsh-cam-window` 加进 `dsh.profile.bundles`，然后硬刷新页面（纯 client 插件，通常无需重启 `dsh web`）。

## 配置

hub 地址当前写死在 `lib/client.js` 顶部：

```js
const HUB = "http://127.0.0.1:3000";             // mqtt-hub 地址
const EVENTS_URL = HUB + "/api/cam/events";      // SSE 事件流
const STREAM_URL = HUB + "/api/cam/preview.mjpeg";
```

换机器/换端口时改这里即可。

## 结构

```
lib/index.js    宿主半区（占位，仅声明）
lib/client.js   浏览器半区：SSE 订阅 + 画中画播放（161 行）
cordis.patch.yml
```

## License

MIT
