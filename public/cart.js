const auth = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  promotionCode: "",
  fulfillmentMethod: "pickup",
  distanceKm: 0,
  shippingAddress: "",
  estimateTimeoutId: null,
  selectedPoint: null
};

const elements = {
  greeting: document.getElementById("cart-greeting"),
  vehicles: document.getElementById("cart-page-vehicles"),
  accessories: document.getElementById("cart-page-accessories"),
  cartItems: document.getElementById("cart-page-items"),
  cartSummary: document.getElementById("cart-page-summary"),
  promotionCode: document.getElementById("promotion-code"),
  shippingAddress: document.getElementById("shipping-address"),
  deliveryNote: document.getElementById("delivery-note"),
  distanceKm: document.getElementById("distance-km"),
  cartCount: document.getElementById("cart-count"),
  storeAddressNote: document.getElementById("store-address-note"),
  useMapSelection: document.getElementById("use-map-selection"),
  mapHint: document.getElementById("map-hint"),
  shippingFeedback: document.getElementById("shipping-feedback"),
  mapSelectedAddress: document.getElementById("map-selected-address"),
  mapDistanceValue: document.getElementById("map-distance-value")
};

let deliveryMap = null;
let deliveryMarker = null;

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

function setShippingFeedback(message = "", type = "") {
  elements.shippingFeedback.textContent = message;
  elements.shippingFeedback.classList.toggle("hidden", !message);
  elements.shippingFeedback.dataset.state = type;
}

function renderMapSelectionInfo(address = "", distanceKm = 0) {
  elements.mapSelectedAddress.textContent = address || "Chua chon diem giao";
  elements.mapDistanceValue.textContent = distanceKm > 0 ? `${distanceKm} km` : "0 km";
}

function getSelectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function getItemResource(item) {
  return item.itemType === "accessory" ? item.accessory : item.vehicle;
}

function getItemId(item) {
  return getItemResource(item)?._id || "";
}

function getItemName(item) {
  return getItemResource(item)?.name || "San pham";
}

function getItemImage(item) {
  return getItemResource(item)?.thumbnail || "";
}

