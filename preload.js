const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("rooney", {
  getIdentity:       ()      => ipcRenderer.invoke("get-identity"),
  readStatus:        ()      => ipcRenderer.invoke("read-status"),
  readTasks:         ()      => ipcRenderer.invoke("read-tasks"),
  writeTasks:        data    => ipcRenderer.invoke("write-tasks", data),
  writeStatus:       s       => ipcRenderer.invoke("write-status", s),
  getUptime:         ()      => ipcRenderer.invoke("get-uptime"),
  moveWindow:        (x,y)   => ipcRenderer.invoke("move-window", {x,y}),
  snapWindow:        ()      => ipcRenderer.invoke("snap-window"),
  resizeWindow:      h       => ipcRenderer.invoke("resize-window", h),
  resizeWindowFull:  (w,h)   => ipcRenderer.invoke("resize-window-full", {w,h}),
  getPosition:       ()      => ipcRenderer.invoke("get-position"),
  publishEvent:      evt     => ipcRenderer.invoke("publish-event", evt),
  getCrons:          ()      => ipcRenderer.invoke("get-crons"),
  refreshCrons:      ()      => ipcRenderer.invoke("refresh-crons"),
  getWeather:        ()      => ipcRenderer.invoke("get-weather"),
});
