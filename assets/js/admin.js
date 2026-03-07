(function () {
  const token = localStorage.getItem("token");
  const raw = localStorage.getItem("user");

  if (!token || !raw) {
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(raw);

  // ONLY admin allowed
  if (user.role !== "admin") {
    window.location.href = "index.html";
  }
})();

function adminNotifications() {
  return {
    open: false,
    modalOpen: false,
    notifications: [],
    unread: [],

    async loadNotifications() {
      const token = localStorage.getItem("token");

      const res = await fetch("https://perfume-store-production.up.railway.app/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!data.success) return;

      this.notifications = data.notifications;
      this.unread = this.notifications.filter(n => !n.isRead);
    },

    get unreadCount() {
      return this.unread.length;
    },

    async markAsRead(n) {
      if (n.isRead) return;

      const token = localStorage.getItem("token");

      await fetch(
        `https://perfume-store-production.up.railway.app/api/notifications/${n._id}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      n.isRead = true;
      this.unread = this.unread.filter(x => x._id !== n._id);
    }
  };
}

function openAdminNotificationModal(notifications) {
  const modal = document.getElementById("adminNotificationModal");
  const body = document.getElementById("adminNotificationModalBody");

  body.innerHTML = "";

  if (!notifications || notifications.length === 0) {
    body.innerHTML = `
      <div class="p-6 text-center text-sm opacity-60">
        No notifications
      </div>
    `;
  } else {
    notifications.forEach(n => {
      const div = document.createElement("div");
      div.className = "p-4";
      if (!n.isRead) {
        div.classList.add("bg-bronze/5", "dark:bg-primary/5");
      }
      div.innerHTML = `
        <p class="font-semibold">${n.title}</p>
        <p class="text-sm opacity-70 mt-1">${n.message}</p>
      `;
      body.appendChild(div);
    });
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAdminNotificationModal() {
  const modal = document.getElementById("adminNotificationModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// close on background click
document
  .getElementById("adminNotificationModal")
  .addEventListener("click", e => {
    if (e.target.id === "adminNotificationModal") {
      closeAdminNotificationModal();
    }
  });

function adminProducts() {
  return {
    products: [],
    view: 'grid',
    qualityFilter: "all", 
    primaryTagSuggestions: [],

    /* ================= LOAD ================= */
    async loadProducts() {
      const token = localStorage.getItem("token");
      const res = await fetch("https://perfume-store-production.up.railway.app/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      this.products = data.products || [];
    },

    /* ================= SIZES ================= */
    enabledBottleSizes(product) {
      if (!product.bottleSizes || !Array.isArray(product.bottleSizes)) {
        return "-";
      }

      return product.bottleSizes
        .map(size => `${size.sizeMl}ml`)
        .join(", ");
    },
    sizeStockBadges(product) {
  if (!product.bottleSizes) return [];

  return product.bottleSizes.map(s => {
    let status = "ok";
    if (s.stock === 0) status = "out";
    else if (s.stock < 20) status = "low";

    return {
      size: s.sizeMl,
      stock: s.stock,
      status
    };
  });
}
,

async loadPrimaryTags() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      "https://perfume-store-production.up.railway.app/api/products/admin/primary-tags",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    if (data.success) {
      this.primaryTagSuggestions = data.tags;
    }
  } catch (e) {
    console.error("Failed to load primary tags", e);
  }
},
    /* ================= VIEW MODAL ================= */
    openView(product) {
      Alpine.store("productUI").selected = product;
      Alpine.store("productUI").viewOpen = true;
    },

    /* ================= DELETE MODAL ================= */
    openDelete(product) {
      Alpine.store("productUI").selected = product;
      Alpine.store("productUI").deleteOpen = true;
    },


    /* ================= TOGGLE STATUS ================= */
    async toggleStatus(product) {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://perfume-store-production.up.railway.app/api/admin/products/${product._id}/toggle`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        alert("Failed to update product status");
        return;
      }

      const data = await res.json();
      product.active = data.active;
    }
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.store("productUI", {

    /* ================= STATE ================= */
    editOpen: false,
    viewOpen: false,
    deleteOpen: false,

    selected: null,
    original: null,

    /* ================= OPEN MODALS ================= */
    openEdit(product) {
      this.selected = JSON.parse(JSON.stringify(product));
      this.original = JSON.parse(JSON.stringify(product));
      this.editOpen = true;
    },

    openView(product) {
      this.selected = product;
      this.viewOpen = true;
    },

    openDelete(product) {
      this.selected = product;
      this.deleteOpen = true;
    },

    /* ================= CLOSE ================= */
    closeAll() {
      this.editOpen = false;
      this.viewOpen = false;
      this.deleteOpen = false;
      this.selected = null;
      this.original = null;
    },

    /* ================= SAVE (EDIT PRODUCT) ================= */
    async save() {
  const token = localStorage.getItem("token");
  const s = this.selected;
  const o = this.original;

  if (!s || !o) {
    alert("No product selected");
    return;
  }

  const changed =
    JSON.stringify({
      name: s.name,
      quality: s.quality,
      description: s.description,
      prices: s.prices
    }) !==
    JSON.stringify({
      name: o.name,
      quality: o.quality,
      description: o.description,
      prices: o.prices
    });

  if (!changed) {
    alert("Change at least one field before saving");
    return;
  }

  if (!s.prices?.base6ml || s.prices.base6ml <= 0) {
    alert("Base 6ml price is required");
    return;
  }
  const normalizeNotes = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
};

  const payload = {
    name: s.name,
    quality: s.quality,
    description: s.description,
    prices: {
      base6ml: Number(s.prices.base6ml),
      sizePercentages: {
        size3: Number(s.prices.sizePercentages?.size3 ?? -30),
        size12: Number(s.prices.sizePercentages?.size12 ?? 35)
      },
      discountPercentages: {
        base: s.prices.discountPercentages?.base ?? null,
        size3: s.prices.discountPercentages?.size3 ?? null,
        size12: s.prices.discountPercentages?.size12 ?? null
      }
    },
    fragranceVariants: Array.isArray(s.fragranceVariants)
  ? s.fragranceVariants.map(v => v.trim()).filter(Boolean)
  : [],

  notes: {
    top: normalizeNotes(s.notes?.top),
    heart: normalizeNotes(s.notes?.heart),
    base: normalizeNotes(s.notes?.base)
  },

  attributes: {
    longLasting: !!s.attributes?.longLasting,
    alcoholFree: !!s.attributes?.alcoholFree,
    pureAttar: !!s.attributes?.pureAttar
  }
};

  try {
    const res = await fetch(
      `https://perfume-store-production.up.railway.app/api/admin/products/${s._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Update failed");
    }

    alert("Product updated successfully");
    this.closeAll();

    const adminComp = document.querySelector('[x-data="adminProducts()"]');
    if (adminComp?.__x?.$data?.loadProducts) {
      adminComp.__x.$data.loadProducts();
    }

  } catch (err) {
    console.error("UPDATE FAILED:", err);
    alert("Failed to update product");
  }
}

  });
});

window.loyaltyBadgeConfig = function (tier) {
  const map = {
    bronze:   { label: 'Bronze',   icon: 'workspace_premium', color: 'bg-amber-100 text-amber-800' },
    silver:   { label: 'Silver',   icon: 'military_tech',     color: 'bg-gray-200 text-gray-800' },
    gold:     { label: 'Gold',     icon: 'emoji_events',      color: 'bg-yellow-100 text-yellow-800' },
    platinum: { label: 'Platinum', icon: 'stars',             color: 'bg-indigo-100 text-indigo-800' },
    diamond:  { label: 'Diamond',  icon: 'diamond',           color: 'bg-primary/10 text-primary' }
  };
  return map[tier] || map.bronze;
};

function usersSection() {
  return {
    users: [],
    loading: true,

    search: '',
    filterRole: '',
    filterStatus: '',
    viewMode: 'list',
    currentPage: 1,
    perPage: 6,

    async fetchUsers() {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch('https://perfume-store-production.up.railway.app/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        this.users = data.users.map(u => ({
  id: u._id,
  name: u.name || u.email.split('@')[0],
  email: u.email,

  // ===== CORE (ADMIN + USER) =====
  phone: u.phone || '',
  address: u.address || '',

  // ===== USER-ENTERED DETAILS (VIEW ONLY FOR ADMIN) =====
  profileDetails: {
    province: u.profileDetails?.province || '',
    district: u.profileDetails?.district || '',
    city: u.profileDetails?.city || '',
    postalCode: u.profileDetails?.postalCode || ''
  },

  notes: u.notes || '',
  role: u.role || 'user',
  status: u.computedStatus || 'active',
  avatar: u.avatar || this.fallbackAvatar(u),
  loyaltyTier: u.loyaltyTier || 'bronze',
  loyaltyMode: u.loyaltyMode || 'auto'
}));

      } catch (err) {
        console.error('FAILED TO LOAD USERS', err);
        alert('Failed to load users');
      } finally {
        this.loading = false;
      }
    },

    pagedUsers() {
      const start = (this.currentPage - 1) * this.perPage;
      return this.filteredUsers().slice(start, start + this.perPage);
    },

    goToPage(page) {
      this.currentPage = page;
    },

    totalPages() {
      return Math.max(1, Math.ceil(this.filteredUsers().length / this.perPage));
    },

    formatRole(role) {
      return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
    },

    formatStatus(status) {
      return status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : 'Active';
    },

   

    fallbackAvatar(user) {
      const base = user.name || user.email.split('@')[0];
      const initials = base
        .split(' ')
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      return `https://ui-avatars.com/api/?name=${initials}&background=8B5A2B&color=fff`;
    },

    filteredUsers() {
      return this.users.filter(u => {
        const q = this.search.toLowerCase().trim();
        if (q && !(`${u.name} ${u.email} ${u.id}`).toLowerCase().includes(q)) return false;
        if (this.filterRole && u.role !== this.filterRole) return false;
        if (this.filterStatus && u.status !== this.filterStatus) return false;
        return true;
      });
    }
  };
}

document.addEventListener('alpine:init', () => {

  Alpine.store('stock', {

    /* ================= STATE ================= */
    items: [],
    updateOpen: false,
    bulkOpen: false,

    editItem: null,
    selectedSize: null,

    addValue: '',
    reduceValue: '',

    bulk: {
      quality: 'all',
      size: 'all',
      action: 'increase',
      value: 0
    },

    /* ================= LOAD ================= */
    async loadStockProducts() {
      const token = localStorage.getItem("token");

      const res = await fetch("https://perfume-store-production.up.railway.app/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      this.items = (data.products || []).map(p => {
        const totalStock = (p.bottleSizes || []).reduce(
          (sum, s) => sum + (s.stock || 0),
          0
        );

        let status = "In Stock";
        if (totalStock === 0) status = "Out of Stock";
        else if (totalStock < 20) status = "Low Stock";

        return {
          id: p._id,
          name: p.name,
          image: p.images?.[0]
            ? `https://perfume-store-production.up.railway.app/${p.images[0]}`
            : "",
          quality: p.quality,
          reorder: 20,
          status,
          bottleSizes: p.bottleSizes.map(s => ({
            sizeMl: s.sizeMl,
            stock: s.stock || 0,
            enabled: s.enabled === true
          }))
        };
      });
    },

    /* ================= OPEN UPDATE ================= */
    openUpdate(item) {
      this.editItem = JSON.parse(JSON.stringify(item));
      this.selectedSize = null;
      this.addValue = '';
      this.reduceValue = '';
      this.updateOpen = true;
    },

    /* ================= SIZE SELECT ================= */
    selectSize(size) {
  this.selectedSize = size;
  this.addValue = '';
  this.reduceValue = '';
},


    /* ================= TOGGLE ================= */
    toggleAvailability(size) {
      if (size.stock === 0) {
        size.enabled = false;
        return;
      }
      size.enabled = !size.enabled;

      if (!size.enabled && this.selectedSize?.sizeMl === size.sizeMl) {
        this.selectedSize = null;
      }
    },

    /* ================= SAVE SINGLE ================= */
    async saveStock() {
      const token = localStorage.getItem("token");

      if (this.selectedSize) {
        const add = Number(this.addValue) || 0;
        const reduce = Number(this.reduceValue) || 0;

        let newStock = this.selectedSize.stock + add - reduce;
        if (newStock < 0) newStock = 0;

        this.selectedSize.stock = newStock;

// auto-enable only if stock was 0 → now > 0
if (newStock > 0 && this.selectedSize.enabled === false) {
  this.selectedSize.enabled = true;
}

// auto-disable if stock becomes 0
if (newStock === 0) {
  this.selectedSize.enabled = false;
}

      }

      const payload = {
        bottleSizes: this.editItem.bottleSizes.map(s => ({
          sizeMl: s.sizeMl,
          stock: Number(s.stock),
          enabled: Boolean(s.enabled)
        }))
      };

      await fetch(
        `https://perfume-store-production.up.railway.app/api/admin/products/${this.editItem.id}/stock`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      await this.loadStockProducts();
      this.updateOpen = false;
    },

    /* ================= BULK APPLY ================= */
    async applyBulkUpdate() {
      const token = localStorage.getItem("token");
      const value = Number(this.bulk.value);
      if (!value || value <= 0) return;

      for (const item of this.items) {

        if (this.bulk.quality !== 'all' && item.quality !== this.bulk.quality) {
          continue;
        }

        const updatedSizes = item.bottleSizes.map(s => {
          if (this.bulk.size !== 'all' && Number(this.bulk.size) !== s.sizeMl) {
            return s;
          }

          let stock = s.stock || 0;

          if (this.bulk.action === 'increase') {
            stock += value;
          } else {
            stock = Math.max(0, stock - value);
          }

          return {
            ...s,
            stock,
            enabled: stock > 0
          };
        });

        await fetch(
          `https://perfume-store-production.up.railway.app/api/admin/products/${item.id}/stock`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ bottleSizes: updatedSizes })
          }
        );
      }

      await this.loadStockProducts();
      this.bulkOpen = false;
      this.bulk.value = 0;
    }

  });

});

document.addEventListener('DOMContentLoaded', () => {
  Alpine.store('stock').loadStockProducts();
});

function adminReviews() {
  return {
    reviews: [],
    modalOpen: false,
    selected: null,
    replyText: "",

    async loadReviews() {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "https://perfume-store-production.up.railway.app/api/products/admin/reviews",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();
      this.reviews = data.reviews || [];
    },

    openModal(item) {
      this.selected = item;
      this.replyText = item.review.adminReply || "";
      this.modalOpen = true;
    },
    async deleteReview(item) {
  if (!confirm("Are you sure you want to delete this review?")) return;

  const token = localStorage.getItem("token");

  const res = await fetch(
    `https://perfume-store-production.up.railway.app/api/products/${item.product._id}/reviews/${item.review._id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    alert("Failed to delete review");
    return;
  }

  // 🔥 Remove from UI instantly
  this.reviews = this.reviews.filter(
    r => r.review._id !== item.review._id
  );
},
    async saveReply() {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://perfume-store-production.up.railway.app/api/products/${this.selected.product._id}/reviews/${this.selected.review._id}/reply`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            adminReply: this.replyText,
            featured: this.selected.review.featured
          })
        }
      );

      if (!res.ok) {
        alert("Failed to save reply");
        return;
      }

      this.selected.review.adminReply = this.replyText;
      this.modalOpen = false;
    },

    async toggleFeatured(item) {
      const token = localStorage.getItem("token");

      await fetch(
        `https://perfume-store-production.up.railway.app/api/products/${item.product._id}/reviews/${item.review._id}/reply`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            adminReply: item.review.adminReply,
            featured: !item.review.featured
          })
        }
      );

      item.review.featured = !item.review.featured;
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('adminBlogs', () => ({

    /* ================= STATE ================= */
    blogListView: 'grid',
    blogs: [],
    loading: false,
    secondaryImageFile: null,
secondaryImagePreview: null,

    editorOpen: false,
    editorMode: 'add',
    editingId: null,

    /* ================= FORM ================= */
    form: {
      title: '',
      content: '',
      tags: [],
      featured: false,
      status: 'draft'
    },

    coverFile: null,
    coverPreview: null,

    /* ================= HELPERS ================= */
    api(url, options = {}) {
      const token = localStorage.getItem('token');
      return fetch(`https://perfume-store-production.up.railway.app${url}`, {
        headers: { Authorization: `Bearer ${token}` },
        ...options
      });
    },
  
    handleSecondaryImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  this.secondaryImageFile = file;
  this.secondaryImagePreview = URL.createObjectURL(file);
},

    imageUrl(path) {
      if (!path) return '/images/placeholder.jpg';
      return `https://perfume-store-production.up.railway.app/${path.replace(/^src\//, '')}`;
    },

    resetForm() {
      this.form = {
        title: '',
        content: '',
        tags: [],
        featured: false,
        status: 'draft'
      };
      this.coverFile = null;
      this.coverPreview = null;
      this.editingId = null;
    },

    /* ================= LOAD ================= */
    async loadBlogs() {
      this.loading = true;
      const res = await this.api('/api/blogs/admin/all');
      const data = await res.json();
      this.blogs = data.blogs || [];
      this.loading = false;
    },

    /* ================= EDITOR ================= */
    openAddEditor() {
      this.resetForm();
      this.editorMode = 'add';
      this.editorOpen = true;
    },
    wrapSelection(tag) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const content = range.extractContents();
  const el = document.createElement(tag);
  el.appendChild(content);
  range.insertNode(el);

  sel.removeAllRanges();
},
    openEdit(blog) {
      this.resetForm();
      this.editorMode = 'edit';
      this.editingId = blog._id;

      this.form = {
        title: blog.title,
        content: blog.content,
        tags: [...blog.tags],
        featured: blog.featured,
        status: blog.status
      };

      this.coverPreview = this.imageUrl(blog.mainImage);
      this.editorOpen = true;

      this.$nextTick(() => {
        this.$refs.editor.innerHTML = blog.content;
      });
    },

    closeEditor() {
      this.editorOpen = false;
      this.resetForm();
    },
    focusEditor() {
  this.$refs.editor.focus();
},
    /* ================= IMAGE ================= */
    handleCoverUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.coverFile = file;
      this.coverPreview = URL.createObjectURL(file);
    },

    /* ================= TAGS ================= */
    addTag(tag) {
      tag = tag.trim();
      if (!tag || this.form.tags.includes(tag)) return;
      this.form.tags.push(tag);
    },

    removeTag(tag) {
      this.form.tags = this.form.tags.filter(t => t !== tag);
    },

    /* ================= SAVE ================= */
    async submit(status) {
      this.form.status = status;

      const fd = new FormData();
      Object.entries(this.form).forEach(([k, v]) => {
        if (k === 'tags') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (this.secondaryImageFile) {
  fd.append('secondaryImage', this.secondaryImageFile);
}

      if (this.coverFile) fd.append('mainImage', this.coverFile);

      const url = this.editorMode === 'add'
        ? '/api/blogs'
        : `/api/blogs/${this.editingId}`;

      const method = this.editorMode === 'add' ? 'POST' : 'PATCH';

      await this.api(url, { method, body: fd });

      await this.loadBlogs();
      this.closeEditor();
    },

    saveDraft() { this.submit('draft'); },
    publishArticle() { this.submit('published'); },
    saveChanges() { this.submit(this.form.status); },

    /* ================= DELETE ================= */
    async deleteBlog(id) {
      if (!confirm('Delete this article?')) return;
      await this.api(`/api/blogs/${id}`, { method: 'DELETE' });
      this.blogs = this.blogs.filter(b => b._id !== id);
    }

  }));
});

