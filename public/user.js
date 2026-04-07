const auth = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
};

const elements = {
  greeting: document.getElementById("user-greeting"),
  profile: document.getElementById("user-profile"),
  orders: document.getElementById("user-orders"),
  reviews: document.getElementById("user-reviews"),
  warranties: document.getElementById("user-warranties"),
  notificationsList: document.getElementById("notifications-list"),
  notificationCount: document.getElementById("notification-count"),
  notificationToggle: document.getElementById("notification-toggle"),
  markAllReadBtn: document.getElementById("mark-all-read"),
  reviewForm: document.getElementById("review-form"),
  reviewVehicle: document.getElementById("review-vehicle"),
  warrantyForm: document.getElementById("warranty-form"),
  warrantyItemType: document.getElementById("warranty-item-type"),
  warrantyOrderSelect: document.getElementById("warranty-order-select"),
  warrantyVehicleSelect: document.getElementById("warranty-vehicle-select"),
  warrantyAccessorySelect: document.getElementById("warranty-accessory-select"),
  warrantyServiceSelect: document.getElementById("warranty-service-select"),
  tabButtons: document.querySelectorAll("[data-tab-target]"),
  cartCount: document.getElementById("cart-count")
};

let notifications = [];
let warrantyOrders = [];
let warrantyServices = [];

function requireAuth() {
  if (!auth.token || !auth.user) {
    window.location.href = "/";
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Co loi xay ra");
  }

  return data;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(value || 0);
}

function getStatusLabel(status) {
  const labels = {
    pending: "Cho xac nhan",
    confirmed: "Da xac nhan",
    shipping: "Dang giao",
    completed: "Hoan thanh",
    cancelled: "Da huy"
  };

  return labels[status] || status;
}

function getWarrantyStatusLabel(status) {
  const labels = {
    active: "Dang hieu luc",
    claimed: "Da tiep nhan",
    resolved: "Da xu ly",
    rejected: "Tu choi",
    expired: "Het han"
  };

  return labels[status] || status;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return value;
  }
}

function renderCartCount(cart) {
  const totalItems = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = String(totalItems);
  elements.cartCount.classList.toggle("hidden", totalItems <= 0);
}

function renderProfile(profile, orders) {
  elements.greeting.textContent = `Xin chao, ${profile.fullName}`;
  elements.profile.innerHTML = `
    <div class="mini-card"><strong>Ten dang nhap</strong><p>${profile.username}</p></div>
    <div class="mini-card"><strong>Ho ten</strong><p>${profile.fullName}</p></div>
    <div class="mini-card"><strong>So dien thoai</strong><p>${profile.phone || "Chua cap nhat"}</p></div>
    <div class="mini-card"><strong>Dia chi</strong><p>${profile.address || "Chua cap nhat"}</p></div>
    <div class="mini-card"><strong>Tong don da mua</strong><p>${orders.length} don</p></div>
  `;
}

function renderOrders(orders) {
  elements.orders.innerHTML = orders.length
    ? orders
        .map(
          (order) => `
            <article class="mini-card">
              <strong>Don ${order._id.slice(-6).toUpperCase()}</strong>
              <p><span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span></p>
              <p>${order.items
                .map((item) => {
                  const resource = item.itemType === "accessory" ? item.accessory : item.vehicle;
                  if (!resource) {
                    return `San pham x${item.quantity}`;
                  }
                  if (item.itemType === "vehicle") {
                    return `<a href="/product.html?slug=${resource.slug}">${resource.name}</a> x${item.quantity}`;
                  }
                  return `${resource.name} x${item.quantity}`;
                })
                .join(", ")}</p>
              <p>Thanh toan: ${order.paymentMethod === "bank_transfer" ? "Chuyen khoan ngan hang" : "Thanh toan tai cua hang"}</p>
              <p>Nhan hang: ${order.fulfillmentMethod === "delivery" ? "Ship tan noi" : "Nhan tai cua hang"}</p>
              <p>Tong thanh toan: ${formatCurrency(order.totalAmount)}</p>
              <p>Dia chi giao: ${order.shippingAddress}</p>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Chua co don hang nao. Don sau khi thanh toan se duoc luu lai o day.</p></div>`;
}

function renderReviews(reviews) {
  elements.reviews.innerHTML = reviews.length
    ? reviews
        .map(
          (review) => `
            <article class="mini-card">
              <strong><a href="/product.html?slug=${review.vehicle.slug}">${review.vehicle.name}</a> - ${review.rating}/5</strong>
              <p>${review.comment}</p>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Chua co danh gia nao. Danh gia gui xong se duoc luu lai o day.</p></div>`;
}

function renderReviewOptions(vehicles) {
  elements.reviewVehicle.innerHTML = vehicles
    .map((vehicle) => `<option value="${vehicle._id}">${vehicle.name}</option>`)
    .join("");
}

function switchTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });

  document.getElementById("orders-panel").classList.toggle("hidden", tabName !== "orders");
  document.getElementById("reviews-panel").classList.toggle("hidden", tabName !== "reviews");
  document.getElementById("warranties-panel").classList.toggle("hidden", tabName !== "warranties");
  document.getElementById("notifications-panel").classList.toggle("hidden", tabName !== "notifications");
}