function getItemMeta(item) {
  if (item.itemType === "accessory") {
    return `Phu kien / ${item.accessory?.category || "Tong hop"}`;
  }

  return `${item.vehicle?.brand?.name || ""} / ${item.vehicle?.category?.name || ""} / ${item.vehicle?.engine || "Dang cap nhat"}`;
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
          <button class="primary-btn" onclick="addVehicleToCart('${vehicle._id}')">Them xe</button>
        </article>
      `
    )
    .join("");
}

function renderAccessories(accessories) {
  elements.accessories.innerHTML = accessories
    .map(
      (accessory) => `
        <article class="list-card">
          <img class="thumb-sm" src="${accessory.thumbnail}" alt="${accessory.name}" />
          <div class="list-body">
            <h3>${accessory.name}</h3>
            <p>${accessory.category} / ${(accessory.compatibleVehicles || []).join(", ")}</p>
            <strong>${formatCurrency(accessory.salePrice || accessory.price)}</strong>
          </div>
          <button class="primary-btn" onclick="addAccessoryToCart('${accessory._id}')">Them phu kien</button>
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
              <img class="thumb-sm" src="${getItemImage(item)}" alt="${getItemName(item)}" />
              <div class="list-body">
                <h3>${getItemName(item)}</h3>
                <p>${getItemMeta(item)}</p>
                <p>${formatCurrency(item.price)} x ${item.quantity}</p>
              </div>
              <div class="inline-actions">
                <button class="ghost-btn small-btn" onclick="updateCartItem('${getItemId(item)}', ${item.quantity - 1})">-</button>
                <button class="ghost-btn small-btn" onclick="updateCartItem('${getItemId(item)}', ${item.quantity + 1})">+</button>
                <button class="ghost-btn small-btn" onclick="removeCartItem('${getItemId(item)}')">Xoa</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>Gio hang hien dang trong.</p></div>`;

  elements.cartSummary.innerHTML = `
    <div class="invoice-topline">
      <span>Hoa don tam tinh</span>
      <strong>${formatCurrency(summary?.total)}</strong>
    </div>
    <div class="invoice-rows">
      <div class="invoice-row"><span>Tien hang</span><strong>${formatCurrency(summary?.subtotal)}</strong></div>
      <div class="invoice-row"><span>Giam gia</span><strong>- ${formatCurrency(summary?.discountAmount)}</strong></div>
      <div class="invoice-row"><span>Phi ship</span><strong>${formatCurrency(summary?.shippingFee)}</strong></div>
    </div>
    <div class="invoice-total">
      <span>Tong thanh toan</span>
      <strong>${formatCurrency(summary?.total)}</strong>
    </div>
    <div class="invoice-meta">
      <p>${summary?.promotion ? `Ma ap dung: ${summary.promotion.code}` : "Chua ap ma giam gia"}</p>
      <p>${summary?.fulfillmentMethod === "delivery" ? `Quang duong: ${summary.distanceKm} km x ${formatCurrency(summary.shippingRatePerKm)}/km` : "Nhan tai cua hang, khong tinh phi ship"}</p>
      <p>Dia chi cua hang: ${summary?.storeAddress || ""}</p>
    </div>
  `;
  elements.distanceKm.value = summary?.fulfillmentMethod === "delivery" && summary?.distanceKm ? `${summary.distanceKm} km` : "";
}

function initializeMap() {
  if (deliveryMap || !window.L) {
    return;
  }

  deliveryMap = window.L.map("delivery-map", {
    zoomControl: true
  }).setView([10.8231, 106.6297], 12);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(deliveryMap);

  deliveryMap.on("click", (event) => {
    auth.selectedPoint = event.latlng;
    renderMapMarker(event.latlng.lat, event.latlng.lng);
    elements.mapHint.textContent = "Da chon diem giao. Web dang cap nhat dia chi va phi ship tu ban do.";
    applyMapSelection();
  });
}

function renderMapMarker(lat, lon) {
  if (!deliveryMap || !window.L) {
    return;
  }

  if (!deliveryMarker) {
    deliveryMarker = window.L.marker([lat, lon]).addTo(deliveryMap);
  } else {
    deliveryMarker.setLatLng([lat, lon]);
  }

  deliveryMap.setView([lat, lon], Math.max(deliveryMap.getZoom(), 14));
}

async function loadPage() {
  try {
    const query = new URLSearchParams();
    if (auth.promotionCode) {
      query.set("promotionCode", auth.promotionCode);
    }
    query.set("fulfillmentMethod", auth.fulfillmentMethod);
    if (auth.shippingAddress) {
      query.set("shippingAddress", auth.shippingAddress);
    } else {
      query.set("distanceKm", String(auth.distanceKm || 0));
    }

    const [dashboard, vehicles, accessories, cart] = await Promise.all([
      api("/api/user/dashboard"),
      api("/api/catalog/vehicles"),
      api("/api/catalog/accessories"),
      api(`/api/user/cart?${query.toString()}`)
    ]);

    renderVehicles(vehicles);
    renderAccessories(accessories);
    renderCart(cart.cart, cart.summary);
    auth.distanceKm = Number(cart.summary?.distanceKm || 0);
    elements.storeAddressNote.textContent = `Tru so lay xe: ${dashboard.storeAddress}. Ship tinh ${formatCurrency(dashboard.shippingRatePerKm)}/km.`;
    elements.shippingAddress.value = auth.fulfillmentMethod === "delivery" ? auth.shippingAddress : "";
    renderMapSelectionInfo(auth.shippingAddress, auth.distanceKm);
    if (auth.fulfillmentMethod !== "delivery") {
      setShippingFeedback("");
    }
    initializeMap();
  } catch (error) {
    elements.cartItems.innerHTML = `<div class="mini-card"><p>${error.message}</p></div>`;
  }
}

async function estimateDistance() {
  if (auth.fulfillmentMethod !== "delivery") {
    auth.distanceKm = 0;
    elements.distanceKm.value = "";
    return;
  }

  if (!auth.selectedPoint) {
    auth.distanceKm = 0;
    elements.distanceKm.value = "";
    setShippingFeedback("Hay bam chon diem giao tren ban do.", "error");
    return;
  }

  await applyMapSelection();
}

async function applyMapSelection() {
  if (!auth.selectedPoint) {
    setShippingFeedback("Hay bam chon mot diem giao tren ban do.", "error");
    return;
  }

  try {
    const estimate = await api("/api/user/shipping/estimate-point", {
      method: "POST",
      body: JSON.stringify({
        lat: auth.selectedPoint.lat,
        lon: auth.selectedPoint.lng
      })
    });

    auth.distanceKm = estimate.distanceKm;
    auth.shippingAddress = estimate.shippingAddress;
    elements.shippingAddress.value = estimate.shippingAddress;
    renderMapSelectionInfo(estimate.shippingAddress, estimate.distanceKm);
    elements.mapHint.textContent = `Da cap nhat diem giao: ${estimate.shippingAddress}`;
    setShippingFeedback(`Da tinh duoc ${estimate.distanceKm} km, phi ship ${formatCurrency(estimate.shippingFee)}.`, "success");
    renderMapMarker(auth.selectedPoint.lat, auth.selectedPoint.lng);
    await loadPage();
  } catch (error) {
    setShippingFeedback(error.message, "error");
  }
}

window.addVehicleToCart = async function addVehicleToCart(vehicleId) {
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

window.addAccessoryToCart = async function addAccessoryToCart(accessoryId) {
  try {
    await api("/api/user/cart", {
      method: "POST",
      body: JSON.stringify({ accessoryId, quantity: 1 })
    });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

window.updateCartItem = async function updateCartItem(itemId, quantity) {
  try {
    await api(`/api/user/cart/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity })
    });
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
};

