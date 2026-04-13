(function () {
  "use strict";

  const STORAGE_KEYS = {
    quantities: "ktb-quantities",
    productEdits: "ktb-product-edits",
    history: "ktb-price-history",
    bills: "ktb-bill-history",
  };

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
    persistQuantities();
  }

  function bumpQty(id, delta) {
    setQty(id, getQty(id) + delta);
  }

  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23f8f3ee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='22' fill='%23666'%3EImage unavailable%3C/text%3E%3C/svg%3E";

  function productCard(p) {
    const q = getQty(p.id);
    const line = q * p.price;
    const imageSrc = p && p.image
      ? /^https?:\/\//i.test(p.image) || p.image.startsWith("/")
        ? p.image
        : "/" + p.image.replace(/^\.?\//, "")
      : "";
    return (
      '<div class="col-12 col-sm-6 col-xl-4 product-col" data-category="' +
      escapeAttr(p.category) +
      '">' +
      '<article class="product-card">' +
      '<div class="ratio ratio-4x3">' +
      '<img src="' +
      escapeAttr(imageSrc) +
      '" alt="' +
      escapeAttr(p.name) +
      '" onerror="this.onerror=null;this.src=\'' +
      PLACEHOLDER_IMAGE +
      '\'" loading="lazy" width="400" height="300">' +
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

  function renderGrid() {
    if (!els.grid) return;
    const filtered = state.products.filter((p) => {
      return state.filter === "all" || p.category === state.filter;
    });
    if (filtered.length === 0) {
      els.grid.innerHTML =
        '<div class="col-12 text-center py-5"><div class="alert alert-secondary">No products found for this category.</div></div>';
      return;
    }
    els.grid.innerHTML = filtered.map(productCard).join("");
    bindQtyButtons();
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

  function loadFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // ignore storage failures
    }
  }

  function loadPersistedQuantities() {
    const data = loadFromStorage(STORAGE_KEYS.quantities);
    if (data && typeof data === "object") {
      state.quantities = data;
    }
  }

  function persistQuantities() {
    saveToStorage(STORAGE_KEYS.quantities, state.quantities);
  }

  function loadLocalProductEdits() {
    const data = loadFromStorage(STORAGE_KEYS.productEdits);
    return data && typeof data === "object" ? data : {};
  }

  function persistLocalProductEdits(edits) {
    saveToStorage(STORAGE_KEYS.productEdits, edits || {});
  }

  function loadLocalHistory() {
    const data = loadFromStorage(STORAGE_KEYS.history);
    return Array.isArray(data) ? data : [];
  }

  function persistLocalHistory(entries) {
    saveToStorage(STORAGE_KEYS.history, Array.isArray(entries) ? entries : []);
  }

  function loadLocalBillHistory() {
    const data = loadFromStorage(STORAGE_KEYS.bills);
    return Array.isArray(data) ? data : [];
  }

  function persistLocalBillHistory(entries) {
    saveToStorage(STORAGE_KEYS.bills, Array.isArray(entries) ? entries : []);
  }

  function mergeLocalProductEdits(products) {
    const edits = loadLocalProductEdits();
    if (!edits || Object.keys(edits).length === 0) return products;
    return products.map((p) => {
      if (Object.prototype.hasOwnProperty.call(edits, p.id)) {
        return Object.assign({}, p, { price: Number(edits[p.id] || p.price) });
      }
      return p;
    });
  }

  function appendLocalHistoryEntry(normalizedProducts) {
    const entries = loadLocalHistory();
    const newPrices = {};
    const newNames = {};
    normalizedProducts.forEach((p) => {
      newPrices[p.id] = Number(p.price);
      newNames[p.id] = p.name;
    });
    const latest = entries[0] || {};
    if (latest.prices && samePriceObject(latest.prices, newPrices)) {
      persistLocalHistory(entries);
      return;
    }
    const now = new Date().toISOString();
    entries.unshift({ ts: now, prices: newPrices, names: newNames });
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const pruned = entries.filter((entry) => {
      const t = new Date(entry.ts);
      return !Number.isNaN(t.getTime()) && t >= cutoff;
    });
    persistLocalHistory(pruned);
  }

  function samePriceObject(a, b) {
    if (!a || !b) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => samePrice(a[key], b[key]));
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
    persistQuantities();
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

  function addLocalPriceHistory(products) {
    const normalized = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
    }));
    appendLocalHistoryEntry(normalized);
  }

  function fallbackLocalSave(products) {
    const edits = {};
    products.forEach((p) => {
      edits[p.id] = Number(p.price);
    });
    persistLocalProductEdits(edits);
    state.products = mergeLocalProductEdits(products);
    addLocalPriceHistory(products);
    renderGrid();
    renderBill();
    updateStats();
    showOwnerAlert(
      "Server save failed, but prices were stored in your browser.",
      "ok"
    );
  }

  function isBackendUnavailable(status) {
    return status === 404 || status === 0 || status >= 500;
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
      if (!res.ok) {
        if (isBackendUnavailable(res.status)) {
          fallbackLocalSave(products);
          return;
        }
        showOwnerAlert(data.error || "Save failed. Check PIN and try again.", "err");
        return;
      }
      if (!data.ok) {
        showOwnerAlert(data.error || "Save failed. Check PIN and try again.", "err");
        return;
      }
      showOwnerAlert("Prices saved. The list is updated.", "ok");
      persistLocalProductEdits(
        products.reduce(function (map, item) {
          map[item.id] = Number(item.price);
          return map;
        }, {})
      );
      addLocalPriceHistory(products);
      const reload = await fetch("/api/products");
      if (reload.ok) {
        state.products = mergeLocalProductEdits(await reload.json());
        renderGrid();
        renderBill();
        updateStats();
      }
    } catch (e) {
      fallbackLocalSave(products);
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

  function saveCurrentBill() {
    const billItems = [];
    state.products.forEach(p => {
      const q = getQty(p.id);
      if (q > 0) {
        billItems.push({
          id: p.id,
          name: p.name,
          price: p.price,
          quantity: q,
          total: q * p.price
        });
      }
    });
    if (billItems.length === 0) return;
    const { grand } = computeTotals();
    const billEntry = {
      ts: new Date().toISOString(),
      items: billItems,
      total: grand
    };
    const bills = loadLocalBillHistory();
    bills.unshift(billEntry);
    persistLocalBillHistory(bills);
  }

  function printBillEntry(entry) {
    const items = entry.items || [];
    let billHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">';
    billHtml += '<h2 style="text-align: center;">Kayathri Tailor - Bill</h2>';
    billHtml += '<p><strong>Date:</strong> ' + (new Date(entry.ts).toLocaleString("en-IN")) + '</p>';
    billHtml += '<table style="width: 100%; border-collapse: collapse;">';
    billHtml += '<thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Item</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Qty</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rate</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th></tr></thead>';
    billHtml += '<tbody>';
    items.forEach(item => {
      billHtml += '<tr><td style="border: 1px solid #ddd; padding: 8px;">' + escapeHtml(item.name) + '</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">' + item.quantity + '</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">' + formatMoney(item.price) + '</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">' + formatMoney(item.total) + '</td></tr>';
    });
    billHtml += '</tbody></table>';
    billHtml += '<p style="text-align: right; font-weight: bold;">Total: ' + formatMoney(entry.total || 0) + '</p>';
    billHtml += '</div>';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(billHtml);
    printWindow.document.close();
    printWindow.print();
  }

  function renderHistoryEntries(entries) {
    if (!els.historyContent) return;
    if (!entries || entries.length === 0) {
      els.historyContent.innerHTML =
        '<p class="text-muted mb-0">No bill history yet. Print a bill to start storing data.</p>';
      return;
    }
    let html = '<div class="mb-3"><div class="btn-group" role="group">';
    html += '<button type="button" class="btn btn-outline-secondary active" data-period="all">All</button>';
    html += '<button type="button" class="btn btn-outline-secondary" data-period="weekly">Weekly</button>';
    html += '<button type="button" class="btn btn-outline-secondary" data-period="monthly">Monthly</button>';
    html += '<button type="button" class="btn btn-outline-secondary" data-period="yearly">Yearly</button>';
    html += '</div></div>';
    const now = new Date();
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.ts);
      const diffTime = now - entryDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const activePeriod = document.querySelector('[data-period].active')?.getAttribute('data-period') || 'all';
      if (activePeriod === 'weekly') return diffDays <= 7;
      if (activePeriod === 'monthly') return diffDays <= 30;
      if (activePeriod === 'yearly') return diffDays <= 365;
      return true;
    });
    filteredEntries.forEach(function (entry, index) {
      let d;
      try {
        d = new Date(entry.ts);
      } catch (e) {
        d = null;
      }
      const dateStr = d && !isNaN(d.getTime())
        ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : escapeHtml(String(entry.ts || ""));
      const items = entry.items || [];
      let rows = "";
      items.forEach(function (item) {
        rows +=
          "<tr><td>" +
          escapeHtml(item.name) +
          '</td><td class="text-end">' +
          item.quantity +
          '</td><td class="text-end">' +
          formatMoney(item.price) +
          '</td><td class="text-end fw-semibold">' +
          formatMoney(item.total) +
          "</td></tr>";
      });
      html +=
        '<section class="history-block">' +
        '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<h3 class="h6 fw-bold text-accent mb-0">' +
        escapeHtml(dateStr) +
        '</h3>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary history-print-btn" data-index="' + index + '">Print Bill</button>' +
        '</div>' +
        '<div class="table-responsive rounded-3 border">' +
        '<table class="table table-sm table-hover mb-0 history-table">' +
        "<thead><tr><th>Item</th><th class=\"text-end\">Qty</th><th class=\"text-end\">Rate</th><th class=\"text-end\">Amount</th></tr></thead>" +
        "<tbody>" +
        rows +
        "</tbody></table></div>" +
        '<div class="text-end mt-2"><strong>Total: ' + formatMoney(entry.total || 0) + '</strong></div></section>';
    });
    els.historyContent.innerHTML = html;
    // Bind period filters
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        renderHistoryEntries(entries);
      });
    });
    // Bind print buttons
    document.querySelectorAll('.history-print-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'), 10);
        printBillEntry(filteredEntries[index]);
      });
    });
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
      // For now, load local bill history
      const localBills = loadLocalBillHistory();
      if (localBills.length > 0) {
        showHistoryAlert("Showing stored bill history.", "ok");
        renderHistoryEntries(localBills);
        return;
      }
      showHistoryAlert("No bill history found.", "err");
    } catch (e) {
      showHistoryAlert("Could not load history.", "err");
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
    if (els.btnPrint) els.btnPrint.addEventListener("click", () => {
      saveCurrentBill();
      window.print();
    });

    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to load /api/products");
      state.products = await res.json();
    } catch (e) {
      try {
        const fallback = await fetch("data/products.json");
        if (!fallback.ok) throw new Error("Failed to load data/products.json");
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

    state.products = mergeLocalProductEdits(state.products);
    loadPersistedQuantities();

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