/* ================= USER HELPERS ================= */
function getUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw);
}

function setUser(patch) {
  const current = getUser() || {};
  const updated = { ...current, ...patch };
  localStorage.setItem("user", JSON.stringify(updated));
}

/* ================= AVATAR FALLBACK ================= */
function getAvatarUrl(user) {
  if (user.avatar) return user.avatar;

  const base = user.name || user.email.split("@")[0];
  const initials = base
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return "https://ui-avatars.com/api/?name=" +
    initials +
    "&background=8B5A2B&color=fff";
}

/* ================= UI SYNC ================= */
function syncAvatarUI() {
  const user = getUser();
  if (!user) return;

  const avatarUrl = getAvatarUrl(user);

  document
    .querySelectorAll("[data-user-avatar], #avatarPreview")
    .forEach(img => {
      img.src = avatarUrl + "?v=" + Date.now();
    });
}

function syncUserTextUI() {
  const user = getUser();
  if (!user) return;

  document.querySelectorAll("[data-user-name]").forEach(el => {
    el.textContent = user.name || user.email.split("@")[0];
  });
}

/* ================= AVATAR UPLOAD ================= */
async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 🔒 HARD CHECK (no accept attribute needed)
  if (!file.type.startsWith("image/")) {
    alert("Only image files are allowed");
    event.target.value = "";
    return;
  }

  // Preview immediately
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById("avatarPreview");
    if (preview) preview.src = e.target.result;
  };
  reader.readAsDataURL(file);

  try {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("https://perfume-store-production.up.railway.app/api/users/avatar", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    setUser({ avatar: data.user.avatar });
    syncAvatarUI();

  } catch (err) {
    console.error(err);
    alert("Avatar upload failed");
  } finally {
    event.target.value = "";
  }
}

