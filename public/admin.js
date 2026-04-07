const auth = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
};

const elements = {
  greeting: document.getElementById("admin-greeting"),
  stats: document.getElementById("admin-stats"),
  vehicleForm: document.getElementById("vehicle-form"),
  vehicles: document.getElementById("admin-vehicles"),
  orders: document.getElementById("admin-orders"),
  users: document.getElementById("admin-users"),
  reviews: document.getElementById("admin-reviews"),
  notificationsList: document.getElementById("notifications-list-admin"),
  notificationCount: document.getElementById("notification-count"),
  notificationToggle: document.getElementById("notification-toggle"),
  markAllReadBtn: document.getElementById("mark-all-read-admin"),
  brandSelect: document.getElementById("brand-select"),
  categorySelect: document.getElementById("category-select"),
  thumbnailPreview: document.getElementById("thumbnail-preview"),
  tabButtons: document.querySelectorAll("[data-admin-tab]")
};

let notifications = [];

function requireAdmin() {
  if (!auth.token || !auth.user || auth.user.role !== "admin") {
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
  const headers = {
    Authorization: `Bearer ${auth.token}`
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    headers,
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

function renderStats(data) {
  elements.greeting.textContent = `Xin chao, ${auth.user.fullName}`;
  elements.stats.innerHTML = `
    <div class="mini-card"><strong>Khach hang</strong><p>${data.stats.totalUsers}</p></div>
    <div class="mini-card"><strong>San pham</strong><p>${data.stats.totalVehicles}</p></div>
    <div class="mini-card"><strong>Phu kien</strong><p>${data.stats.totalAccessories || 0}</p></div>
    <div class="mini-card"><strong>Don hang</strong><p>${data.stats.totalOrders}</p></div>
    <div class="mini-card"><strong>Review</strong><p>${data.stats.totalReviews}</p></div>
    <div class="mini-card"><strong>Doanh thu</strong><p>${formatCurrency(data.stats.revenue)}</p></div>
  `;
}

function renderSelectOptions(select, items) {
  select.innerHTML = items.map((item) => `<option value="${item._id}">${item.name}</option>`).join("");
}

function renderVehicles(vehicles) {
  elements.vehicles.innerHTML = vehicles
    .map(
      (vehicle) => `
        <article class="list-card">
          <img class="thumb-sm" src="${vehicle.thumbnail}" alt="${vehicle.name}" />
          <div class="list-body">
            <h3>${vehicle.name}</h3>
            <p>${vehicle.brand.name} / ${vehicle.category.name}</p>
            <strong>${formatCurrency(vehicle.salePrice || vehicle.price)}</strong>
          </div>
          <div class="inline-actions">
            <button class="ghost-btn small-btn" onclick="editVehicle('${vehicle._id}')">Sua</button>
            <button class="ghost-btn small-btn" onclick="deleteVehicle('${vehicle._id}')">Xoa</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderThumbnailPreview(src) {
  if (!src) {
    elements.thumbnailPreview.innerHTML = "";
    elements.thumbnailPreview.classList.add("hidden");
    return;
  }

  elements.thumbnailPreview.innerHTML = `
    <strong>Anh hien tai</strong>
    <img class="preview-image" src="${src}" alt="Preview" />
  `;
  elements.thumbnailPreview.classList.remove("hidden");
}

function renderUsers(users) {
  elements.users.innerHTML = users
    .filter((user) => user.role === "user")
    .map(
      (user) => `
        <article class="mini-card">
          <strong>${user.fullName}</strong>
          <p>${user.username || user.email}</p>
          <p>${user.phone || "Chua co so dien thoai"} / ${user.address || "Chua co dia chi"}</p>
        </article>
      `
    )
    .join("");
}

function renderReviews(reviews) {
  elements.reviews.innerHTML = reviews.length
    ? reviews
        .map(
          (review) => `
            <article class="mini-card">
              <strong>${review.user.fullName} - ${review.vehicle.name}</strong>
              <p>${review.rating}/5 / ${review.comment}</p>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Chua co review.</p></div>`;
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

function renderOrders(orders) {
  elements.orders.innerHTML = orders.length
    ? orders
        .map(
          (order) => `
            <article class="mini-card">
              <strong>Don ${order._id.slice(-6).toUpperCase()} / ${order.user?.fullName || "Khach hang"}</strong>
              <p><span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span></p>
              <p>${order.items
                .map((item) => {
                  const resource = item.itemType === "accessory" ? item.accessory : item.vehicle;
                  return `${resource?.name || "San pham"} x${item.quantity}`;
                })
                .join(", ")}</p>
              <p>${order.paymentMethod === "bank_transfer" ? "Chuyen khoan ngan hang" : "Thanh toan tai cua hang"}</p>
              <p>${order.fulfillmentMethod === "delivery" ? `Ship tan noi / ${order.distanceKm || 0} km` : "Nhan tai cua hang"}</p>
              <p>${formatCurrency(order.totalAmount)}</p>
              <p>${order.shippingAddress}</p>
              <div class="inline-actions">
                <button class="ghost-btn small-btn" onclick="updateOrderStatus('${order._id}', 'confirmed')">Xac nhan</button>
                <button class="ghost-btn small-btn" onclick="updateOrderStatus('${order._id}', 'shipping')">Dang giao</button>
                <button class="ghost-btn small-btn" onclick="updateOrderStatus('${order._id}', 'completed')">Hoan thanh</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Chua co don hang can xac nhan.</p></div>`;
}

function renderNotifications(list) {
  elements.notificationsList.innerHTML = list.length
    ? list
        .map((notification) => `
          <article class="mini-card${notification.isRead ? "" : " highlight"}">
            <div class="list-card-header">
              <strong>${notification.title}</strong>
              <span class="notification-time">${formatNotificationDate(notification.createdAt)}</span>
            </div>
            <p>${notification.message}</p>
            ${notification.link ? `<a class="ghost-btn small-btn" href="${notification.link}">Xem chi tiet</a>` : ""}
            ${notification.isRead ? "" : `<button class="ghost-btn small-btn" onclick="markNotificationReadAdmin('${notification._id}')">Danh dau da doc</button>`}
          </article>
        `)
        .join("")
    : `<div class="mini-card"><p>Chua co thong bao nao.</p></div>`;
}

function updateNotificationBadgeAdmin(count) {
  const total = Number(count || 0);
  elements.notificationCount.textContent = String(total);
  elements.notificationCount.classList.toggle("hidden", total <= 0);
}

async function fetchNotificationsAdmin() {
  const data = await api("/api/notifications");
  notifications = data.notifications || [];
  renderNotifications(notifications);
  updateNotificationBadgeAdmin(notifications.filter((item) => !item.isRead).length);
}

async function markNotificationReadAdmin(notificationId) {
  try {
    await api(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true })
    });
    await fetchNotificationsAdmin();
  } catch (error) {
    showToast(error.message);
  }
}

async function markAllReadAdmin() {
  const unread = notifications.filter((item) => !item.isRead);
  await Promise.all(
    unread.map((item) =>
      api(`/api/notifications/${item._id}/read`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true })
      }).catch(() => null)
    )
  );
  await fetchNotificationsAdmin();
}

function addNotificationAdmin(notification) {
  notifications.unshift(notification);
  renderNotifications(notifications);
  updateNotificationBadgeAdmin(notifications.filter((item) => !item.isRead).length);
  showToast(notification.title || "Thong bao moi");
}

function switchAdminTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tabName);
  });

  document.getElementById("admin-overview-panel").classList.toggle("hidden", tabName !== "overview");
  document.getElementById("admin-products-panel").classList.toggle("hidden", tabName !== "products");
  document.getElementById("admin-people-panel").classList.toggle("hidden", tabName !== "people");
  document.getElementById("admin-notifications-panel").classList.toggle("hidden", tabName !== "notifications");
}

async function loadPage() {
  try {
    const data = await api("/api/admin/dashboard");
    window.adminVehiclesCache = data.vehicles;
    renderStats(data);
    renderSelectOptions(elements.brandSelect, data.brands);
    renderSelectOptions(elements.categorySelect, data.categories);
    renderOrders(data.orders);
    renderVehicles(data.vehicles);
    renderUsers(data.users);
    renderReviews(data.reviews);
    await fetchNotificationsAdmin();

    if (window.initNotificationClient) {
      initNotificationClient({
        userId: auth.user._id,
        onNewNotification: addNotificationAdmin
      });
    }
  } catch (error) {
    elements.stats.innerHTML = `<div class="mini-card"><p>${error.message}</p></div>`;
  }
}

window.editVehicle = function editVehicle(id) {
  const vehicle = (window.adminVehiclesCache || []).find((item) => item._id === id);
  if (!vehicle) {
    return;
  }

  elements.vehicleForm.elements.id.value = vehicle._id;
  elements.vehicleForm.elements.name.value = vehicle.name;
  elements.vehicleForm.elements.slug.value = vehicle.slug;
  elements.vehicleForm.elements.brand.value = vehicle.brand._id;
  elements.vehicleForm.elements.category.value = vehicle.category._id;
  elements.vehicleForm.elements.engine.value = vehicle.engine || "";
  elements.vehicleForm.elements.stock.value = vehicle.stock;
  elements.vehicleForm.elements.price.value = vehicle.price;
  elements.vehicleForm.elements.salePrice.value = vehicle.salePrice || 0;
  elements.vehicleForm.elements.currentThumbnail.value = vehicle.thumbnail || "";
  elements.vehicleForm.elements.thumbnailFile.value = "";
  elements.vehicleForm.elements.description.value = vehicle.description || "";
  elements.vehicleForm.elements.featured.checked = Boolean(vehicle.featured);
  renderThumbnailPreview(vehicle.thumbnail);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.updateOrderStatus = async function updateOrderStatus(id, status) {
  try {
    await api(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

window.deleteVehicle = async function deleteVehicle(id) {
  try {
    await api(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

async function submitVehicle(event) {
  event.preventDefault();
  const rawFormData = new FormData(event.target);
  const vehicleId = rawFormData.get("id");
  rawFormData.set("stock", String(Number(rawFormData.get("stock"))));
  rawFormData.set("price", String(Number(rawFormData.get("price"))));
  rawFormData.set("salePrice", String(Number(rawFormData.get("salePrice"))));
  rawFormData.set("featured", String(elements.vehicleForm.elements.featured.checked));

  try {
    if (vehicleId) {
      await api(`/api/admin/vehicles/${vehicleId}`, {
        method: "PUT",
        body: rawFormData
      });
    } else {
      await api("/api/admin/vehicles", {
        method: "POST",
        body: rawFormData
      });
    }

    event.target.reset();
    elements.vehicleForm.elements.id.value = "";
    elements.vehicleForm.elements.currentThumbnail.value = "";
    renderThumbnailPreview("");
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
}

if (requireAdmin()) {
  document.getElementById("logout-btn").addEventListener("click", logout);
  elements.notificationToggle.addEventListener("click", () => switchAdminTab("notifications"));
  elements.markAllReadBtn.addEventListener("click", markAllReadAdmin);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchAdminTab(button.dataset.adminTab));
  });
  elements.vehicleForm.elements.thumbnailFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      renderThumbnailPreview(elements.vehicleForm.elements.currentThumbnail.value);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    renderThumbnailPreview(previewUrl);
  });
  elements.vehicleForm.addEventListener("submit", submitVehicle);
  switchAdminTab("overview");
  loadPage();
}
