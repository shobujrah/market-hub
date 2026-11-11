import { computed, createApp, reactive } from 'vue';
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

const adminSectionLabels = {
    overview: 'Overview',
    shops: 'Shops',
    owners: 'Shop owners',
    products: 'Products',
};

const ownerSectionLabels = {
    catalog: 'Catalog products',
    listings: 'Your shop listings',
};

const storedToken = localStorage.getItem('ecommerce_token');
if (storedToken) {
    api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

const state = reactive({
    user: null,
    isInitializing: Boolean(storedToken),
    authMode: 'login',
    stats: null,
    shops: [],
    products: [],
    recentCustomers: [],
    shopOwners: [],
    catalog: [],
    customerProducts: [],
    ownerShops: [],
    catalogSearch: '',
    sidebarOpen: false,
    adminSection: 'overview',
    ownerSection: 'catalog',
    editingProductId: null,
    authForm: {
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    },
    ownerForm: {
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    },
    shopForm: {
        name: '',
        owner_id: '',
        description: '',
    },
    productForm: {
        name: '',
        description: '',
        thumbnail: '',
        price: '',
    },
    ownerProductForm: {
        name: '',
        description: '',
        thumbnail: '',
        price: '',
        shop_id: '',
    },
    listingForm: {
        shop_id: '',
        price: '',
    },
    loading: false,
    message: '',
    error: '',
});

const filteredCustomerProducts = computed(() => {
    const query = state.catalogSearch.trim().toLowerCase();

    if (!query) {
        return state.customerProducts;
    }

    return state.customerProducts.filter((product) => [
        product.product_name,
        product.shop_name,
        product.description,
    ].some((value) => value?.toLowerCase().includes(query)));
});

const recentShops = computed(() => state.shops.slice(0, 10));
const recentProducts = computed(() => state.products.slice(0, 10));
const adminSectionTitle = computed(() => adminSectionLabels[state.adminSection]);
const ownerSectionTitle = computed(() => ownerSectionLabels[state.ownerSection]);

function syncAdminSection() {
    const section = window.location.hash.slice(1);

    if (Object.hasOwn(adminSectionLabels, section)) {
        state.adminSection = section;
    }
}

function navigateAdminSection(section) {
    state.adminSection = section;
    state.sidebarOpen = false;

    if (window.location.hash !== `#${section}`) {
        window.location.hash = section;
    }
}

function syncOwnerSection() {
    const section = window.location.hash.slice(1);

    if (Object.hasOwn(ownerSectionLabels, section)) {
        state.ownerSection = section;
    }
}

function navigateOwnerSection(section) {
    state.ownerSection = section;
    state.sidebarOpen = false;

    if (window.location.hash !== `#${section}`) {
        window.location.hash = section;
    }
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem('ecommerce_token', token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        return;
    }

    localStorage.removeItem('ecommerce_token');
    delete api.defaults.headers.common.Authorization;
}

function errorMessage(error, fallback) {
    const validationErrors = error.response?.data?.errors;
    const firstValidationError = validationErrors ? Object.values(validationErrors).flat()[0] : null;

    return firstValidationError || error.response?.data?.message || fallback;
}

function resetForm(form, fields) {
    for (const field of fields) {
        form[field] = '';
    }
}

async function loadCustomerProducts() {
    const response = await api.get('/customer/products');
    state.customerProducts = response.data;
}

async function fetchCurrentUser() {
    if (!storedToken) {
        try {
            await loadCustomerProducts();
        } catch (error) {
            state.error = errorMessage(error, 'Unable to load the shop catalog.');
        }

        return;
    }

    try {
        const response = await api.get('/user');
        state.user = response.data;
        await loadRoleData();
    } catch (error) {
        if (error.response?.status === 401) {
            setAuthToken(null);
            state.user = null;
            try {
                await loadCustomerProducts();
            } catch (catalogError) {
                state.error = errorMessage(catalogError, 'Unable to load the shop catalog.');
            }
        } else {
            state.error = errorMessage(error, 'Unable to load your account.');
        }
    } finally {
        state.isInitializing = false;
    }
}

async function loadRoleData() {
    if (!state.user) {
        return;
    }

    state.loading = true;
    state.error = '';

    try {
        if (state.user.role === 'admin') {
            const [dashboard, owners] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/shop-owners'),
            ]);
            state.stats = dashboard.data.stats;
            state.shops = dashboard.data.shops;
            state.products = dashboard.data.products;
            state.recentCustomers = dashboard.data.recent.customers;
            state.shopOwners = owners.data;
        } else if (state.user.role === 'shop_owner') {
            const response = await api.get('/owner/dashboard');
            state.ownerShops = response.data.shops;
            state.catalog = response.data.catalog;
            if (!state.listingForm.shop_id && state.ownerShops.length) {
                state.listingForm.shop_id = state.ownerShops[0].id;
            }
        } else {
            try {
                await loadCustomerProducts();
            } catch (error) {
                state.error = errorMessage(error, 'Unable to load the shop catalog.');
            }
        }
    } catch (error) {
        state.error = errorMessage(error, 'Unable to load dashboard data.');
    } finally {
        state.loading = false;
    }
}

async function login() {
    state.loading = true;
    state.error = '';
    state.message = '';

    try {
        const response = await api.post('/login', {
            email: state.authForm.email,
            password: state.authForm.password,
        });
        setAuthToken(response.data.token);
        state.user = response.data.user;
        resetForm(state.authForm, ['email', 'password', 'password_confirmation']);
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Login failed.');
    } finally {
        state.loading = false;
    }
}

async function register() {
    state.loading = true;
    state.error = '';
    state.message = '';

    try {
        const response = await api.post('/register', {
            name: state.authForm.name,
            email: state.authForm.email,
            password: state.authForm.password,
            password_confirmation: state.authForm.password_confirmation,
        });
        setAuthToken(response.data.token);
        state.user = response.data.user;
        resetForm(state.authForm, ['name', 'email', 'password', 'password_confirmation']);
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Registration failed.');
    } finally {
        state.loading = false;
    }
}