window.removeCartItem = async function removeCartItem(itemId) {
  try {
    await api(`/api/user/cart/${itemId}`, { method: "DELETE" });
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
    const paymentMethod = getSelectedValue("payment-method");
    const fulfillmentMethod = getSelectedValue("fulfillment-method");

    if (fulfillmentMethod === "delivery" && !auth.selectedPoint) {
      setShippingFeedback("Hay bam chon diem giao tren ban do truoc khi thanh toan.", "error");
      return;
    }

    if (fulfillmentMethod === "delivery" && auth.distanceKm <= 0) {
      await estimateDistance();
    }

    const data = await api("/api/user/orders", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: auth.shippingAddress,
        paymentMethod,
        fulfillmentMethod,
        distanceKm: auth.distanceKm,
        promotionCode: auth.promotionCode
      })
    });
    auth.promotionCode = "";
    auth.distanceKm = 0;
    auth.shippingAddress = "";
    auth.selectedPoint = null;
    elements.promotionCode.value = "";
    elements.distanceKm.value = "";
    elements.shippingAddress.value = "";
    elements.deliveryNote.value = "";
    renderMapSelectionInfo("", 0);
    elements.mapHint.textContent = "Bam vao ban do de chon diem giao, web se tu tinh quang duong va phi ship.";
    alert(`${data.message}. Tong thanh toan: ${formatCurrency(data.summary.total)}`);
    await loadPage();
  } catch (error) {
    alert(error.message);
  }
}

function handleFulfillmentChange() {
  auth.fulfillmentMethod = getSelectedValue("fulfillment-method") || "pickup";
  if (auth.fulfillmentMethod !== "delivery") {
    auth.distanceKm = 0;
    auth.selectedPoint = null;
    elements.distanceKm.value = "";
    renderMapSelectionInfo("", 0);
    setShippingFeedback("");
  }
  loadPage();
}

if (requireAuth()) {
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("apply-promotion-btn").addEventListener("click", applyPromotion);
  document.getElementById("checkout-btn").addEventListener("click", checkout);
  elements.useMapSelection.addEventListener("click", applyMapSelection);
  document.querySelectorAll('input[name="fulfillment-method"]').forEach((input) => {
    input.addEventListener("change", handleFulfillmentChange);
  });
  loadPage();
}