/* ================= UPDATE ADMIN NAME ================= */
async function updateAdminProfile() {
  const input = document.getElementById("admin-name-input");
  if (!input) return;

  const newName = input.value.trim();
  if (!newName) {
    alert("Name cannot be empty");
    return;
  }

  try {
    const token = localStorage.getItem("token");

    const res = await fetch("https://perfume-store-production.up.railway.app/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: newName })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    setUser({ name: data.user.name });
    syncUserTextUI();

    alert("Profile updated");

  } catch (err) {
    console.error(err);
    alert("Failed to update profile");
  }
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user) return;

  const input = document.getElementById("admin-name-input");
  if (input) {
    input.value = user.name || user.email.split("@")[0];
  }

  syncAvatarUI();
  syncUserTextUI();
});

function adminNotificationSettings() {
    return {
      form: {
        notificationEmail: "",
        whatsappNumber: "",
        smsNumber: "",
        channels: {
          email: true,
          whatsapp: true,
          sms: false
        }
      },
  
      async loadSettings() {
        try {
          const token = localStorage.getItem("token");
  
          const res = await fetch(
            "https://perfume-store-production.up.railway.app/api/admin/settings",
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
  
          const data = await res.json();
          if (data.success) {
            this.form = data.settings;
          }
        } catch (e) {
          console.error("Failed to load admin settings", e);
        }
      },
  
      async saveSettings() {
        try {
          const token = localStorage.getItem("token");
  
          const res = await fetch(
            "https://perfume-store-production.up.railway.app/api/admin/settings",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(this.form)
            }
          );
  
          const data = await res.json();
          if (!data.success) throw new Error();
  
          window.dispatchEvent(new CustomEvent("modal", {
            detail: {
              title: "Success",
              message: "Notification settings updated successfully",
              type: "success"
            }
          }));
        } catch (e) {
          window.dispatchEvent(new CustomEvent("modal", {
            detail: {
              title: "Error",
              message: "Failed to update notification settings",
              type: "error"
            }
          }));
        }
      }
    };
  }

