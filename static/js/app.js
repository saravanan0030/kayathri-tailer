(function () {
  "use strict";

  const state = {
    products: [],
    quantities: {},
    filter: "all",
  };

  const els = {
    grid: document.getElementById("productGrid"),
    loading: document.getElementById("loadingState"),
    billRows: document.getElementById("billRows"),
    billEmpty: document.getElementById("billEmpty"),
    billFooter: document.getElementById("billFooter"),
    billGrand: document.getElementById("billGrand"),
    headerTotal: document.getElementById("headerTotal"),
    statItems: document.getElementById("statItems"),
    statQty: document.getElementById("statQty"),
    statTotal: document.getElementById("statTotal"),
    heroDate: document.getElementById("heroDate"),
    billDate: document.getElementById("billDate"),
    btnClear: document.getElementById("btnClear"),
    btnPrint: document.getElementById("btnPrint"),
    ownerModal: document.getElementById("ownerModal"),
    ownerPriceRows: document.getElementById("ownerPriceRows"),
    ownerPin: document.getElementById("ownerPin"),
    ownerSaveBtn: document.getElementById("ownerSaveBtn"),
    ownerAlert: document.getElementById("ownerAlert"),
    historyModal: document.getElementById("historyModal"),
    historyPin: document.getElementById("historyPin"),
    historyLoadBtn: document.getElementById("historyLoadBtn"),
    historyContent: document.getElementById("historyContent"),
    historyAlert: document.getElementById("historyAlert"),
  };

  function formatMoney(n) {
    return "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN");
  }

  function samePrice(a, b) {
    return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
  }

  function formatDate(d) {
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function setDates() {
    const d = new Date();
    if (els.heroDate) els.heroDate.textContent = formatDate(d);
    if (els.billDate) els.billDate.textContent = formatDate(d);
  }

  function getQty(id) {
    return state.quantities[id] || 0;
  }

  function setQty(id, q) {
    const n = Math.max(0, Math.min(999, parseInt(q, 10) || 0));
    if (n === 0) delete state.quantities[id];
    else state.quantities[id] = n;
    updateCardLine(id);
    renderBill();
    updateStats();
  }

  function bumpQty(id, delta) {
    setQty(id, getQty(id) + delta);
  }

  function productCard(p) {
    const q = getQty(p.id);
    const line = q * p.price;
    return (
      '<div class="col-12 col-sm-6 col-xl-4 product-col" data-category="' +
      escapeAttr(p.category) +
      '">' +
      '<article class="product-card">' +
      '<div class="ratio ratio-4x3">' +
      '<img src="' +
      escapeAttr(p.image) +
      '" alt="' +
      escapeAttr(p.name) +
      '" loading="lazy" width="400" height="300">' +
      "</div>" +
      '<div class="product-card-body">' +
      '<span class="badge bg-light text-dark border mb-2 align-self-start">' +
      escapeHtml(p.category) +
      "</span>" +
      '<h3 class="product-name">' +
      escapeHtml(p.name) +
      "</h3>" +
      (p.name_ta
        ? '<p class="product-name-ta mb-2">' + escapeHtml(p.name_ta) + "</p>"
        : "") +
      '<div class="d-flex align-items-baseline gap-2 flex-wrap">' +
      '<span class="product-price">' +
      formatMoney(p.price) +
      "</span>" +
      '<span class="product-unit">per ' +
      escapeHtml(p.unit) +
      "</span>" +
      "</div>" +
      '<div class="qty-row">' +
      '<div class="qty-controls" role="group" aria-label="Quantity for ' +
      escapeAttr(p.name) +
      '">' +
      '<button type="button" class="qty-minus" data-id="' +
      escapeAttr(p.id) +
      '" aria-label="Decrease">−</button>' +
      '<span class="qty-value" id="qty-' +
      escapeAttr(p.id) +
      '">' +
      q +
      "</span>" +
      '<button type="button" class="qty-plus" data-id="' +
      escapeAttr(p.id) +
      '" aria-label="Increase">+</button>' +
      "</div>" +
      '<span class="product-line-total" id="line-' +
      escapeAttr(p.id) +
      '">' +
      (q ? formatMoney(line) : "—") +
      "</span>" +
      "</div>" +
      "</div>" +
      "</article>" +
      "</div>"
    );
  }

  function escapeHtml(s) {
    if (s == null) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function renderGrid() {
    if (!els.grid) return;
    const filtered =
      state.filter === "all"
        ? state.products
        : state.products.filter((p) => p.category === state.filter);
    const html = filtered.map(productCard).join("");
    els.grid.innerHTML =
      html ||
      '<div class="col-12 text-center text-muted py-5">No items in this category.</div>';
    bindQtyButtons();
  }

  function bindQtyButtons() {
    document.querySelectorAll(".qty-plus").forEach((btn) => {
      btn.addEventListener("click", () => bumpQty(btn.dataset.id, 1));
    });
    document.querySelectorAll(".qty-minus").forEach((btn) => {
      btn.addEventListener("click", () => bumpQty(btn.dataset.id, -1));
    });
  }

  function updateCardLine(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const q = getQty(id);
    const qEl = document.getElementById("qty-" + id);
    const lEl = document.getElementById("line-" + id);
    if (qEl) qEl.textContent = String(q);
    if (lEl) lEl.textContent = q ? formatMoney(q * p.price) : "—";
  }

  function computeTotals() {
    let lineCount = 0;
    let totalQty = 0;
    let grand = 0;
    state.products.forEach((p) => {
      const q = getQty(p.id);
      if (q > 0) {
        lineCount += 1;
        totalQty += q;
        grand += q * p.price;
      }
    });
    return { lineCount, totalQty, grand };
  }

  function updateStats() {
    const { lineCount, totalQty, grand } = computeTotals();
    if (els.headerTotal) els.headerTotal.textContent = formatMoney(grand);
    if (els.statItems) els.statItems.textContent = String(lineCount);
    if (els.statQty) els.statQty.textContent = String(totalQty);
    if (els.statTotal) els.statTotal.textContent = formatMoney(grand);
  }

  function renderBill() {
    const tbody = els.billRows;
    if (!tbody) return;
    tbody.innerHTML = "";
    const rows = [];
    state.products.forEach((p) => {
      const q = getQty(p.id);
      if (q <= 0) return;
      const amt = q * p.price;
      rows.push(
        "<tr>" +
          "<td>" +
          escapeHtml(p.name) +
          "</td>" +
          '<td class="text-end">' +
          q +
          "</td>" +
          '<td class="text-end">' +
          formatMoney(p.price) +
          "</td>" +
          '<td class="text-end fw-semibold">' +
          formatMoney(amt) +
          "</td>" +
          "</tr>"
      );
    });
    const { grand } = computeTotals();
    const has = rows.length > 0;
    if (els.billEmpty) els.billEmpty.classList.toggle("d-none", has);
    if (els.billFooter) els.billFooter.classList.toggle("d-none", !has);
    if (els.billGrand) els.billGrand.textContent = formatMoney(grand);
    tbody.innerHTML = rows.join("");
  }

  function clearAll() {
    state.quantities = {};
    renderGrid();
    renderBill();
    updateStats();
  }

  function bindFilters() {
    document.querySelectorAll(".catalog-filters [data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".catalog-filters [data-filter]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.filter = btn.getAttribute("data-filter") || "all";
        renderGrid();
      });
    });
  }

  function showOwnerAlert(message, kind) {
    if (!els.ownerAlert) return;
    els.ownerAlert.textContent = message;
    els.ownerAlert.classList.remove("d-none", "alert-danger", "alert-success");
    els.ownerAlert.classList.add(kind === "ok" ? "alert-success" : "alert-danger");
    els.ownerAlert.classList.remove("d-none");
  }

  function hideOwnerAlert() {
    if (!els.ownerAlert) return;
    els.ownerAlert.classList.add("d-none");
    els.ownerAlert.textContent = "";
  }

  function fillOwnerPriceTable() {
    if (!els.ownerPriceRows) return;
    const rows = state.products
      .map(function (p) {
        const ta = p.name_ta
          ? '<div class="small text-muted">' + escapeHtml(p.name_ta) + "</div>"
          : "";
        return (
          "<tr>" +
          "<td>" +
          '<div class="fw-semibold">' +
          escapeHtml(p.name) +
          "</div>" +
          ta +
          '<div class="small text-muted">per ' +
          escapeHtml(p.unit) +
          "</div>" +
          "</td>" +
          '<td class="text-end align-middle">' +
          '<label class="visually-hidden" for="price-' +
          escapeAttr(p.id) +
          '">Price for ' +
          escapeHtml(p.name) +
          "</label>" +
          '<input type="number" min="0" step="1" class="form-control form-control-sm owner-price-input text-end ms-auto" style="max-width:7rem" id="price-' +
          escapeAttr(p.id) +
          '" data-id="' +
          escapeAttr(p.id) +
          '" value="' +
          Number(p.price) +
          '">' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    els.ownerPriceRows.innerHTML = rows;
  }

  function collectProductsWithEditedPrices() {
    const priceById = {};
    document.querySelectorAll(".owner-price-input").forEach(function (inp) {
      const id = inp.getAttribute("data-id");
      const v = parseFloat(inp.value);
      priceById[id] = Number.isFinite(v) ? Math.max(0, v) : 0;
    });
    return state.products.map(function (p) {
      const next = Object.assign({}, p);
      if (Object.prototype.hasOwnProperty.call(priceById, p.id)) {
        next.price = priceById[p.id];
      }
      return next;
    });
  }

  async function saveOwnerPrices() {
    hideOwnerAlert();
    const pin = els.ownerPin ? els.ownerPin.value.trim() : "";
    if (!pin) {
      showOwnerAlert("Enter your owner PIN first.", "err");
      return;
    }
    const products = collectProductsWithEditedPrices();
    if (!els.ownerSaveBtn) return;
    els.ownerSaveBtn.disabled = true;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin, products: products }),
      });
      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || !data.ok) {
        showOwnerAlert(data.error || "Save failed. Check PIN and try again.", "err");
        return;
      }
      showOwnerAlert("Prices saved. The list is updated.", "ok");
      const reload = await fetch("/api/products");
      if (reload.ok) {
        state.products = await reload.json();
        renderGrid();
        renderBill();
        updateStats();
      }
    } catch (e) {
      showOwnerAlert("Could not reach the server.", "err");
    } finally {
      els.ownerSaveBtn.disabled = false;
    }
  }

  function bindOwnerModal() {
    if (els.ownerModal) {
      els.ownerModal.addEventListener("shown.bs.modal", function () {
        hideOwnerAlert();
        fillOwnerPriceTable();
        if (els.ownerPin) els.ownerPin.focus();
      });
      els.ownerModal.addEventListener("hidden.bs.modal", function () {
        hideOwnerAlert();
        if (els.ownerPin) els.ownerPin.value = "";
      });
    }
    if (els.ownerSaveBtn) {
      els.ownerSaveBtn.addEventListener("click", saveOwnerPrices);
    }
  }

  function showHistoryAlert(message, kind) {
    if (!els.historyAlert) return;
    els.historyAlert.textContent = message;
    els.historyAlert.classList.remove("d-none", "alert-danger", "alert-success");
    els.historyAlert.classList.add(kind === "ok" ? "alert-success" : "alert-danger");
  }

  function hideHistoryAlert() {
    if (!els.historyAlert) return;
    els.historyAlert.classList.add("d-none");
    els.historyAlert.textContent = "";
  }

  function renderHistoryEntries(entries) {
    if (!els.historyContent) return;
    if (!entries || entries.length === 0) {
      els.historyContent.innerHTML =
        '<p class="text-muted mb-0">No history yet. Open <strong>Edit prices</strong>, change any rate, and tap <strong>Save prices</strong> — each save that changes rates is stored here for one year.</p>';
      return;
    }
    let html = "";
    entries.forEach(function (entry, index) {
      const older = entries[index + 1];
      let d;
      try {
        d = new Date(entry.ts);
      } catch (e) {
        d = null;
      }
      const dateStr = d && !isNaN(d.getTime())
        ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : escapeHtml(String(entry.ts || ""));
      const prices = entry.prices || {};
      const names = entry.names || {};
      const ids = Object.keys(prices).sort(function (a, b) {
        const na = names[a] || a;
        const nb = names[b] || b;
        return String(na).localeCompare(String(nb));
      });
      let rows = "";
      ids.forEach(function (id) {
        const name = names[id] || id;
        const p = prices[id];
        let vs = "—";
        if (older && older.prices) {
          if (!Object.prototype.hasOwnProperty.call(older.prices, id)) {
            vs = "New on this date";
          } else if (!samePrice(older.prices[id], p)) {
            vs = "was " + formatMoney(older.prices[id]);
          }
        }
        rows +=
          "<tr><td>" +
          escapeHtml(String(name)) +
          '</td><td class="text-end fw-semibold">' +
          formatMoney(p) +
          '</td><td class="text-end text-muted">' +
          escapeHtml(vs) +
          "</td></tr>";
      });
      html +=
        '<section class="history-block">' +
        '<h3 class="h6 fw-bold text-accent mb-2">' +
        escapeHtml(dateStr) +
        "</h3>" +
        '<div class="table-responsive rounded-3 border">' +
        '<table class="table table-sm table-hover mb-0 history-table">' +
        "<thead><tr><th>Item</th><th class=\"text-end\">Rate</th><th class=\"text-end\">vs previous save</th></tr></thead>" +
        "<tbody>" +
        rows +
        "</tbody></table></div></section>";
    });
    els.historyContent.innerHTML = html;
  }

  async function loadPriceHistory() {
    hideHistoryAlert();
    const pin = els.historyPin ? els.historyPin.value.trim() : "";
    if (!pin) {
      showHistoryAlert("Enter your owner PIN.", "err");
      return;
    }
    if (els.historyLoadBtn) els.historyLoadBtn.disabled = true;
    try {
      const res = await fetch("/api/price-history?pin=" + encodeURIComponent(pin));
      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || !data.ok) {
        showHistoryAlert(data.error || "Could not load history.", "err");
        if (els.historyContent) els.historyContent.innerHTML = "";
        return;
      }
      showHistoryAlert(
        "Showing up to " + (data.retain_days || 365) + " days of saved changes.",
        "ok"
      );
      renderHistoryEntries(data.entries || []);
    } catch (e) {
      showHistoryAlert("Could not reach the server.", "err");
    } finally {
      if (els.historyLoadBtn) els.historyLoadBtn.disabled = false;
    }
  }

  function bindHistoryModal() {
    if (els.historyModal) {
      els.historyModal.addEventListener("shown.bs.modal", function () {
        hideHistoryAlert();
        if (els.historyContent) {
          els.historyContent.innerHTML =
            '<p class="text-muted mb-0">Enter PIN and tap <strong>Load history</strong>.</p>';
        }
        if (els.historyPin) els.historyPin.focus();
      });
      els.historyModal.addEventListener("hidden.bs.modal", function () {
        hideHistoryAlert();
        if (els.historyPin) els.historyPin.value = "";
      });
    }
    if (els.historyLoadBtn) {
      els.historyLoadBtn.addEventListener("click", loadPriceHistory);
    }
  }

  async function init() {
    setDates();
    bindFilters();
    bindOwnerModal();
    bindHistoryModal();
    if (els.btnClear) els.btnClear.addEventListener("click", clearAll);
    if (els.btnPrint) els.btnPrint.addEventListener("click", () => window.print());

    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to load /api/products");
      state.products = await res.json();
    } catch (e) {
      try {
        const fallback = await fetch("/data/products.json");
        if (!fallback.ok) throw new Error("Failed to load /data/products.json");
        state.products = await fallback.json();
      } catch (fallbackError) {
        if (els.grid && els.loading) {
          els.loading.remove();
          els.grid.innerHTML =
            '<div class="col-12 alert alert-danger">Could not load price list. Run the Python server and refresh.</div>';
        }
        return;
      }
    }

    if (els.loading) els.loading.remove();
    renderGrid();
    renderBill();
    updateStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
