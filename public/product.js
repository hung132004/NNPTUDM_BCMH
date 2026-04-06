const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null")
};

const elements = {
  title: document.getElementById("product-title"),
  detail: document.getElementById("product-detail"),
  reviews: document.getElementById("product-reviews")
};

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
  }).format(value || 0);
}

function renderProduct(vehicle) {
  elements.title.textContent = vehicle.name;
  elements.detail.innerHTML = `
    <article class="panel product-hero">
      <img class="product-image" src="${vehicle.thumbnail}" alt="${vehicle.name}" />
    </article>
    <article class="panel product-copy">
      <p class="eyebrow">${vehicle.brand.name} / ${vehicle.category.name}</p>
      <h2>${vehicle.name}</h2>
      <p>${vehicle.description}</p>
      <div class="price-row">
        <strong>${formatCurrency(vehicle.salePrice || vehicle.price)}</strong>
        <span class="old-price">${formatCurrency(vehicle.price)}</span>
      </div>
      <div class="spec-grid">
        <div class="mini-card"><strong>Dong co</strong><p>${vehicle.engine || "Dang cap nhat"}</p></div>
        <div class="mini-card"><strong>Ton kho</strong><p>${vehicle.stock}</p></div>
      </div>
      <div class="spec-grid">
        ${(vehicle.specs || []).map((spec) => `<div class="mini-card"><p>${spec}</p></div>`).join("")}
      </div>
      <div class="hero-cta">
        <button class="primary-btn" onclick="addToCart('${vehicle._id}')">Them vao gio</button>
        <a class="ghost-btn link-btn" href="/#products">Tiep tuc mua sam</a>
      </div>
    </article>
  `;
}

function renderReviews(reviews) {
  elements.reviews.innerHTML = reviews.length
    ? reviews
        .map(
          (review) => `
            <article class="mini-card">
              <strong>${review.user.fullName} - ${review.rating}/5</strong>
              <p>${review.comment}</p>
            </article>
          `
        )
        .join("")
    : `<div class="mini-card"><p>San pham nay chua co danh gia.</p></div>`;
}

window.addToCart = async function addToCart(vehicleId) {
  if (!state.token) {
    alert("Ban can dang nhap truoc khi them gio hang");
    window.location.href = "/";
    return;
  }

  try {
    await api("/api/user/cart", {
      method: "POST",
      body: JSON.stringify({ vehicleId, quantity: 1 })
    });
    alert("Da them vao gio hang");
  } catch (error) {
    alert(error.message);
  }
};

async function loadPage() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    elements.detail.innerHTML = `<div class="mini-card"><p>Khong tim thay san pham.</p></div>`;
    return;
  }

  try {
    const data = await api(`/api/catalog/vehicles/${slug}`);
    renderProduct(data.vehicle);
    renderReviews(data.reviews);
  } catch (error) {
    elements.detail.innerHTML = `<div class="mini-card"><p>${error.message}</p></div>`;
  }
}

loadPage();
