function initNotificationClient({ userId, onNewNotification, onConnected }) {
  if (!window.io || !userId) {
    return null;
  }

  const socket = io();

  socket.on("connect", () => {
    if (userId) {
      socket.emit("join", String(userId));
    }
    if (typeof onConnected === "function") {
      onConnected();
    }
  });

  socket.on("notification:new", (notification) => {
    if (typeof onNewNotification === "function") {
      onNewNotification(notification);
    }
  });

  socket.on("disconnect", () => {
    console.debug("Notification socket disconnected");
  });

  return socket;
}

function formatNotificationDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString || "";
  }
}