document.addEventListener('alpine:init', () => {
  Alpine.store('userModals', {
    viewOpen: false,
    editOpen: false,
    addOpen: false,
    deleteOpen: false,

    activeUser: null,
    newUser: null,

    /* ---------- OPENERS ---------- */

    openView(user) {
  this.activeUser = {
    _id: user._id || user.id,

    name: user.name,
    email: user.email,

    phone: user.phone || '',
    address: user.address || '',
    notes: user.notes || '',

    role: user.role || 'user',
    status: user.status || 'active',

    avatar: user.avatar || '',
    profileDetails: {
      province: user.profileDetails?.province || "",
      district: user.profileDetails?.district || "",
      city: user.profileDetails?.city || "",
      postalCode: user.profileDetails?.postalCode || ""
    }
  };

  this.viewOpen = true;
}
,

openEdit(user) {
  this.activeUser = {
    ...user,
    _id: user._id || user.id,
    role: user.role || 'user',
    status: user.status || 'active'
  };
  this.editOpen = true;
}
,
    openDelete(user) {
      this.activeUser = {
        ...user,
        _id: user._id || user.id
      };
      this.deleteOpen = true;
    },

    openAdd() {
  this.newUser = {
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    password: '',
    role: 'user',
    status: 'active'
  };
  this.addOpen = true;
},

    /* ---------- ACTIONS ---------- */

    async saveEdit() {
  const u = this.activeUser;

  const res = await fetch(
    `https://perfume-store-production.up.railway.app/api/users/${u._id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        name: u.name,
        phone: u.phone,
        address: u.address,
        role: u.role,
        status: u.status, // ✅ active | suspended
        notes: u.notes,
          // 🔹 ADD THESE (REQUIRED)
  loyaltyMode: u.loyaltyMode,
  loyaltyTier: u.loyaltyTier
      })
    }
  );

  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "Update failed");
    return;
  }

  this.editOpen = false;
  location.reload();
}
,
    async confirmDelete() {
      if (!this.activeUser?._id) return;

      const res = await fetch(
        `https://perfume-store-production.up.railway.app/api/users/${this.activeUser._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!res.ok) {
        alert("Failed to delete user");
        return;
      }

      this.deleteOpen = false;
      this.activeUser = null;
      location.reload(); // simple & safe for now
    },

    async saveNewUser() {
      const res = await fetch(
        "https://perfume-store-production.up.railway.app/api/admin/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(this.newUser)
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to add user");
        return;
      }

      this.addOpen = false;
      location.reload();
    }
  });
});

