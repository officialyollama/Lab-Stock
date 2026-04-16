// assets/js/app.js - Reverted UI with Node.js API logic
const app = {
    api: {
        dashboard: '/api/dashboard',
        chemicals: '/api/chemicals',
        suppliers: '/api/suppliers',
        staff: '/api/staff',
        inventory: '/api/inventory'
    },

    currentUser: null,
    selectedRole: 'Lab Staff',

    init() {
        this.setupNavigation();
        this.setupForms();
        
        // Initial state
        if(localStorage.getItem('lab_isLoggedIn')) {
            document.getElementById('login-screen').style.display = 'none';
            this.loadUserProfileContext().then(() => {
                this.navigateTo('dashboard-page');
                this.loadInitialDropdowns();
            });
        } else {
            // Show login screen
            document.getElementById('login-screen').style.display = 'flex';
        }
    },

    selectRole(role, el) {
        this.selectedRole = role;
        document.querySelectorAll('.role-card').forEach(rc => rc.classList.remove('selected'));
        el.classList.add('selected');
    },

    async doLogin() {
        const name = document.getElementById('login-name').value.trim();
        if(!name) {
            this.showToast('Please enter your name', true);
            return;
        }

        // Simulate login (as in original)
        localStorage.setItem('lab_isLoggedIn', 'true');
        localStorage.setItem('lab_userName', name);
        localStorage.setItem('lab_role', this.selectedRole);

        // Hide login and load app
        document.getElementById('login-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-screen').style.display = 'none';
            this.loadUserProfileContext().then(() => {
                this.navigateTo('dashboard-page');
                this.loadInitialDropdowns();
            });
        }, 300);
    },

    logout() {
        if(confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('lab_isLoggedIn');
            localStorage.removeItem('lab_userName');
            localStorage.removeItem('lab_role');
            window.location.reload(); 
        }
    },

    setupNavigation() {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.navigateTo(target);
            });
        });
    },

    navigateTo(pageId) {
        // UI Updates
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');

        document.querySelectorAll('.sidebar-link').forEach(link => {
            if(link.getAttribute('data-target') === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Content Loads
        switch(pageId) {
            case 'dashboard-page': this.loadDashboard(); break;
            case 'chemicals-page': this.loadChemicals(); break;
            case 'batches-page': this.loadBatches(); break;
            case 'stock-page': this.loadStock(); break;
            case 'suppliers-page': this.loadSuppliers(); break;
            case 'staff-page': this.loadStaff(); break;
            case 'profile-page': this.loadProfilePage(); break;
        }
    },


    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        const iconEl = document.getElementById('toast-icon');
        
        msgEl.textContent = message;
        iconEl.textContent = isError ? '❌' : '✨';
        toast.style.borderLeftColor = isError ? 'var(--pink-dark)' : 'var(--green)';
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        const form = modal.querySelector('form');
        if(form && !modal.dataset.editing) form.reset();
        modal.classList.add('show');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        modal.dataset.editing = ""; 
        
        // Clear hidden IDs
        const ids = ['chem_id', 'sup_id', 'staff_id'];
        ids.forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = '';
        });

        // Reset title if it was an edit
        if(modalId === 'chemical-modal') document.getElementById('chemical-modal-title').textContent = 'Add New Chemical';
        if(modalId === 'supplier-modal') document.getElementById('supplier-modal-title').textContent = 'Add New Supplier';
        if(modalId === 'staff-modal') document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
    },

    setupForms() {
        document.getElementById('chemical-form').addEventListener('submit', (e) => this.handleFormSubmit(e, this.api.chemicals, 'chemicals-page', 'chemical-modal'));
        document.getElementById('supplier-form').addEventListener('submit', (e) => this.handleFormSubmit(e, this.api.suppliers, 'suppliers-page', 'supplier-modal'));
        document.getElementById('staff-form').addEventListener('submit', (e) => this.handleFormSubmit(e, this.api.staff, 'staff-page', 'staff-modal'));
        
        document.getElementById('profile-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            data.Role = document.getElementById('prof_role').value;
            
            try {
                const response = await fetch(this.api.staff, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if(result.success) {
                    this.showToast('Profile Updated!');
                    await this.loadUserProfileContext();
                    this.loadProfilePage();
                } else {
                    this.showToast(result.error || 'Failed to update profile', true);
                }
            } catch (error) {
                this.showToast('Network error', true);
            }
        });

        document.getElementById('batch-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            data.Staff_ID = this.currentUser.Staff_ID;
            const res = await this.postData(`${this.api.inventory}?action=batch`, data);
            if(res.success) {
                this.showToast('Batch Received!');
                this.closeModal('batch-modal');
                this.loadBatches();
            } else {
                this.showToast(res.error || 'Failed to save batch', true);
            }
        });

        document.getElementById('transaction-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            data.Staff_ID = this.currentUser.Staff_ID;
            const res = await this.postData(`${this.api.inventory}?action=transaction`, data);
            if(res.success) {
                this.showToast('Transaction Logged');
                this.closeModal('transaction-modal');
                this.loadStock();
            } else {
                this.showToast(res.error || 'Transaction failed', true);
            }
        });
    },

    async handleFormSubmit(e, url, pageId, modalId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        const idKeys = ['Chemical_ID', 'Supplier_ID', 'Staff_ID'];
        let isUpdate = false;
        idKeys.forEach(k => { if(data[k]) isUpdate = true; });
        
        try {
            const response = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            
            if(result.success) {
                this.showToast('Data Saved Successfully');
                this.closeModal(modalId);
                this.navigateTo(pageId); 
                this.loadInitialDropdowns(); 
            } else {
                this.showToast(result.error || 'Error saving data', true);
            }
        } catch (error) {
            this.showToast('Network error', true);
        }
    },

    async fetchData(url) {
        try {
            const response = await fetch(url);
            if(!response.ok) throw new Error('Network response err');
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    async postData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            return { error: 'Network error' };
        }
    },

    async deleteRecord(url, idObj, pageId) {
        if(confirm('Are you sure you want to delete this record?')) {
            try {
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(idObj)
                });
                const result = await response.json();
                if(result.success) {
                    this.showToast('Record Deleted');
                    this.navigateTo(pageId);
                } else {
                    this.showToast(result.error || 'Delete failed', true);
                }
            } catch (error) {
                this.showToast('Network error', true);
            }
        }
    },

    async loadUserProfileContext() {
        // We can either fetch the real staff profile or use the local storage one
        // The server.js returns the "first" staff, which might not match the login name
        // Let's merge them: Use the server's staff ID but the login's name for display if available
        const user = await this.fetchData(`${this.api.staff}?action=profile`);
        
        const loginName = localStorage.getItem('lab_userName') || 'Admin User';
        const loginRole = localStorage.getItem('lab_role') || 'Lab Manager';

        if(user && !user.error) {
            this.currentUser = { ...user, Staff_Name: loginName, Role: loginRole };
        } else {
            this.currentUser = { Staff_Name: loginName, Role: loginRole, Staff_ID: 1 };
        }

        document.getElementById('nav-role-display').textContent = `${this.currentUser.Staff_Name} (${this.currentUser.Role})`;
        const badgeCont = document.getElementById('role-badge-container');
        const roleStr = this.currentUser.Role;
        const isStaff = roleStr.includes('Staff') || roleStr.includes('Tech') || roleStr.includes('Manager');
        badgeCont.innerHTML = `<div class="role-badge ${isStaff ? 'role-staff' : 'role-supplier'}">${isStaff ? '👩‍🔬' : '🏭'} ${roleStr}</div>`;
    },

    loadProfilePage() {
        if(this.currentUser) {
            document.getElementById('profile-page-name').textContent = this.currentUser.Staff_Name;
            document.getElementById('profile-page-role').textContent = this.currentUser.Role;
            document.getElementById('profile-page-email').textContent = this.currentUser.Email || 'Not provided';
            document.getElementById('profile-page-contact').textContent = this.currentUser.Contact_Number || 'Not provided';
            document.getElementById('profile-page-avatar').src = this.currentUser.Profile_Pic || `https://ui-avatars.com/api/?name=${this.currentUser.Staff_Name}&background=F4B8C8&color=1A1A1A`;
            
            document.getElementById('prof_id').value = this.currentUser.Staff_ID;
            document.getElementById('prof_name').value = this.currentUser.Staff_Name;
            document.getElementById('prof_email').value = this.currentUser.Email || '';
            document.getElementById('prof_contact').value = this.currentUser.Contact_Number || '';
            document.getElementById('prof_role').value = this.currentUser.Role;
            document.getElementById('prof_pic').value = (this.currentUser.Profile_Pic && this.currentUser.Profile_Pic.startsWith('http')) ? this.currentUser.Profile_Pic : '';
        }
    },

    async loadInitialDropdowns() {
        const suppliers = await this.fetchData(this.api.suppliers);
        const supplierSelect = document.getElementById('chem_supplier');
        supplierSelect.innerHTML = '<option value="">None</option>';
        suppliers.forEach(s => {
            supplierSelect.innerHTML += `<option value="${s.Supplier_ID}">${s.Supplier_Name}</option>`;
        });

        const chemicals = await this.fetchData(this.api.chemicals);
        document.querySelectorAll('.chemical-dropdown').forEach(select => {
            select.innerHTML = '<option value="">Select Reagent...</option>';
            chemicals.forEach(c => {
                select.innerHTML += `<option value="${c.Chemical_ID}">${c.Chemical_Name}</option>`;
            });
        });
    },

    async loadDashboard() {
        const stats = await this.fetchData(this.api.dashboard);
        if(stats && !stats.error) {
            document.getElementById('dash-total-chem').textContent = stats.total_chemicals || '0';
            document.getElementById('dash-low-stock').textContent = stats.low_stock || '0';
            document.getElementById('dash-expiring').textContent = stats.expiring_soon || '0';

            const tbody = document.querySelector('#dashboard-tx-table tbody');
            tbody.innerHTML = '';
            if(stats.recent_activity && stats.recent_activity.length) {
                stats.recent_activity.forEach(tx => {
                    const typeBadge = `<span class="badge ${tx.Transaction_Type === 'Purchase' ? 'badge-in' : (tx.Transaction_Type === 'Usage' ? 'badge-out' : 'badge-neutral')}">${tx.Transaction_Type}</span>`;
                    tbody.innerHTML += `
                        <tr>
                            <td>${new Date(tx.Transaction_Date).toLocaleDateString()}</td>
                            <td style="font-weight:600">${tx.Chemical_Name}</td>
                            <td>${typeBadge}</td>
                            <td>${tx.Quantity}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No recent activity</td></tr>';
            }

            // Hazard Chart
            const chemicals = await this.fetchData(this.api.chemicals);
            const hazardMap = { High: 0, Medium: 0, Low: 0 };
            chemicals.forEach(c => hazardMap[c.Hazard_Level]++);
            
            const hazardCont = document.getElementById('hazard-chart');
            hazardCont.innerHTML = '';
            const maxVal = Math.max(...Object.values(hazardMap), 1);
            ['High', 'Medium', 'Low'].forEach(h => {
                const count = hazardMap[h];
                const pct = (count / maxVal) * 100;
                const col = h === 'High' ? 'var(--pink-dark)' : (h === 'Medium' ? '#F9A825' : 'var(--green)');
                hazardCont.innerHTML += `
                    <div class="chart-bar-row">
                        <div class="chart-bar-label">${h}</div>
                        <div class="chart-bar-outer"><div class="chart-bar-inner" style="width:${pct}%; background:${col};">${count}</div></div>
                    </div>
                `;
            });
        }
    },

    async loadChemicals(searchQuery = '') {
        const url = searchQuery ? `${this.api.chemicals}?search=${encodeURIComponent(searchQuery)}` : this.api.chemicals;
        const chemicals = await this.fetchData(url);
        const tbody = document.querySelector('#chemicals-table tbody');
        tbody.innerHTML = '';
        
        chemicals.forEach(c => {
            const hBadge = `<span class="badge ${c.Hazard_Level === 'High' ? 'badge-high' : (c.Hazard_Level === 'Medium' ? 'badge-medium' : 'badge-low')}">${c.Hazard_Level}</span>`;
            const jsonStr = JSON.stringify(c).replace(/'/g, "&#39;");
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600">${c.Chemical_Name}</td>
                    <td>${c.Chemical_Type || 'N/A'}</td>
                    <td>${hBadge}</td>
                    <td>${c.Storage_Condition}</td>
                    <td>${c.Supplier_Name || 'None'}</td>
                    <td style="text-align:right">
                        <button class="btn btn-sm btn-black" onclick='app.editChemical(${jsonStr})'>Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteRecord('${this.api.chemicals}', {Chemical_ID: ${c.Chemical_ID}}, 'chemicals-page')">Delete</button>
                    </td>
                </tr>
            `;
        });
        this.loadChemicalAlerts();
    },

    async loadChemicalAlerts() {
        const container = document.getElementById('chemical-alerts-container');
        container.innerHTML = '';

        const expiring = await this.fetchData(`${this.api.chemicals}?action=expiring`);
        if(expiring.length) {
            const list = expiring.map(e => `• <b>${e.Chemical_Name}</b> (Batch: ${e.Batch_Number}) expires ${new Date(e.Expiry_Date).toLocaleDateString()}`).join('<br>');
            container.innerHTML += `<div class="card" style="border-left:5px solid var(--pink-dark); background:var(--pink-light); color:var(--black); padding:15px">
                <div style="font-weight:800; margin-bottom:5px;">⚠️ EXPIRING SOON</div>${list}</div>`;
        }

        const lowStock = await this.fetchData(`${this.api.chemicals}?action=low_stock`);
        if(lowStock.length) {
            const list = lowStock.map(s => `• <b>${s.Chemical_Name}</b>: ${s.Quantity_Available} left`).join('<br>');
            container.innerHTML += `<div class="card" style="border-left:5px solid #F9A825; background:#FFF9C4; color:var(--black); padding:15px">
                <div style="font-weight:800; margin-bottom:5px;">⚠️ LOW STOCK</div>${list}</div>`;
        }
    },

    editChemical(data) {
        document.getElementById('chemical-modal-title').textContent = 'Edit Chemical';
        document.getElementById('chem_id').value = data.Chemical_ID;
        document.getElementById('chem_name').value = data.Chemical_Name;
        document.getElementById('chem_type').value = data.Chemical_Type;
        document.getElementById('chem_unit').value = data.Unit;
        document.getElementById('chem_hazard').value = data.Hazard_Level;
        document.getElementById('chem_storage').value = data.Storage_Condition;
        document.getElementById('chem_supplier').value = data.Supplier_ID || '';
        this.openModal('chemical-modal');
        document.getElementById('chemical-modal').dataset.editing = "true";
    },

    async loadBatches() {
        const batches = await this.fetchData(`${this.api.inventory}?action=batches`);
        const tbody = document.querySelector('#batches-table tbody');
        tbody.innerHTML = '';
        batches.forEach(b => {
             tbody.innerHTML += `
                <tr>
                    <td style="font-weight:700">${b.Batch_Number}</td>
                    <td>${b.Chemical_Name}</td>
                    <td>${b.Manufacture_Date ? new Date(b.Manufacture_Date).toLocaleDateString() : 'N/A'}</td>
                    <td style="color:var(--pink-dark); font-weight:600">${new Date(b.Expiry_Date).toLocaleDateString()}</td>
                    <td>${b.Quantity_Received}</td>
                    <td>${b.Unit_Price ? '₹'+b.Unit_Price : '-'}</td>
                </tr>
            `;
        });
    },

    async loadStock() {
        const stock = await this.fetchData(`${this.api.inventory}?action=stock`);
        const sBody = document.querySelector('#stock-table tbody');
        sBody.innerHTML = '';
        stock.forEach(s => {
            const isLow = parseFloat(s.Quantity_Available) < parseFloat(s.Threshold);
            sBody.innerHTML += `
                <tr>
                    <td style="font-weight:600">${s.Chemical_Name}</td>
                    <td style="font-size:1.1rem; font-weight:700; color:${isLow ? 'var(--pink-dark)' : 'var(--green-dark)'}">${s.Quantity_Available}</td>
                    <td><span class="badge ${isLow ? 'badge-high' : 'badge-low'}">${isLow ? 'Low' : 'OK'}</span></td>
                </tr>
            `;
        });

        const txs = await this.fetchData(`${this.api.inventory}?action=transactions`);
        const tBody = document.querySelector('#all-tx-table tbody');
        tBody.innerHTML = '';
        txs.forEach(t => {
            const tBadge = `<span class="badge ${t.Transaction_Type === 'Purchase' ? 'badge-in' : (t.Transaction_Type === 'Usage' ? 'badge-out' : 'badge-neutral')}">${t.Transaction_Type}</span>`;
            tBody.innerHTML += `
                <tr>
                    <td>${new Date(t.Transaction_Date).toLocaleDateString()}</td>
                    <td style="font-weight:600">${t.Chemical_Name}</td>
                    <td>${tBadge}</td>
                    <td>${t.Quantity}</td>
                </tr>
            `;
        });
    },

    async loadSuppliers() {
        const suppliers = await this.fetchData(this.api.suppliers);
        const tbody = document.querySelector('#suppliers-table tbody');
        tbody.innerHTML = '';
        suppliers.forEach(s => {
            const jsonStr = JSON.stringify(s).replace(/'/g, "&#39;");
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600">${s.Supplier_Name}</td>
                    <td>${s.Email || 'N/A'}</td>
                    <td>${s.Contact_Number || 'N/A'}</td>
                    <td>${s.Address || 'N/A'}</td>
                    <td style="text-align:right">
                        <button class="btn btn-sm btn-black" onclick='app.editSupplier(${jsonStr})'>Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteRecord('${this.api.suppliers}', {Supplier_ID: ${s.Supplier_ID}}, 'suppliers-page')">Delete</button>
                    </td>
                </tr>
            `;
        });
    },

    editSupplier(data) {
        document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
        document.getElementById('sup_id').value = data.Supplier_ID;
        document.getElementById('sup_name').value = data.Supplier_Name;
        document.getElementById('sup_email').value = data.Email;
        document.getElementById('sup_contact').value = data.Contact_Number;
        document.getElementById('sup_address').value = data.Address;
        this.openModal('supplier-modal');
        document.getElementById('supplier-modal').dataset.editing = "true";
    },

    async loadStaff() {
        const staff = await this.fetchData(this.api.staff);
        const tbody = document.querySelector('#staff-table tbody');
        tbody.innerHTML = '';
        staff.forEach(s => {
            const jsonStr = JSON.stringify(s).replace(/'/g, "&#39;");
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600">
                        <div style="display:flex; align-items:center; gap:10px">
                             <img src="${s.Profile_Pic || `https://ui-avatars.com/api/?name=${s.Staff_Name}&background=F4B8C8&color=1A1A1A`}" style="width:30px; height:30px; border-radius:50%">
                             <span>${s.Staff_Name}</span>
                        </div>
                    </td>
                    <td><span class="badge ${s.Role === 'Inventory Manager' ? 'badge-low' : 'badge-neutral'}">${s.Role}</span></td>
                    <td>${s.Email || 'N/A'}</td>
                    <td>${s.Contact_Number || 'N/A'}</td>
                    <td style="text-align:right">
                        <button class="btn btn-sm btn-black" onclick='app.editStaff(${jsonStr})'>Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteRecord('${this.api.staff}', {Staff_ID: ${s.Staff_ID}}, 'staff-page')">Delete</button>
                    </td>
                </tr>
            `;
        });
    },

    editStaff(data) {
        document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
        document.getElementById('staff_id').value = data.Staff_ID;
        document.getElementById('staff_name').value = data.Staff_Name;
        document.getElementById('staff_role').value = data.Role;
        document.getElementById('staff_email').value = data.Email;
        document.getElementById('staff_contact').value = data.Contact_Number;
        this.openModal('staff-modal');
        document.getElementById('staff-modal').dataset.editing = "true";
    }
};

document.addEventListener('DOMContentLoaded', () => { app.init(); });
