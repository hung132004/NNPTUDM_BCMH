const auth = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
};

const elements = {
  greeting: document.getElementById("user-greeting"),
  profile: document.getElementById("user-profile"),
  orders: document.getElementById("user-orders"),
  reviews: document.getElementById("user-reviews"),
  reviewForm: document.getElementById("review-form"),
  reviewVehicle: document.getElementById("review-vehicle"),
  tabButtons: document.querySelectorAll("[data-tab-target]"),
  cartCount: document.getElementById("cart-count")
};

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
                .map((item) => `<a href="/product.html?slug=${item.vehicle.slug}">${item.vehicle.name}</a> x${item.quantity}`)
                .join(", ")}</p>
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
}

async function loadPage() {
  try {
    const [dashboard, vehicles] = await Promise.all([
      api("/api/user/dashboard"),
      api("/api/catalog/vehicles")
    ]);

    renderProfile(dashboard.profile, dashboard.orders);
    renderCartCount(dashboard.cart);
    renderOrders(dashboard.orders);
    renderReviews(dashboard.reviews);
    renderReviewOptions(vehicles);
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

if (requireAuth()) {
  document.getElementById("logout-btn").addEventListener("click", logout);
  elements.reviewForm.addEventListener("submit", submitReview);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });
  switchTab("orders");
  loadPage();
}