document.addEventListener('alpine:init', () => {
  Alpine.store('orders', {
    /* ================= EXISTING ================= */
    orderDetailsModalOpen: false,
    newOrderModalOpen: false,
    cancelConfirmOpen: false,
    selectedOrder: null,

    /* ================= NEW ORDER STATE ================= */
    newOrder: {
      customer: {
        name: "",
        phone: "",
        address: ""
      },
      items: [
        { name: "", size: "6ml", qty: 1, unitPrice: 0 }
      ],
      notes: ""
    },

    /* ================= ORDER DETAILS ================= */
    openDetails(order) {
      this.selectedOrder = null;
      this.orderDetailsModalOpen = true;
      this.fetchOrderDetails(order._id);
    },

    async fetchOrderDetails(orderId) {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `https://perfume-store-production.up.railway.app/api/orders/admin/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // 🔥 FORCE paymentMethod to exist
    this.selectedOrder = {
      ...data.order,
      paymentMethod: data.order.paymentMethod ?? null
    };

  } catch (err) {
    console.error("LOAD ORDER DETAILS FAILED", err);
    alert("Failed to load order details");
    this.orderDetailsModalOpen = false;
  }
},

    closeDetails() {
      this.orderDetailsModalOpen = false;
      this.selectedOrder = null;
    },

    /* ================= NEW ORDER ================= */
    openNewOrder() {
      this.newOrderModalOpen = true;
    },

    closeNewOrder() {
      this.newOrderModalOpen = false;
      this.resetNewOrder();
    },

    addItem() {
      this.newOrder.items.push({
        name: "",
        size: "6ml",
        qty: 1,
        unitPrice: 0
      });
    },

    removeItem(index) {
      this.newOrder.items.splice(index, 1);
    },

    async saveNewOrder() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          "https://perfume-store-production.up.railway.app/api/orders/admin/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(this.newOrder)
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        alert("Order created successfully");
        this.closeNewOrder();

        const admin = document.querySelector('[x-data="adminOrders()"]');
        admin?.__x?.$data?.loadOrders();

      } catch (err) {
        console.error("ADMIN CREATE ORDER FAILED", err);
        alert("Failed to create order");
      }
    },

    resetNewOrder() {
      this.newOrder = {
        customer: { name: "", phone: "", address: "" },
        items: [{ name: "", size: "6ml", qty: 1, unitPrice: 0 }],
        notes: ""
      };
    },

    /* ================= CANCEL ================= */
    openCancel(order) {
      this.selectedOrder = order;
      this.cancelConfirmOpen = true;
    },

    closeCancel() {
      this.cancelConfirmOpen = false;
    },

    async cancelOrder() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `https://perfume-store-production.up.railway.app/api/orders/admin/orders/${this.selectedOrder._id}/cancel`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return alert("Failed to cancel order");

        this.selectedOrder.orderStatus = "cancelled";
        this.selectedOrder.paymentStatus = "refunded";
        this.cancelConfirmOpen = false;

      } catch (err) {
        console.error("CANCEL ORDER ERROR:", err);
        alert("Server error while cancelling order");
      }
    }
  });
});