async function logout() {
    try {
        await api.post('/logout');
    } catch (error) {
        state.error = errorMessage(error, 'Could not revoke the current session.');
    }

    state.user = null;
    state.stats = null;
    state.shops = [];
    state.products = [];
    state.shopOwners = [];
    state.catalog = [];
    state.ownerShops = [];
    setAuthToken(null);
    try {
        await loadCustomerProducts();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to load the shop catalog.');
    }
}

async function createShopOwner() {
    state.error = '';
    state.message = '';

    try {
        const response = await api.post('/admin/shop-owners', {
            name: state.ownerForm.name,
            email: state.ownerForm.email,
            password: state.ownerForm.password,
            password_confirmation: state.ownerForm.password_confirmation,
        });

        state.shopOwners.unshift(response.data);
        resetForm(state.ownerForm, ['name', 'email', 'password', 'password_confirmation']);
        state.message = 'Shop owner account created.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to create the shop owner account.');
    }
}

async function updateShopOwner(owner) {
    state.error = '';
    state.message = '';

    try {
        await api.put(`/admin/shop-owners/${owner.id}`, {
            name: owner.name,
            email: owner.email,
        });
        state.message = 'Shop owner account updated.';
    } catch (error) {
        const message = errorMessage(error, 'Unable to update the shop owner account.');
        await loadRoleData();
        state.error = message;
    }
}

async function createShop() {
    state.error = '';
    state.message = '';

    try {
        await api.post('/admin/shops', {
            name: state.shopForm.name,
            owner_id: state.shopForm.owner_id,
            description: state.shopForm.description,
        });
        resetForm(state.shopForm, ['name', 'owner_id', 'description']);
        state.message = 'Shop created.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to create the shop.');
    }
}

async function updateShop(shop) {
    state.error = '';
    state.message = '';

    try {
        await api.put(`/admin/shops/${shop.id}`, {
            name: shop.name,
            owner_id: shop.owner_id,
            description: shop.description,
        });
        state.message = 'Shop updated.';
        await loadRoleData();
    } catch (error) {
        const message = errorMessage(error, 'Unable to update the shop.');
        await loadRoleData();
        state.error = message;
    }
}

async function deleteShop(shop) {
    if (!window.confirm(`Delete "${shop.name}" and remove its shop listings?`)) {
        return;
    }

    try {
        await api.delete(`/admin/shops/${shop.id}`);
        state.message = 'Shop deleted.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to delete the shop.');
    }
}

function editProduct(product) {
    state.editingProductId = product.id;
    state.productForm.name = product.name;
    state.productForm.description = product.description || '';
    state.productForm.thumbnail = product.thumbnail || '';
    state.productForm.price = product.price;
}

function cancelProductEdit() {
    state.editingProductId = null;
    resetForm(state.productForm, ['name', 'description', 'thumbnail', 'price']);
}

async function saveAdminProduct() {
    state.error = '';
    state.message = '';
    const payload = {
        name: state.productForm.name,
        description: state.productForm.description || null,
        thumbnail: state.productForm.thumbnail || null,
        price: Number(state.productForm.price || 0),
    };

    try {
        if (state.editingProductId) {
            await api.put(`/admin/products/${state.editingProductId}`, payload);
            state.message = 'Catalog product updated.';
        } else {
            await api.post('/admin/products', payload);
            state.message = 'Catalog product created.';
        }

        cancelProductEdit();
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to save the catalog product.');
    }
}