function renderNotifications(list) {
  elements.notificationsList.innerHTML = list.length
    ? list
        .map((notification) => `
          <article class="mini-card${notification.isRead ? "" : " read"}">
            <div class="list-card-header">
              <strong>${notification.title}</strong>
              <span class="notification-time">${formatNotificationDate(notification.createdAt)}</span>
            </div>
            <p>${notification.message}</p>
            ${notification.link ? `<a class="ghost-btn small-btn" href="${notification.link}">Xem chi tiet</a>` : ""}
            ${notification.isRead ? "" : `<button class=\"ghost-btn small-btn\" onclick=\"markNotificationRead('${notification._id}')\">Danh dau da doc</button>`}
          </article>
        `)
        .join("")
    : `<div class="mini-card"><p>Chua co thong bao nao.</p></div>`;
}

function updateNotificationBadge(count) {
  const total = Number(count || 0);
  elements.notificationCount.textContent = String(total);
  elements.notificationCount.classList.toggle("hidden", total <= 0);
}

async function fetchNotifications() {
  const data = await api("/api/notifications");
  notifications = data.notifications || [];
  renderNotifications(notifications);
  updateNotificationBadge(notifications.filter((item) => !item.isRead).length);
}

async function markNotificationRead(notificationId) {
  try {
    await api(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true })
    });
    await fetchNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function markAllRead() {
  const unread = notifications.filter((item) => !item.isRead);
  await Promise.all(
    unread.map((item) =>
      api(`/api/notifications/${item._id}/read`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true })
      }).catch(() => null)
    )
  );
  await fetchNotifications();
}

function addNotification(notification) {
  notifications.unshift(notification);
  renderNotifications(notifications);
  updateNotificationBadge(notifications.filter((item) => !item.isRead).length);
  showToast(notification.title || "Thong bao moi");
}

function getOrderItemLabel(item) {
  const resource = item.itemType === "accessory" ? item.accessory : item.vehicle;
  return resource?.name || "San pham";
}

function renderWarrantySelection() {
  const selectedType = elements.warrantyItemType.value;
  const orderOptions = warrantyOrders.map((order) => {
    const label = `Don ${order._id.slice(-6).toUpperCase()} - ${formatDate(order.createdAt)}`;
    return `<option value="${order._id}">${label}</option>`;
  });

  elements.warrantyOrderSelect.innerHTML = orderOptions.length
    ? orderOptions.join("")
    : `<option value="">Chua co don hang</option>`;

  const selectedOrder = warrantyOrders.find((order) => order._id === elements.warrantyOrderSelect.value) || warrantyOrders[0];

  const vehicleItems = (selectedOrder?.items || []).filter((item) => item.itemType === "vehicle");
  const accessoryItems = (selectedOrder?.items || []).filter((item) => item.itemType === "accessory");

  elements.warrantyVehicleSelect.innerHTML = vehicleItems.length
    ? vehicleItems.map((item) => `<option value="${item.vehicle?._id || item.vehicle}">${getOrderItemLabel(item)}</option>`).join("")
    : `<option value="">Khong co xe trong don</option>`;

  elements.warrantyAccessorySelect.innerHTML = accessoryItems.length
    ? accessoryItems.map((item) => `<option value="${item.accessory?._id || item.accessory}">${getOrderItemLabel(item)}</option>`).join("")
    : `<option value="">Khong co phu kien trong don</option>`;

  elements.warrantyServiceSelect.innerHTML = warrantyServices.length
    ? warrantyServices
        .map(
          (service) =>
            `<option value="${service._id}">${service.serviceType} - ${service.vehicle?.name || "Dich vu"} - ${formatDate(service.date)}</option>`
        )
        .join("")
    : `<option value="">Chua co lich dich vu</option>`;

  const isService = selectedType === "service";
  const isVehicle = selectedType === "vehicle";
  const isAccessory = selectedType === "accessory";

  elements.warrantyOrderSelect.classList.toggle("hidden", isService);
  elements.warrantyVehicleSelect.classList.toggle("hidden", !isVehicle);
  elements.warrantyAccessorySelect.classList.toggle("hidden", !isAccessory);
  elements.warrantyServiceSelect.classList.toggle("hidden", !isService);

  elements.warrantyOrderSelect.required = !isService;
  elements.warrantyVehicleSelect.required = isVehicle;
  elements.warrantyAccessorySelect.required = isAccessory;
  elements.warrantyServiceSelect.required = isService;
}

function getWarrantyTargetLabel(warranty) {
  if (warranty.itemType === "service") {
    return warranty.service?.serviceType || "Dich vu";
  }

  if (warranty.itemType === "vehicle") {
    return warranty.vehicle?.name || "Xe";
  }

  return warranty.accessory?.name || "Phu kien";
}

function renderWarranties(warranties) {
  elements.warranties.innerHTML = warranties.length
    ? warranties
        .map(
          (warranty) => `
            <article class="mini-card">
              <div class="list-card-header">
                <strong>${getWarrantyTargetLabel(warranty)}</strong>
                <span class="status-badge status-${warranty.status}">${getWarrantyStatusLabel(warranty.status)}</span>
              </div>
              <p>Loai: ${warranty.itemType} / ${warranty.warrantyType || "standard"}</p>
              <p>Mo ta loi: ${warranty.issueDescription || "Chua co mo ta"}</p>
              <p>Bat dau: ${formatDate(warranty.startDate)} / Het han: ${formatDate(warranty.endDate)}</p>
              <p>Ghi chu xu ly: ${warranty.resolutionNotes || "Chua co"}</p>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Chua co yeu cau bao hanh nao.</p></div>`;
}

async function loadPage() {
  try {
    const [dashboard, vehicles, warrantiesResponse, services] = await Promise.all([
      api("/api/user/dashboard"),
      api("/api/catalog/vehicles"),
      api("/api/user/warranties"),
      api("/api/service/my-services")
    ]);

    warrantyOrders = dashboard.orders || [];
    warrantyServices = Array.isArray(services) ? services : [];
    renderProfile(dashboard.profile, dashboard.orders);
    renderCartCount(dashboard.cart);
    renderOrders(dashboard.orders);
    renderReviews(dashboard.reviews);
    renderWarranties(warrantiesResponse.warranties || []);
    renderWarrantySelection();
    renderReviewOptions(vehicles);
    await fetchNotifications();

    if (window.initNotificationClient) {
      initNotificationClient({
        userId: auth.user._id,
        onNewNotification: addNotification
      });
    }
  } catch (error) {
    elements.profile.innerHTML = `<div class="mini-card"><p>${error.message}</p></div>`;
  }
}

async function submitReview(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  formData.rating = Number(formData.rating);

  try {
    await api("/api/user/reviews", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    event.target.reset();
    await loadPage();
    switchTab("reviews");
  } catch (error) {
    alert(error.message);
  }
}

async function submitWarranty(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  formData.itemType = elements.warrantyItemType.value;

  if (formData.itemType === "service") {
    delete formData.orderId;
    delete formData.vehicleId;
    delete formData.accessoryId;
  } else if (formData.itemType === "vehicle") {
    delete formData.serviceId;
    delete formData.accessoryId;
  } else {
    delete formData.serviceId;
    delete formData.vehicleId;
  }

  try {
    await api("/api/user/warranties", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    event.target.reset();
    elements.warrantyItemType.value = "vehicle";
    renderWarrantySelection();
    await loadPage();
    switchTab("warranties");
  } catch (error) {
    alert(error.message);
  }
}

if (requireAuth()) {
  document.getElementById("logout-btn").addEventListener("click", logout);
  elements.reviewForm.addEventListener("submit", submitReview);
  elements.warrantyForm.addEventListener("submit", submitWarranty);
  elements.warrantyItemType.addEventListener("change", renderWarrantySelection);
  elements.warrantyOrderSelect.addEventListener("change", renderWarrantySelection);
  elements.notificationToggle.addEventListener("click", () => switchTab("notifications"));
  elements.markAllReadBtn.addEventListener("click", markAllRead);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });
  switchTab("orders");
  loadPage();
}
