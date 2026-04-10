const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
};

const elements = {
  brandList: document.getElementById("brand-list"),
  categoryList: document.getElementById("category-list"),
  vehicleList: document.getElementById("vehicle-list"),
  accessoryList: document.getElementById("accessory-list"),
  promotionList: document.getElementById("promotion-list"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  clearSearch: document.getElementById("clear-search"),
  authModal: document.getElementById("auth-modal"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  googleLoginButton: document.getElementById("google-login-button"),
  googleRegisterBox: document.getElementById("google-register-box"),
  googleRegisterButton: document.getElementById("google-register-button"),
  authError: document.getElementById("auth-error"),
  guestActions: document.getElementById("guest-actions"),
  authActions: document.getElementById("auth-actions"),
  welcomeText: document.getElementById("welcome-text"),
  cartLink: document.getElementById("cart-link"),
  cartCount: document.getElementById("cart-count"),
  dashboardLink: document.getElementById("dashboard-link"),
  heroDashboardLink: document.getElementById("hero-dashboard-link")
};

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
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
  }).format(value);
}

function renderNav() {
  const isLoggedIn = Boolean(state.token && state.user);
  elements.guestActions.classList.toggle("hidden", isLoggedIn);
  elements.authActions.classList.toggle("hidden", !isLoggedIn);
  elements.heroDashboardLink.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    elements.cartLink.classList.add("hidden");
    elements.cartCount.classList.add("hidden");
    return;
  }

  const dashboardPath = state.user.role === "admin" ? "/admin.html" : "/user.html";
  const showCartLink = state.user.role === "user";
  elements.welcomeText.textContent = `Xin chao, ${state.user.fullName}`;
  elements.cartLink.classList.toggle("hidden", !showCartLink);
  elements.dashboardLink.href = dashboardPath;
  elements.dashboardLink.textContent = state.user.role === "admin" ? "Quan tri" : "Tai khoan";
  elements.heroDashboardLink.href = dashboardPath;
}

function renderCartCount(count) {
  const total = Number(count || 0);
  elements.cartCount.textContent = String(total);
  elements.cartCount.classList.toggle("hidden", total <= 0);
}

function renderPills(container, items, type = "") {
  container.innerHTML = items.map((item) => `<div class="pill ${type}">${item.name}</div>`).join("");
}