async function deleteAdminProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from the shared catalog and all shops?`)) {
        return;
    }

    try {
        await api.delete(`/admin/products/${product.id}`);
        state.message = 'Catalog product deleted.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to delete the catalog product.');
    }
}

async function createProduct() {
    state.error = '';
    state.message = '';

    try {
        await api.post('/owner/products', {
            name: state.ownerProductForm.name,
            description: state.ownerProductForm.description || null,
            thumbnail: state.ownerProductForm.thumbnail || null,
            price: Number(state.ownerProductForm.price || 0),
            shop_id: state.ownerProductForm.shop_id || null,
        });
        resetForm(state.ownerProductForm, ['name', 'description', 'thumbnail', 'price', 'shop_id']);
        state.message = 'Product added to the shared catalog.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to create the product.');
    }
}

async function assignProduct(product) {
    const shopId = state.listingForm.shop_id;

    if (!shopId) {
        state.error = 'Create or select a shop before adding products.';
        return;
    }

    state.error = '';
    state.message = '';

    try {
        const payload = { product_id: product.id };
        if (state.listingForm.price !== '') {
            payload.price = Number(state.listingForm.price);
        }

        await api.post(`/owner/shops/${shopId}/products`, payload);
        state.message = 'Product added to the selected shop.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to add the product to this shop.');
    }
}

async function updateShopProduct(shop, product) {
    state.error = '';
    state.message = '';

    try {
        await api.put(`/owner/shops/${shop.id}/products/${product.id}`, {
            price: Number(product.pivot.price),
            description: product.pivot.description || null,
            thumbnail: product.pivot.thumbnail || null,
        });
        state.message = `${product.name} updated for ${shop.name}.`;
        await loadRoleData();
    } catch (error) {
        const message = errorMessage(error, 'Unable to update the shop listing.');
        await loadRoleData();
        state.error = message;
    }
}

async function removeShopProduct(shop, product) {
    if (!window.confirm(`Remove "${product.name}" from ${shop.name}?`)) {
        return;
    }

    try {
        await api.delete(`/owner/shops/${shop.id}/products/${product.id}`);
        state.message = 'Product removed from the shop.';
        await loadRoleData();
    } catch (error) {
        state.error = errorMessage(error, 'Unable to remove the shop listing.');
    }
}

function submitAuth() {
    return state.authMode === 'login' ? login() : register();
}

createApp({
    setup() {
        return {
            state,
            filteredCustomerProducts,
            recentShops,
            recentProducts,
            adminSectionTitle,
            ownerSectionTitle,
            navigateAdminSection,
            navigateOwnerSection,
            submitAuth,
            logout,
            createShopOwner,
            updateShopOwner,
            createShop,
            updateShop,
            deleteShop,
            editProduct,
            cancelProductEdit,
            saveAdminProduct,
            deleteAdminProduct,
            createProduct,
            assignProduct,
            updateShopProduct,
            removeShopProduct,
        };
    },
    mounted() {
        syncAdminSection();
        syncOwnerSection();
        window.addEventListener('hashchange', syncAdminSection);
        window.addEventListener('hashchange', syncOwnerSection);
        window.addEventListener('popstate', syncAdminSection);
        window.addEventListener('popstate', syncOwnerSection);
        fetchCurrentUser();
    },
    beforeUnmount() {
        window.removeEventListener('hashchange', syncAdminSection);
        window.removeEventListener('hashchange', syncOwnerSection);
        window.removeEventListener('popstate', syncAdminSection);
        window.removeEventListener('popstate', syncOwnerSection);
    },
    template: `
        <div v-if="state.isInitializing" class="shell">
            <div class="loading-note" role="status">Restoring your workspace…</div>
        </div>
        <div v-else class="shell">
            <header v-if="!state.user || (state.user.role !== 'admin' && state.user.role !== 'shop_owner')" class="topbar">
                <div>
            <a class="brand" href="/" aria-label="Market Hub home">
                <span class="brand-mark" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none">
                        <path d="M5 10.5 16 5l11 5.5v12L16 28 5 22.5v-12Z" stroke="currentColor" stroke-width="2"/>
                        <path d="m5.5 10.5 10.5 5.2m0 0 10.5-5.2M16 15.7V27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </span>
                <span class="brand-copy"><strong>market<span>hub</span></strong><small>Independent shops. One place.</small></span>
            </a>
                </div>
        <div v-if="state.user" class="topbar-actions">
            <span class="account-name">{{ state.user.name }} <span class="role-badge">{{ state.user.role.replace('_', ' ') }}</span></span>
            <button class="button-secondary" @click="logout">Sign out</button>
        </div>
        <div v-else class="topbar-actions">
            <a class="header-link" href="#shop-products">Explore shops</a>
            <span class="header-divider"></span>
            <span class="header-note">Thoughtfully picked, locally listed.</span>
        </div>
    </header>

            <div v-if="state.error" class="alert error" role="alert">{{ state.error }}</div>
            <div v-if="state.message" class="alert success" role="status">{{ state.message }}</div>
            <div v-if="state.loading" class="loading-note">Loading your workspace…</div>

            <main v-if="!state.user" class="content">
                <section class="hero">
                    <div class="hero-copy">
                        <p class="eyebrow"><span class="eyebrow-dot"></span> A MARKETPLACE OF INDEPENDENT SHOPS</p>
                        <h1>Good finds.<br><span>Great little shops.</span></h1>
                        <p>Discover thoughtfully listed products from independent shops. Browse their collections and find your next favourite.</p>
                        <a class="hero-cta" href="#shop-products">Explore the collection <span aria-hidden="true">→</span></a>
                        <div class="hero-social-proof">
                            <div class="avatar-stack" aria-hidden="true"><span>M</span><span>S</span><span>A</span><span>+</span></div>
                            <p><strong>A growing community</strong><br><span>of independent shop owners</span></p>
                        </div>
                    </div>
                    <div class="hero-art" aria-hidden="true">
                        <div class="hero-art-sun"></div>
                        <div class="hero-art-caption"><span class="hero-art-caption-dot"></span> THE GOOD FINDS EDIT</div>
                        <div class="hero-art-main">
                            <div class="art-product art-product-one">
                                <span class="art-product-orbit"></span>
                                <svg viewBox="0 0 120 120" fill="none"><path d="M34 43h52l-5 55H39l-5-55Z" fill="#D9B18C"/><path d="M45 43c0-10 6-17 15-17s15 7 15 17" stroke="#805D45" stroke-width="5"/><path d="m49 57 11 8 11-8" stroke="#F9EEDF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 76h16" stroke="#F9EEDF" stroke-width="3" stroke-linecap="round"/></svg>
                                <span class="art-product-tag">Everyday carry</span>
                            </div>
                            <div class="art-product art-product-two">
                                <svg viewBox="0 0 120 120" fill="none"><path d="M28 66c4-26 16-39 32-39s28 13 32 39l-5 31H33l-5-31Z" fill="#6F8269"/><path d="M36 58c7 5 15 8 24 8s17-3 24-8" stroke="#DDE5CF" stroke-width="3" stroke-linecap="round"/><path d="M41 79h38" stroke="#DDE5CF" stroke-width="3" stroke-linecap="round"/><path d="M49 89h22" stroke="#DDE5CF" stroke-width="3" stroke-linecap="round"/></svg>
                            </div>
                            <div class="art-product art-product-three">
                                <svg viewBox="0 0 120 120" fill="none"><path d="M46 26h28v13H46zM41 39h38c5 0 8 4 8 9v47H33V48c0-5 3-9 8-9Z" fill="#F0C86A"/><path d="M46 26h28" stroke="#765D31" stroke-width="3" stroke-linecap="round"/><path d="M46 62c9 5 19 5 28 0" stroke="#FFF8E9" stroke-width="4" stroke-linecap="round"/><path d="M47 78h26" stroke="#FFF8E9" stroke-width="4" stroke-linecap="round"/></svg>
                            </div>
                            <div class="hero-art-sticker"><span>small shops</span><strong>BIG<br>HEART</strong><span>good things inside</span></div>
                        </div>
                        <div class="hero-art-footer"><span>01 — 03</span><span>CURATED BY REAL PEOPLE</span></div>
                    </div>
                    <div class="auth-card">
                        <div class="auth-heading">
                            <span class="auth-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                            </span>
                            <div><h2>{{ state.authMode === 'login' ? 'Welcome back' : 'Join the community' }}</h2><p>{{ state.authMode === 'login' ? 'Sign in to your Market Hub account.' : 'Create an account to get started.' }}</p></div>
                        </div>
                        <div class="tab-row">
                            <button :class="{ active: state.authMode === 'login' }" @click="state.authMode = 'login'">Sign in</button>
                            <button :class="{ active: state.authMode === 'register' }" @click="state.authMode = 'register'">Create account</button>
                        </div>
                        <form @submit.prevent="submitAuth" class="stack form-grid">
                            <label v-if="state.authMode === 'register'">
                                <span>Your name<span class="required-mark" aria-hidden="true">*</span></span>
                                <input v-model="state.authForm.name" autocomplete="name" required />
                            </label>
                            <label>
                                <span>Email address<span v-if="state.authMode === 'register'" class="required-mark" aria-hidden="true">*</span></span>
                                <input v-model="state.authForm.email" type="email" autocomplete="email" required />
                            </label>
                            <label>
                                <span>Password<span v-if="state.authMode === 'register'" class="required-mark" aria-hidden="true">*</span></span>
                                <input v-model="state.authForm.password" type="password" :autocomplete="state.authMode === 'login' ? 'current-password' : 'new-password'" required />
                            </label>
                            <label v-if="state.authMode === 'register'">
                                <span>Confirm password<span class="required-mark" aria-hidden="true">*</span></span>
                                <input v-model="state.authForm.password_confirmation" type="password" autocomplete="new-password" required />
                            </label>
                            <button class="primary-button" type="submit" :disabled="state.loading">
                                {{ state.loading ? 'Please wait…' : (state.authMode === 'login' ? 'Sign in to your account' : 'Create your account') }}
                            </button>
                        </form>
                        <p class="auth-footnote"><span aria-hidden="true">✦</span> Shop owner accounts are created by an administrator.</p>
                    </div>
                </section>

                <section class="value-strip" aria-label="Marketplace benefits">
                    <article><span class="value-icon">✳</span><div><strong>Independent by nature</strong><span>Discover shops with their own point of view.</span></div></article>
                    <article><span class="value-icon">◇</span><div><strong>Every shop is unique</strong><span>Each seller sets their own listing details.</span></div></article>
                    <article><span class="value-icon">♡</span><div><strong>Made for discovery</strong><span>One shared catalog, many little worlds.</span></div></article>
                </section>

                <section id="shop-products" class="panel catalog-panel">
                    <div class="section-heading">
                        <div>
                            <p class="eyebrow">THE COMMUNITY COLLECTION</p>
                            <h2>Find your next favourite<span class="heading-period">.</span></h2>
                            <p class="section-subtitle">A little something from the shops worth knowing.</p>
                        </div>
                        <div class="catalog-tools">
                            <label class="catalog-search">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                                <input v-model="state.catalogSearch" type="search" placeholder="Search finds or shops…" aria-label="Search products or shops" />
                            </label>
                            <span class="listing-count"><strong>{{ filteredCustomerProducts.length }}</strong> {{ filteredCustomerProducts.length === 1 ? 'find' : 'finds' }}</span>
                        </div>
                    </div>
                    <div v-if="filteredCustomerProducts.length" class="grid-products">
                        <article v-for="(item, index) in filteredCustomerProducts" :key="item.shop_id + '-' + item.id" class="product-card" :style="{ '--card-index': index }">
                            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.product_name" />
                            <div v-else class="product-placeholder"><span class="placeholder-sparkle">✳</span><span class="placeholder-wordmark">a good find<br><small>from {{ item.shop_name }}</small></span></div>
                            <div class="product-info">
                                <span class="product-shop-label"><span></span>{{ item.shop_name }}</span>
                                <strong>{{ item.product_name }}</strong>
                                <p>{{ item.description || 'Thoughtfully selected by this independent shop.' }}</p>
                                <div class="product-card-footer"><b>$ {{ Number(item.price).toFixed(2) }}</b><span>VIEW FIND <span aria-hidden="true">↗</span></span></div>
                            </div>
                        </article>
                    </div>
                    <div v-else-if="state.customerProducts.length" class="empty-state catalog-empty">
                        <span class="empty-sparkle">⌕</span>
                        <strong>No finds match that search.</strong>
                        <span>Try a different product or shop name.</span>
                        <button class="button-secondary" @click="state.catalogSearch = ''">Clear search</button>
                    </div>
                    <div v-else class="empty-state catalog-empty">
                        <span class="empty-sparkle">✳</span>
                        <strong>The shelves are getting ready.</strong>
                        <span>Independent shops are adding their first finds. Come back soon.</span>
                    </div>
                </section>
            </main>

            <main v-else-if="state.user.role === 'admin'" class="admin-layout">
                <button v-if="state.sidebarOpen" class="sidebar-scrim" aria-label="Close navigation" @click="state.sidebarOpen = false"></button>
                <aside class="admin-sidebar" :class="{ 'is-open': state.sidebarOpen }">
                    <a class="admin-brand" href="#overview" @click.prevent="navigateAdminSection('overview')">
                        <span class="admin-brand-mark" aria-hidden="true">
                            <svg viewBox="0 0 32 32" fill="none"><path d="M5 10.5 16 5l11 5.5v12L16 28 5 22.5v-12Z" stroke="currentColor" stroke-width="2"/><path d="m5.5 10.5 10.5 5.2m0 0 10.5-5.2M16 15.7V27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </span>
                        <span><strong>market<span>hub</span></strong><small>ADMIN CONSOLE</small></span>
                    </a>
                    <div class="sidebar-label">WORKSPACE</div>
                    <nav class="admin-nav" aria-label="Admin dashboard navigation">
                        <a class="admin-nav-link" :class="{ active: state.adminSection === 'overview' }" href="#overview" @click.prevent="navigateAdminSection('overview')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>
                            <span>Overview</span>
                        </a>
                        <a class="admin-nav-link" :class="{ active: state.adminSection === 'shops' }" href="#shops" @click.prevent="navigateAdminSection('shops')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>Shops</span><span class="nav-count">{{ state.shops.length }}</span>
                        </a>
                        <a class="admin-nav-link" :class="{ active: state.adminSection === 'owners' }" href="#owners" @click.prevent="navigateAdminSection('owners')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11.5 9v-1.6a3.4 3.4 0 0 0-2.6-3.3m-2.1-9.9a3.5 3.5 0 0 1 0 6.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                            <span>Shop owners</span><span class="nav-count">{{ state.shopOwners.length }}</span>
                        </a>
                        <a class="admin-nav-link" :class="{ active: state.adminSection === 'products' }" href="#products" @click.prevent="navigateAdminSection('products')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                            <span>Products</span><span class="nav-count">{{ state.products.length }}</span>
                        </a>
                    </nav>
                    <div class="sidebar-spacer"></div>
                    <div class="sidebar-help">
                        <span class="sidebar-help-icon">✳</span>
                        <strong>Your marketplace,<br>all in one place.</strong>
                        <span>Manage shops and the shared catalog from your admin workspace.</span>
                    </div>
                    <button class="sidebar-back-link" type="button" @click="logout">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 17 5-5-5-5M15 12H3m9-8h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Sign out
                    </button>
                </aside>

                <div class="admin-main">
                    <header class="admin-topbar">
                        <div class="admin-topbar-start">
                            <button class="sidebar-toggle" aria-label="Open dashboard navigation" @click="state.sidebarOpen = !state.sidebarOpen">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                            </button>
                            <span class="breadcrumb">Workspace <span>/</span> <strong>{{ adminSectionTitle }}</strong></span>
                        </div>
                        <div class="admin-topbar-end">
                            <span class="admin-date"><span class="status-dot"></span> System operational</span>
                            <span class="admin-topbar-divider"></span>
                            <span class="admin-avatar">{{ state.user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() }}</span>
                            <span class="admin-account"><strong>{{ state.user.name }}</strong><small>Administrator</small></span>
                        </div>
                    </header>

                    <section v-if="state.adminSection === 'overview'" class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> ADMIN OVERVIEW</p>
                                <h1>Good to see you, {{ state.user.name.split(' ')[0] }}<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Here’s what’s happening across your marketplace today.</p>
                            </div>
                            <a class="admin-primary-action" href="#products" @click.prevent="navigateAdminSection('products')">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                                Add catalog product
                            </a>
                        </div>
                        <div v-if="state.stats" class="stats-grid">
                            <a class="admin-stat-card" href="#shops" @click.prevent="navigateAdminSection('shops')"><span class="stat-icon stat-icon-shops"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="stat-label">Total shops</span><strong>{{ state.stats.shops }}</strong><span class="stat-footnote">Marketplace storefronts <span>↗</span></span></a>
                            <a class="admin-stat-card" href="#products" @click.prevent="navigateAdminSection('products')"><span class="stat-icon stat-icon-products"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span><span class="stat-label">Catalog products</span><strong>{{ state.stats.products }}</strong><span class="stat-footnote">Available to list <span>↗</span></span></a>
                            <a class="admin-stat-card" href="#owners" @click.prevent="navigateAdminSection('owners')"><span class="stat-icon stat-icon-owners"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11.5 9v-1.6a3.4 3.4 0 0 0-2.6-3.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><span class="stat-label">Shop owners</span><strong>{{ state.stats.shop_owners }}</strong><span class="stat-footnote">Seller accounts <span>↗</span></span></a>
                            <div class="admin-stat-card"><span class="stat-icon stat-icon-customers"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0m14-13a3.5 3.5 0 0 1 0 6.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><span class="stat-label">Customers</span><strong>{{ state.stats.customers }}</strong><span class="stat-footnote">Registered accounts</span></div>
                        </div>
                        <div class="admin-recent-grid">
                            <section class="card admin-recent-card">
                                <div class="admin-recent-heading">
                                    <div><h2>Recent shops</h2><p>Latest storefronts added</p></div>
                                    <a href="#shops" @click.prevent="navigateAdminSection('shops')">View all <span aria-hidden="true">↗</span></a>
                                </div>
                                <div v-if="recentShops.length" class="admin-recent-list">
                                    <article v-for="shop in recentShops" :key="shop.id" class="admin-recent-row">
                                        <span class="admin-recent-icon stat-icon-shops" aria-hidden="true">S</span>
                                        <span class="admin-recent-copy"><strong>{{ shop.name }}</strong><small>{{ shop.owner?.name || 'Shop owner' }}</small></span>
                                    </article>
                                </div>
                                <div v-else class="admin-recent-empty">No shops have been created yet.</div>
                            </section>

                            <section class="card admin-recent-card">
                                <div class="admin-recent-heading">
                                    <div><h2>Recent customers</h2><p>Latest registered accounts</p></div>
                                    <span class="admin-recent-limit">Latest 10</span>
                                </div>
                                <div v-if="state.recentCustomers.length" class="admin-recent-list">
                                    <article v-for="customer in state.recentCustomers" :key="customer.id" class="admin-recent-row">
                                        <span class="admin-recent-icon stat-icon-customers" aria-hidden="true">{{ customer.name.slice(0, 1).toUpperCase() }}</span>
                                        <span class="admin-recent-copy"><strong>{{ customer.name }}</strong><small>{{ customer.email }}</small></span>
                                    </article>
                                </div>
                                <div v-else class="admin-recent-empty">No customers have registered yet.</div>
                            </section>

                            <section class="card admin-recent-card">
                                <div class="admin-recent-heading">
                                    <div><h2>Recent products</h2><p>Latest shared catalog additions</p></div>
                                    <a href="#products" @click.prevent="navigateAdminSection('products')">View all <span aria-hidden="true">↗</span></a>
                                </div>
                                <div v-if="recentProducts.length" class="admin-recent-list">
                                    <article v-for="product in recentProducts" :key="product.id" class="admin-recent-row">
                                        <span class="admin-recent-icon stat-icon-products" aria-hidden="true">P</span>
                                        <span class="admin-recent-copy"><strong>{{ product.name }}</strong><small>{{ product.user?.name || 'Catalog' }}</small></span>
                                        <strong class="admin-recent-price">$ {{ Number(product.price).toFixed(2) }}</strong>
                                    </article>
                                </div>
                                <div v-else class="admin-recent-empty">No products have been added to the catalog yet.</div>
                            </section>
                        </div>
                    </section>

                    <section v-else-if="state.adminSection === 'shops'" class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> SHOP MANAGEMENT</p>
                                <h1>Shops<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Create and manage marketplace storefronts.</p>
                            </div>
                        </div>
                        <section class="card admin-form-card">
                            <div class="admin-card-heading"><span class="admin-card-icon admin-card-icon-gold"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><h2>Create a shop</h2><p>Set up a storefront for an owner.</p></div></div>
                            <form @submit.prevent="createShop" class="admin-create-form admin-shop-form">
                                <label><span class="admin-label-text">Shop name <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.shopForm.name" required /></label>
                                <label><span class="admin-label-text">Owner <span class="required-mark" aria-hidden="true">*</span></span>
                                    <select v-model="state.shopForm.owner_id" required>
                                        <option value="">Select owner</option>
                                        <option v-for="owner in state.shopOwners" :key="owner.id" :value="owner.id">{{ owner.name }}</option>
                                    </select>
                                </label>
                                <label class="admin-form-full-width">Description<textarea v-model="state.shopForm.description"></textarea></label>
                                <button class="primary-button admin-form-submit" type="submit">Create shop</button>
                            </form>
                        </section>
                        <section class="card admin-list-card">
                            <div class="section-heading"><h2>Shop list</h2><span class="muted">{{ state.shops.length }} shops</span></div>
                            <div v-if="state.shops.length" class="record-list">
                                <form v-for="shop in state.shops" :key="shop.id" @submit.prevent="updateShop(shop)" class="record-row shop-row">
                                    <label><span class="admin-label-text">Shop name <span class="required-mark" aria-hidden="true">*</span></span><input v-model="shop.name" required /></label>
                                    <label><span class="admin-label-text">Owner <span class="required-mark" aria-hidden="true">*</span></span>
                                        <select v-model="shop.owner_id" required>
                                            <option v-for="owner in state.shopOwners" :key="owner.id" :value="owner.id">{{ owner.name }}</option>
                                        </select>
                                    </label>
                                    <label>Description<input v-model="shop.description" /></label>
                                    <div class="row-actions">
                                        <button class="button-secondary" type="submit">Save</button>
                                        <button class="button-danger" type="button" @click="deleteShop(shop)">Delete</button>
                                    </div>
                                </form>
                            </div>
                            <div v-else class="empty-state">Create the first shop to get started.</div>
                        </section>
                    </section>

                    <section v-else-if="state.adminSection === 'owners'" class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> ACCOUNT MANAGEMENT</p>
                                <h1>Shop owners<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Create and manage seller accounts.</p>
                            </div>
                        </div>
                        <section class="card admin-form-card">
                            <div class="admin-card-heading"><span class="admin-card-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11.5 9v-1.6a3.4 3.4 0 0 0-2.6-3.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><div><h2>Create shop owner</h2><p>Add a seller account to your marketplace.</p></div></div>
                            <form @submit.prevent="createShopOwner" class="admin-create-form">
                                <label><span class="admin-label-text">Name <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerForm.name" required /></label>
                                <label><span class="admin-label-text">Email <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerForm.email" type="email" required /></label>
                                <label><span class="admin-label-text">Temporary password <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerForm.password" type="password" minlength="8" required /></label>
                                <label><span class="admin-label-text">Confirm password <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerForm.password_confirmation" type="password" minlength="8" required /></label>
                                <button class="primary-button admin-form-submit" type="submit">Create account</button>
                            </form>
                        </section>
                        <section class="card admin-list-card">
                            <div class="section-heading"><h2>Shop owner accounts</h2><span class="muted">{{ state.shopOwners.length }} accounts</span></div>
                            <div v-if="state.shopOwners.length" class="record-list">
                                <form v-for="owner in state.shopOwners" :key="owner.id" @submit.prevent="updateShopOwner(owner)" class="record-row">
                                    <label><span class="admin-label-text">Name <span class="required-mark" aria-hidden="true">*</span></span><input v-model="owner.name" required /></label>
                                    <label><span class="admin-label-text">Email <span class="required-mark" aria-hidden="true">*</span></span><input v-model="owner.email" type="email" required /></label>
                                    <button class="button-secondary" type="submit">Save account</button>
                                </form>
                            </div>
                            <div v-else class="empty-state">No shop owner accounts yet.</div>
                        </section>
                    </section>

                    <section v-else class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> CATALOG MANAGEMENT</p>
                                <h1>Products<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Manage products available in the shared catalog.</p>
                            </div>
                        </div>
                        <section class="card admin-form-card">
                            <div class="admin-card-heading"><span class="admin-card-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span><div><h2>{{ state.editingProductId ? 'Edit catalog product' : 'Add catalog product' }}</h2><p>Products here are shared for shop owners to list.</p></div></div>
                            <form @submit.prevent="saveAdminProduct" class="product-form">
                                <label><span class="admin-label-text">Product name <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.productForm.name" required /></label>
                                <label>Description<textarea v-model="state.productForm.description"></textarea></label>
                                <label>Thumbnail URL<input v-model="state.productForm.thumbnail" type="url" /></label>
                                <label><span class="admin-label-text">Base price <span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.productForm.price" type="number" min="0" step="0.01" required /></label>
                                <div class="row-actions admin-form-submit">
                                    <button class="primary-button" type="submit">{{ state.editingProductId ? 'Save changes' : 'Add product' }}</button>
                                    <button v-if="state.editingProductId" class="button-secondary" type="button" @click="cancelProductEdit">Cancel</button>
                                </div>
                            </form>
                        </section>
                        <section class="card">
                            <div class="section-heading"><h2>Shared product catalog</h2><span class="muted">{{ state.products.length }} products</span></div>
                            <div v-if="state.products.length" class="admin-product-list">
                                <article v-for="product in state.products" :key="product.id" class="admin-product-row">
                                    <img v-if="product.thumbnail" :src="product.thumbnail" :alt="product.name" />
                                    <div class="product-summary"><strong>{{ product.name }}</strong><span>{{ product.user?.name || 'Admin' }} · $ {{ Number(product.price).toFixed(2) }}</span></div>
                                    <div class="row-actions">
                                        <button class="button-secondary" type="button" @click="editProduct(product)">Edit</button>
                                        <button class="button-danger" type="button" @click="deleteAdminProduct(product)">Delete</button>
                                    </div>
                                </article>
                            </div>
                            <div v-else class="empty-state">No products in the shared catalog yet.</div>
                        </section>
                    </section>
                    <footer class="admin-footer"><span>© 2026 Market Hub · Administration</span><span>Built for independent shops, with care.</span></footer>
                </div>
            </main>

            <main v-else-if="state.user.role === 'shop_owner'" class="admin-layout owner-layout">
                <button v-if="state.sidebarOpen" class="sidebar-scrim" aria-label="Close navigation" @click="state.sidebarOpen = false"></button>
                <aside class="admin-sidebar" :class="{ 'is-open': state.sidebarOpen }">
                    <a class="admin-brand" href="#catalog" @click.prevent="navigateOwnerSection('catalog')">
                        <span class="admin-brand-mark" aria-hidden="true">
                            <svg viewBox="0 0 32 32" fill="none"><path d="M5 10.5 16 5l11 5.5v12L16 28 5 22.5v-12Z" stroke="currentColor" stroke-width="2"/><path d="m5.5 10.5 10.5 5.2m0 0 10.5-5.2M16 15.7V27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </span>
                        <span><strong>market<span>hub</span></strong><small>SHOP OWNER WORKSPACE</small></span>
                    </a>
                    <div class="sidebar-label">YOUR WORKSPACE</div>
                    <nav class="admin-nav" aria-label="Shop owner dashboard navigation">
                        <a class="admin-nav-link" :class="{ active: state.ownerSection === 'catalog' }" href="#catalog" @click.prevent="navigateOwnerSection('catalog')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                            <span>Catalog products</span><span class="nav-count">{{ state.catalog.length }}</span>
                        </a>
                        <a class="admin-nav-link" :class="{ active: state.ownerSection === 'listings' }" href="#listings" @click.prevent="navigateOwnerSection('listings')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>Your listings</span><span class="nav-count">{{ state.ownerShops.reduce((count, shop) => count + shop.products.length, 0) }}</span>
                        </a>
                    </nav>
                    <div class="sidebar-spacer"></div>
                    <div class="sidebar-help">
                        <span class="sidebar-help-icon">✳</span>
                        <strong>Your shop,<br>your point of view.</strong>
                        <span>Pick products from the shared catalog and make each listing your own.</span>
                    </div>
                    <button class="sidebar-back-link" type="button" @click="logout">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 17 5-5-5-5M15 12H3m9-8h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Sign out
                    </button>
                </aside>

                <div class="admin-main">
                    <header class="admin-topbar">
                        <div class="admin-topbar-start">
                            <button class="sidebar-toggle" aria-label="Open dashboard navigation" @click="state.sidebarOpen = !state.sidebarOpen">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                            </button>
                            <span class="breadcrumb">Workspace <span>/</span> <strong>{{ ownerSectionTitle }}</strong></span>
                        </div>
                        <div class="admin-topbar-end">
                            <span class="admin-date"><span class="status-dot"></span> Your shops, at a glance</span>
                            <span class="admin-topbar-divider"></span>
                            <span class="admin-avatar">{{ state.user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() }}</span>
                            <span class="admin-account"><strong>{{ state.user.name }}</strong><small>Shop owner</small></span>
                        </div>
                    </header>

                    <section v-if="state.ownerSection === 'catalog'" class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> PRODUCT CATALOG</p>
                                <h1>Catalog products<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Choose shared products and make them available in your shops.</p>
                            </div>
                        </div>
                        <section class="card">
                            <h2>Create a shared catalog product</h2>
                            <p class="muted">Your product will be available in the catalog for every shop owner to select.</p>
                            <form @submit.prevent="createProduct" class="product-form">
                                <label><span>Product name<span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerProductForm.name" required /></label>
                                <label>Description<textarea v-model="state.ownerProductForm.description"></textarea></label>
                                <label>Thumbnail URL<input v-model="state.ownerProductForm.thumbnail" type="url" /></label>
                                <label><span>Base price<span class="required-mark" aria-hidden="true">*</span></span><input v-model="state.ownerProductForm.price" type="number" min="0" step="0.01" required /></label>
                                <label>List in your shop now
                                    <select v-model="state.ownerProductForm.shop_id">
                                        <option value="">Add to catalog only</option>
                                        <option v-for="shop in state.ownerShops" :key="shop.id" :value="shop.id">{{ shop.name }}</option>
                                    </select>
                                </label>
                                <button class="primary-button" type="submit">Create product</button>
                            </form>
                        </section>

                        <section class="card">
                            <div class="section-heading"><div><h2>Shared catalog</h2><p class="muted">Choose any admin- or owner-created product to list.</p></div><span class="muted">{{ state.catalog.length }} products</span></div>
                            <div class="inline-toolbar">
                                <label>Destination shop
                                    <select v-model="state.listingForm.shop_id" :disabled="!state.ownerShops.length">
                                        <option value="">Select shop</option>
                                        <option v-for="shop in state.ownerShops" :key="shop.id" :value="shop.id">{{ shop.name }}</option>
                                    </select>
                                </label>
                                <label>Shop price (optional)<input v-model="state.listingForm.price" type="number" min="0" step="0.01" placeholder="Use catalog price" /></label>
                            </div>
                            <div v-if="state.catalog.length" class="record-list">
                                <article v-for="product in state.catalog" :key="product.id" class="record-row catalog-row">
                                    <div class="product-summary"><strong>{{ product.name }}</strong><span>{{ product.user?.name || 'Catalog' }} · Base $ {{ Number(product.price).toFixed(2) }}</span></div>
                                    <button class="primary-button" type="button" @click="assignProduct(product)">Add to shop</button>
                                </article>
                            </div>
                            <div v-else class="empty-state">The shared catalog is empty.</div>
                        </section>
                    </section>

                    <section v-else class="admin-dashboard">
                        <div class="admin-welcome">
                            <div>
                                <p class="eyebrow"><span class="eyebrow-dot"></span> SHOP MANAGEMENT</p>
                                <h1>Your shop listings<span class="heading-period">.</span></h1>
                                <p class="dashboard-intro">Adjust the price and details shown in each of your shops.</p>
                            </div>
                        </div>
                        <section class="card">
                            <div class="section-heading"><h2>Your shop listings</h2><span class="muted">{{ state.ownerShops.length }} shops</span></div>
                            <div v-if="state.ownerShops.length" class="shop-listings">
                                <section v-for="shop in state.ownerShops" :key="shop.id" class="shop-listing">
                                    <h3>{{ shop.name }}</h3>
                                    <div v-if="shop.products.length" class="record-list">
                                        <form v-for="product in shop.products" :key="product.id" @submit.prevent="updateShopProduct(shop, product)" class="listing-row">
                                            <div class="product-summary"><strong>{{ product.name }}</strong><span>Catalog base $ {{ Number(product.price).toFixed(2) }}</span></div>
                                            <label>Shop price<input v-model="product.pivot.price" type="number" min="0" step="0.01" required /></label>
                                            <label>Shop description<input v-model="product.pivot.description" /></label>
                                            <label>Thumbnail URL<input v-model="product.pivot.thumbnail" type="url" /></label>
                                            <div class="row-actions">
                                                <button class="button-secondary" type="submit">Save listing</button>
                                                <button class="button-danger" type="button" @click="removeShopProduct(shop, product)">Remove</button>
                                            </div>
                                        </form>
                                    </div>
                                    <div v-else class="empty-state">No products listed in this shop.</div>
                                </section>
                            </div>
                            <div v-else class="empty-state">Ask an administrator to assign a shop to your account.</div>
                        </section>
                    </section>
                    <footer class="admin-footer"><span>© 2026 Market Hub · Shop owner workspace</span><span>Good things happen when small shops grow.</span></footer>
                </div>
            </main>

                <main v-else class="content">
                    <section class="panel">
                    <p class="eyebrow">CUSTOMER CATALOG</p>
                    <h1>Products listed by our shops<span class="heading-period">.</span></h1>
                    <p class="dashboard-intro">Good finds from independent shops, with their own price and details.</p>
                    <div class="catalog-tools customer-catalog-tools">
                        <label class="catalog-search">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                            <input v-model="state.catalogSearch" type="search" placeholder="Search finds or shops…" aria-label="Search products or shops" />
                        </label>
                        <span class="listing-count"><strong>{{ filteredCustomerProducts.length }}</strong> {{ filteredCustomerProducts.length === 1 ? 'find' : 'finds' }}</span>
                    </div>
                    <div v-if="filteredCustomerProducts.length" class="grid-products">
                        <article v-for="(item, index) in filteredCustomerProducts" :key="item.shop_id + '-' + item.id" class="product-card" :style="{ '--card-index': index }">
                            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.product_name" />
                            <div v-else class="product-placeholder"><span class="placeholder-sparkle">✳</span><span class="placeholder-wordmark">a good find<br><small>from {{ item.shop_name }}</small></span></div>
                            <div class="product-info">
                                <span class="product-shop-label"><span></span>{{ item.shop_name }}</span>
                                <strong>{{ item.product_name }}</strong>
                                <p>{{ item.description || 'Thoughtfully selected by this independent shop.' }}</p>
                                <div class="product-card-footer"><b>$ {{ Number(item.price).toFixed(2) }}</b><span>VIEW FIND <span aria-hidden="true">↗</span></span></div>
                            </div>
                        </article>
                    </div>
                    <div v-else class="empty-state catalog-empty">
                        <span class="empty-sparkle">{{ state.customerProducts.length ? '⌕' : '✳' }}</span>
                        <strong>{{ state.customerProducts.length ? 'No finds match that search.' : 'The shelves are getting ready.' }}</strong>
                        <span>{{ state.customerProducts.length ? 'Try a different product or shop name.' : 'Independent shops are adding their first finds. Come back soon.' }}</span>
                        <button v-if="state.customerProducts.length" class="button-secondary" @click="state.catalogSearch = ''">Clear search</button>
                    </div>
                    </section>
            </main>
            <footer v-if="!state.user || state.user.role === 'customer'" class="site-footer">
                <a class="brand footer-brand" href="/" aria-label="Market Hub home">
                    <span class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 32 32" fill="none"><path d="M5 10.5 16 5l11 5.5v12L16 28 5 22.5v-12Z" stroke="currentColor" stroke-width="2"/><path d="m5.5 10.5 10.5 5.2m0 0 10.5-5.2M16 15.7V27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <span class="brand-copy"><strong>market<span>hub</span></strong><small>Independent shops. One place.</small></span>
                </a>
                <span>Good things happen when small shops grow.</span>
                <span>© 2026 Market Hub</span>
            </footer>
        </div>
    `,
}).mount('#app');