function adminOrders() {
  return {
    orders: [],
    filterStatus: '',
    filterDate: '',
    currentPage: 1,
    perPage: 5,

    $watch: {
  filterStatus() {
    this.currentPage = 1;
  },
  filterDate() {
    this.currentPage = 1;
  }
},
async markDelivered(order) {
  if (!order || !order._id) {
    window.modal.show({
      title: "Error",
      message: "Invalid order",
      type: "error"
    });
    return;
  }

  if (!confirm("Mark this order as delivered?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `https://perfume-store-production.up.railway.app/api/orders/${order._id}/received`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed");
    }

    // 🔥 UPDATE UI IMMEDIATELY
    order.orderStatus = "delivered";

    window.modal.show({
      title: "Success",
      message: "Order marked as delivered",
      type: "success"
    });

  } catch (err) {
    console.error("DELIVER ERROR:", err);
    window.modal.show({
      title: "Error",
      message: err.message || "Server error",
      type: "error"
    });
  }
},

goToPage(page) {
  this.currentPage = page;
},
async returnOrder(order) {
  if (!confirm("Mark this order as RETURNED?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `https://perfume-store-production.up.railway.app/api/orders/admin/orders/${order._id}/return`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // TEMP: backend may not exist yet
    if (!res.ok) {
      // fallback for now
      console.warn("Return API not ready yet, simulating UI update");
    }

    order.orderStatus = "returned";

    // Payment logic (IMPORTANT for analytics later)
    if (order.paymentMethod === "online" && order.paymentStatus === "paid") {
      order.paymentStatus = "refunded"; // 🔥 placeholder
    }

  } catch (err) {
    console.error("RETURN ORDER FAILED", err);
    alert("Failed to mark order as returned");
  }
},
    filteredOrders() {
  return this.orders.filter(o => {
    // STATUS FILTER
    if (this.filterStatus) {
      const map = {
        pending: "pending",
        approved: "confirmed",
        shipped: "shipped",
        delivered: "delivered",
        cancelled: "cancelled"
      };

      const selected = map[this.filterStatus.toLowerCase()];
      if (o.orderStatus !== selected) return false;
    }

    // DATE FILTER
    if (this.filterDate && o.date !== this.filterDate) return false;

    return true;
  });
},
stats() {
  return {
    total: this.orders.length,
    pending: this.orders.filter(o => o.orderStatus === "pending").length,
    approved: this.orders.filter(o => o.orderStatus === "confirmed").length,
    shipped: this.orders.filter(o => o.orderStatus === "shipped").length,
    delivered: this.orders.filter(o => o.orderStatus === "delivered").length,
    cancelled: this.orders.filter(o => o.orderStatus === "cancelled").length
  };
},
    async loadOrders() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("https://perfume-store-production.up.railway.app/api/orders/admin/orders", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        this.orders = data.orders.map(o => ({
  _id: o._id,
  id: "#ORD-" + o._id.slice(-6).toUpperCase(),
  customer: o.customer.name,
  amount: o.total,
  date: new Date(o.createdAt).toISOString().split("T")[0],

  paymentMethod: o.paymentMethod, // ✅ ADD THIS LINE

  paymentStatus: o.paymentStatus,
  orderStatus: o.orderStatus
}));

      } catch (err) {
        console.error("LOAD ORDERS FAILED", err);
        alert("Failed to load orders");
      }
    },
    pagedOrders() {
  this.normalizePage();
  const start = (this.currentPage - 1) * this.perPage;
  return this.filteredOrders().slice(start, start + this.perPage);
},

normalizePage() {
  if (this.currentPage > this.totalPages()) {
    this.currentPage = this.totalPages();
  }
  if (this.currentPage < 1) {
    this.currentPage = 1;
  }
},


totalPages() {
  return Math.max(1, Math.ceil(this.filteredOrders().length / this.perPage));
},
    async confirmOrder(order) {
      if (!confirm("Confirm this order? Stock will be deducted.")) return;

      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://perfume-store-production.up.railway.app/api/orders/admin/orders/${order._id}/confirm`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) return alert("Failed to confirm order");

      order.orderStatus = "confirmed";
    },

    async shipOrder(order) {
      if (!confirm("Mark this order as shipped?")) return;

      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://perfume-store-production.up.railway.app/api/orders/admin/orders/${order._id}/ship`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) return alert("Failed to ship order");

      order.orderStatus = "shipped";
    }
  };
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3];
  }

  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 1, currentPage, currentPage + 1];
}