function renderVehicles(vehicles) {
  elements.vehicleList.innerHTML = vehicles
    .map(
      (vehicle) => `
        <article class="vehicle-card">
          <a href="/product.html?slug=${vehicle.slug}">
            <img src="${vehicle.thumbnail}" alt="${vehicle.name}" />
          </a>
          <div class="vehicle-body">
            <div class="vehicle-meta">
              <span>${vehicle.brand.name}</span>
              <span>${vehicle.category.name}</span>
            </div>
            <h3><a href="/product.html?slug=${vehicle.slug}">${vehicle.name}</a></h3>
            <p>${vehicle.description}</p>
            <div class="price-row">
              <strong>${formatCurrency(vehicle.salePrice || vehicle.price)}</strong>
              <span class="old-price">${formatCurrency(vehicle.price)}</span>
            </div>
            <button class="primary-btn" onclick="addToCart('${vehicle._id}')">Them vao gio</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPromotions(promotions) {
  elements.promotionList.innerHTML = promotions
    .map(
      (item) => `
        <article class="promo-card">
          <p class="eyebrow">${item.code}</p>
          <h3>${item.title}</h3>
          <p>Giam ${item.discountPercent}% cho don hop le.</p>
        </article>
      `
    )
    .join("");
}

function renderAccessories(accessories) {
  elements.accessoryList.innerHTML = accessories
    .map(
      (accessory) => `
        <article class="vehicle-card">
          <img src="${accessory.thumbnail}" alt="${accessory.name}" />
          <div class="vehicle-body">
            <div class="vehicle-meta">
              <span>${accessory.category}</span>
              <span>${(accessory.compatibleVehicles || []).slice(0, 1).join("") || "Moi loai xe"}</span>
            </div>
            <h3>${accessory.name}</h3>
            <p>${accessory.description}</p>
            <div class="price-row">
              <strong>${formatCurrency(accessory.salePrice || accessory.price)}</strong>
              <span class="old-price">${formatCurrency(accessory.price)}</span>
            </div>
            <button class="primary-btn" onclick="addAccessoryToCart('${accessory._id}')">Them phu kien</button>
          </div>
        </article>
      `
    )
    .join("");
}

async function loadHome() {
  try {
    const data = await api("/api/catalog/home");
    renderPills(elements.brandList, data.brands);
    renderPills(elements.categoryList, data.categories, "secondary");
    renderVehicles(data.featuredVehicles);
    renderAccessories(data.featuredAccessories || []);
    renderPromotions(data.promotions);
  } catch (error) {
    showToast(error.message);
  }
}

async function searchVehicles(event) {
  event?.preventDefault();
  const keyword = elements.searchInput.value.trim();

  try {
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
    const vehicles = await api(`/api/catalog/vehicles${query}`);
    renderVehicles(vehicles);

    if (!vehicles.length) {
      elements.vehicleList.innerHTML = `<div class="mini-card"><p>Khong tim thay san pham phu hop.</p></div>`;
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function clearSearch() {
  elements.searchInput.value = "";
  await loadHome();
}

async function refreshCartCount() {
  if (!state.token || !state.user || state.user.role !== "user") {
    renderCartCount(0);
    return;
  }

  try {
    const data = await api("/api/user/dashboard");
    const totalItems = (data.cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
    renderCartCount(totalItems);
  } catch (_error) {
    renderCartCount(0);
  }
}

function toggleAuthTab(tab) {
  clearAuthError();
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
  elements.loginForm.classList.toggle("hidden", tab !== "login");
  elements.registerForm.classList.toggle("hidden", tab !== "register");
  elements.googleLoginButton.parentElement.classList.toggle("hidden", tab !== "login");
  elements.googleRegisterBox.classList.toggle("hidden", tab !== "register");
}

function openModal(tab = "login") {
  elements.authModal.classList.remove("hidden");
  toggleAuthTab(tab);
}

function closeModal() {
  elements.authModal.classList.add("hidden");
  clearAuthError();
}

function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.classList.remove("hidden");
}

function clearAuthError() {
  elements.authError.textContent = "";
  elements.authError.classList.add("hidden");
}

function saveAuth(payload) {
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem("token", payload.token);
  localStorage.setItem("user", JSON.stringify(payload.user));
  renderNav();
  refreshCartCount();
}

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  renderNav();
  renderCartCount(0);
  showToast("Da dang xuat");
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  clearAuthError();

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    saveAuth(data);
    closeModal();
    showToast(`Xin chao ${data.user.fullName}`);
  } catch (error) {
    showAuthError(error.message);
    showToast(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  clearAuthError();

  if (!formData.fullName.trim()) {
    showAuthError("Vui long nhap ho ten");
    return;
  }

  if (!formData.username.trim()) {
    showAuthError("Vui long nhap ten dang nhap");
    return;
  }

  if ((formData.password || "").length < 6) {
    showAuthError("Mat khau phai co it nhat 6 ky tu");
    return;
  }

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    saveAuth(data);
    closeModal();
    showToast("Tao tai khoan thanh cong");
  } catch (error) {
    showAuthError(error.message);
    showToast(error.message);
  }
}

async function handleGoogleCredentialResponse(response) {
  clearAuthError();

  try {
    const data = await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken: response.credential })
    });
    saveAuth(data);
    closeModal();
    showToast(`Xin chao ${data.user.fullName}`);
  } catch (error) {
    showAuthError(error.message);
    showToast(error.message);
  }
}

async function initializeGoogleAuth() {
  if (!window.google || !elements.googleLoginButton || !elements.googleRegisterButton) {
    return;
  }

  let clientId = "";

  try {
    const config = await api("/api/auth/google/config");
    clientId = config.clientId;
  } catch (_error) {
    return;
  }

  if (!clientId) {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredentialResponse
  });

  const buttonOptions = {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 320
  };

  window.google.accounts.id.renderButton(elements.googleLoginButton, buttonOptions);
  window.google.accounts.id.renderButton(elements.googleRegisterButton, buttonOptions);
}

window.addToCart = async function addToCart(vehicleId) {
  if (!state.token) {
    openModal("login");
    return;
  }

  try {
    await api("/api/user/cart", {
      method: "POST",
      body: JSON.stringify({ vehicleId, quantity: 1 })
    });
    await refreshCartCount();
    showToast("Da them vao gio hang");
  } catch (error) {
    showToast(error.message);
  }
};

window.addAccessoryToCart = async function addAccessoryToCart(accessoryId) {
  if (!state.token) {
    openModal("login");
    return;
  }

  try {
    await api("/api/user/cart", {
      method: "POST",
      body: JSON.stringify({ accessoryId, quantity: 1 })
    });
    await refreshCartCount();
    showToast("Da them phu kien vao gio");
  } catch (error) {
    showToast(error.message);
  }
};

document.getElementById("open-login").addEventListener("click", () => openModal("login"));
document.getElementById("open-register").addEventListener("click", () => openModal("register"));
document.getElementById("tab-login").addEventListener("click", () => toggleAuthTab("login"));
document.getElementById("tab-register").addEventListener("click", () => toggleAuthTab("register"));
document.getElementById("close-modal").addEventListener("click", closeModal);
document.getElementById("logout-btn").addEventListener("click", logout);
document.getElementById("scroll-products").addEventListener("click", () => {
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
});
elements.searchForm.addEventListener("submit", searchVehicles);
elements.clearSearch.addEventListener("click", clearSearch);
elements.loginForm.addEventListener("submit", handleLogin);
elements.registerForm.addEventListener("submit", handleRegister);

renderNav();
refreshCartCount();
loadHome();

window.addEventListener("load", initializeGoogleAuth);
