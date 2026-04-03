const auth = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  promotionCode: ""
};

const elements = {
  greeting: document.getElementById("cart-greeting"),
  vehicles: document.getElementById("cart-page-vehicles"),
  cartItems: document.getElementById("cart-page-items"),
  cartSummary: document.getElementById("cart-page-summary"),
  promotionCode: document.getElementById("promotion-code"),
  shippingAddress: document.getElementById("shipping-address"),
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

function renderCartCount(cart) {
  const totalItems = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = String(totalItems);
  elements.cartCount.classList.toggle("hidden", totalItems <= 0);
}

function renderVehicles(vehicles) {
  elements.vehicles.innerHTML = vehicles
    .map(
      (vehicle) => `
        <article class="list-card">
          <img class="thumb-sm" src="${vehicle.thumbnail}" alt="${vehicle.name}" />
          <div class="list-body">
            <h3><a href="/product.html?slug=${vehicle.slug}">${vehicle.name}</a></h3>
            <p>${vehicle.brand.name} / ${vehicle.category.name} / ${vehicle.engine || "Dang cap nhat"}</p>
            <strong>${formatCurrency(vehicle.salePrice || vehicle.price)}</strong>
          </div>
          <button class="primary-btn" onclick="addToCart('${vehicle._id}')">Them gio</button>
        </article>
      `
    )
    .join("");
}

function renderCart(cart, summary) {
  const items = cart?.items || [];
  elements.greeting.textContent = `Gio hang cua ${auth.user.fullName}`;
  renderCartCount(cart);
  elements.cartItems.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="list-card">
              <img class="thumb-sm" src="${item.vehicle.thumbnail}" alt="${item.vehicle.name}" />
              <div class="list-body">
                <h3>${item.vehicle.name}</h3>
                <p>${formatCurrency(item.price)} x ${item.quantity}</p>
              </div>
              <div class="inline-actions">
                <button class="ghost-btn small-btn" onclick="updateCartItem('${item.vehicle._id}', ${item.quantity - 1})">-</button>
                <button class="ghost-btn small-btn" onclick="updateCartItem('${item.vehicle._id}', ${item.quantity + 1})">+</button>
                <button class="ghost-btn small-btn" onclick="removeCartItem('${item.vehicle._id}')">Xoa</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Gio hang hien dang trong.</p></div>`;

  elements.cartSummary.innerHTML = `
    <strong>Tam tinh: ${formatCurrency(summary?.subtotal)}</strong>
    <p>Giam gia: ${formatCurrency(summary?.discountAmount)}</p>
    <p>Thanh toan: ${formatCurrency(summary?.total)}</p>
    <p>${summary?.promotion ? `Ma ap dung: ${summary.promotion.code}` : "Chua ap ma giam gia"}</p>
  `;
}

async function loadPage() {
  try {
    const [dashboard, vehicles, cart] = await Promise.all([
      api("/api/user/dashboard"),
      api("/api/catalog/vehicles"),
      api(`/api/user/cart${auth.promotionCode ? `?promotionCode=${encodeURIComponent(auth.promotionCode)}` : ""}`)
    ]);

    renderVehicles(vehicles);
    renderCart(cart.cart, cart.summary);
    elements.shippingAddress.value = dashboard.profile.address || "";
  } catch (error) {
    elements.cartItems.innerHTML = `<div class="mini-card"><p>${error.message}</p></div>`;
  }
}

window.addToCart = async function addToCart(vehicleId) {
  try {
    await api("/api/user/cart", {
      method: "POST",
      body: JSON.stringify({ vehicleId, quantity: 1 })
    });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

window.updateCartItem = async function updateCartItem(vehicleId, quantity) {
  try {
    await api(`/api/user/cart/${vehicleId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity })
    });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

window.removeCartItem = async function removeCartItem(vehicleId) {
  try {
    await api(`/api/user/cart/${vehicleId}`, { method: "DELETE" });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

async function applyPromotion() {
  auth.promotionCode = elements.promotionCode.value.trim().toUpperCase();
  await loadPage();
}

async function checkout() {
  try {
    const shippingAddress = elements.shippingAddress.value.trim();
    if (!shippingAddress) {
      alert("Nhap dia chi giao hang");
      return;
    }

    const data = await api("/api/user/orders", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress,
        paymentMethod: "COD",
        promotionCode: auth.promotionCode
      })
    });
    auth.promotionCode = "";
    elements.promotionCode.value = "";
    alert(`${data.message}. Tong thanh toan: ${formatCurrency(data.summary.total)}`);
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
}

if (requireAuth()) {
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("apply-promotion-btn").addEventListener("click", applyPromotion);
  document.getElementById("checkout-btn").addEventListener("click", checkout);
  loadPage();
}