async function submitProductForm(event) {
  event.preventDefault();

  const token = localStorage.getItem("token");

  const name = document.getElementById("product-name").value.trim();
  const quality = document.getElementById("quality").value;
  const description = document.getElementById("description").value.trim();
  const inventoryQty = Number(document.getElementById("inventory-qty").value);
  const base6mlPrice = Number(document.getElementById("price-tier-1").value);
  const variantsRaw = document.getElementById("fragrance-variants-input").value;
  if (!name || !quality || !description || !base6mlPrice || inventoryQty <= 0) {
    alert("Name, base price (6ml), and stock are required");
    return;
  }

  const formData = new FormData();

  formData.append("name", name);
  formData.append("quality", quality);
  formData.append("description", description);
  formData.append("inventoryQty", inventoryQty);
 

formData.append(
  "fragranceVariants",
  variantsRaw
);

formData.append(
  "notes",
  JSON.stringify({
    top: document.getElementById("top-notes").value.split(",").map(s => s.trim()).filter(Boolean),
    heart: document.getElementById("heart-notes").value.split(",").map(s => s.trim()).filter(Boolean),
    base: document.getElementById("base-notes").value.split(",").map(s => s.trim()).filter(Boolean)
  })
);
formData.append(
  "attributes",
  JSON.stringify({
    longLasting: document.getElementById("long-lasting").checked,
    alcoholFree: document.getElementById("alcohol-free").checked,
    pureAttar: document.getElementById("pure-attar").checked
  })
);

  /* ✅ NEW PRICE STRUCTURE */
  formData.append(
  "prices",
  JSON.stringify({
    base6ml: base6mlPrice,
    sizePercentages: {
      size3: -30,
      size12: 35
    },
    discountPercentages: {
      base: null,
      size3: null,
      size12: null
    }
  })
);


  const files = document.getElementById("file-upload").files;
  if (!files.length) {
    alert("Upload at least one image");
    return;
  }

  for (let f of files) {
    formData.append("images", f);
  }

  const res = await fetch("https://perfume-store-production.up.railway.app/api/admin/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "Failed to add product");
    return;
  }

    alert("Product added successfully");

  closeAddProductModal();

  // Refresh product list
  const adminProductsEl = document.querySelector('[x-data="adminProducts()"]');
  if (adminProductsEl && window.Alpine && adminProductsEl.__x) {
    const data = window.Alpine.$data(adminProductsEl);
    if (data && data.loadProducts) {
      data.loadProducts();
    }
  }
}

let selectedProductImages = [];

function previewProductImages(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  selectedProductImages = files;

  const previewEl = document.getElementById("productImagePreview");
  if (!previewEl || !window.Alpine) return;

  const alpineData = Alpine.$data(previewEl);
  alpineData.images = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      alpineData.images.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadProductImage(event) {
  const file = event.target.files[0];
  if (!file || !window.selectedProduct) return;

  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://perfume-store-production.up.railway.app/api/admin/products/${window.selectedProduct._id}/image`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "Image upload failed");
    return;
  }

  // update preview immediately
  window.selectedProduct.images = data.images;
}

async function loadPrimaryTags() {
          try {
            const res = await fetch("/api/products/admin/primary-tags", {
              credentials: "include"
            });
            const data = await res.json();
        
            if (!data.success) return;
        
            const list = document.getElementById("primaryTagSuggestions");
            list.innerHTML = "";
        
            data.tags.forEach(tag => {
              const option = document.createElement("option");
              option.value = tag;
              list.appendChild(option);
            });
          } catch (e) {
            console.error("Failed to load tag suggestions");
          }
        }
        
        document.addEventListener("DOMContentLoaded", loadPrimaryTags);

async function hardDeleteProduct(productId) {
  if (!productId) {
    alert("Invalid product");
    return;
  }

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `https://perfume-store-production.up.railway.app/api/admin/products/${productId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache"
        },
        cache: "no-store"
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Failed to delete product");
      return;
    }

    alert("Product deleted successfully");

    // Close modal
    Alpine.store("productUI").closeAll();

const adminComp = document.querySelector('[x-data="adminProducts()"]');
if (adminComp && adminComp.__x) {
  adminComp.__x.$data.products =
    adminComp.__x.$data.products.filter(p => p._id !== productId);
}

  } catch (err) {
    console.error("DELETE ERROR:", err);
    alert("Delete request failed");
  }
}

async function uploadProductImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const product = Alpine.store("productUI").selected;
  if (!product) return;

  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://perfume-store-production.up.railway.app/api/admin/products/${product._id}/image`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Image upload failed");
    return;
  }

  // ✅ update preview immediately
  Alpine.store("productUI").selected.images = data.images;
}

function adminLogout() {
    // Clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    // Always redirect to site root index
    window.location.replace("/index.html");
  }

function globalModal() {
  return {
    open: false,
    title: "",
    message: "",
    type: "info",

    show({ title, message, type = "info" }) {
      this.title = title;
      this.message = message;
      this.type = type;
      this.open = true;
    },

    close() {
      this.open = false;
    }
  };
}

(function () {
  const root = document.documentElement;

  // restore theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // global toggle
  window.toggleTheme = function () {
    const isDark = root.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };
})();


function closeAddProductModal() {
  if (window.Alpine) {
    const bodyEl = document.body;
    if (bodyEl && bodyEl.__x) {
      window.Alpine.$data(bodyEl).addProductOpen = false;
    }
  }

  // Clear main inputs
  const inputsToClear = [
    "product-name",
    "description",
    "inventory-qty",
    "price-tier-1",
    "top-notes",
    "heart-notes",
    "base-notes"
  ];
  inputsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const fileInput = document.getElementById("file-upload");
  if (fileInput) fileInput.value = "";
  
  if (typeof selectedProductImages !== 'undefined') {
    selectedProductImages = [];
  }
  
  const previewEl = document.getElementById("productImagePreview");
  if (previewEl && window.Alpine && previewEl.__x) {
    const alpineData = window.Alpine.$data(previewEl);
    if (alpineData) alpineData.images = [];
  }

  // Deselect attributes
  const attrsToClear = ["long-lasting", "alcohol-free", "pure-attar"];
  attrsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
}
