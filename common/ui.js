const UI = {
    init: function() { this.checkAuth(); this.bindEvents(); },

    bindEvents: function() {
        // ログイン
        if(document.getElementById('btn-login')) document.getElementById('btn-login').addEventListener('click', () => this.login());
        
        // キャスト管理
        if(document.getElementById('btn-new-cast')) document.getElementById('btn-new-cast').addEventListener('click', () => this.openModal());
        if(document.getElementById('btn-save-cast')) document.getElementById('btn-save-cast').addEventListener('click', () => this.saveCast());
        if(document.getElementById('btn-close-modal')) document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        
        // 週間シフト (キャスト選択時)
        const wsCast = document.getElementById('ws-cast');
        if(wsCast) wsCast.addEventListener('change', (e) => this.loadCastWeeklyData(e.target.value));
        if(document.getElementById('btn-save-weekly')) document.getElementById('btn-save-weekly').addEventListener('click', () => this.saveWeeklyShift());

        // メニュー管理 (★ここが消えていたので復活！)
        if(document.getElementById('btn-new-menu')) document.getElementById('btn-new-menu').addEventListener('click', () => this.openMenuModal());
        if(document.getElementById('btn-save-menu')) document.getElementById('btn-save-menu').addEventListener('click', () => this.saveMenu());
        if(document.getElementById('btn-close-menu-modal')) document.getElementById('btn-close-menu-modal').addEventListener('click', () => this.closeMenuModal());
    },

    checkAuth: function() {
        const token = localStorage.getItem('auth_token');
        const overlay = document.getElementById('login-overlay');
        if (token) {
            if(overlay) overlay.classList.add('hidden');
            if(document.getElementById('shop-name-display')) document.getElementById('shop-name-display').textContent = localStorage.getItem('shop_name');
        } else {
            if(overlay) overlay.classList.remove('hidden');
        }
    },

    postData: async function(act, pl = {}) {
        const url = CONFIG.API_URL;
        const body = { action: act, token: localStorage.getItem('auth_token'), ...pl };
        try {
            const res = await fetch(url, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
            const json = await res.json();
            if(json.status === 'error') { alert(json.message); throw new Error(json.message); }
            return json;
        } catch (e) { console.error(e); alert('通信エラー: ' + e); throw e; }
    },

    login: async function() {
        const id = document.getElementById('inp-shop-id').value;
        const pw = document.getElementById('inp-password').value;
        if(!id || !pw) return;
        const res = await this.postData('login', { shop_id: id, password: pw });
        if(res.status === 'success') {
            localStorage.setItem('auth_token', res.token);
            localStorage.setItem('shop_name', res.shop_name);
            localStorage.setItem('shop_id', id);
            location.reload();
        }
    },

    // --- キャスト管理 ---
    loadCasts: async function() {
        const res = await this.postData('get_casts');
        const list = document.getElementById('cast-list');
        list.innerHTML = '';
        res.data.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><div style="font-weight:bold;">${c.name}</div><div style="font-size:12px;color:#888;">ID: ${c.id}</div></td><td>${c.age}歳</td><td>${c.is_active?'<span style="color:#2563eb;font-weight:bold;">在籍</span>':'<span style="color:#94a3b8;">退店</span>'}</td><td><button class="btn-primary btn-sm" onclick="UI.editCast('${c.id}')">編集</button></td>`;
            tr.dataset.json = JSON.stringify(c);
            list.appendChild(tr);
        });
    },
    openModal: function(data = null) {
        document.getElementById('cast-modal').classList.remove('hidden');
        if(data) {
            document.getElementById('c-id').value = data.id;
            document.getElementById('c-name').value = data.name;
            document.getElementById('c-age').value = data.age;
            document.getElementById('c-height').value = data.height;
            document.getElementById('c-sizes').value = data.sizes;
            document.getElementById('c-image').value = data.image_url || '';
            document.getElementById('c-intro').value = data.introduction || '';
            document.getElementById('c-active').value = data.is_active;
        } else {
            document.getElementById('form-cast').reset();
            document.getElementById('c-id').value = '';
        }
    },
    closeModal: function() { document.getElementById('cast-modal').classList.add('hidden'); },
    editCast: function(id) {
        const rows = document.querySelectorAll('#cast-list tr');
        rows.forEach(r => { if(JSON.parse(r.dataset.json).id === id) this.openModal(JSON.parse(r.dataset.json)); });
    },
    saveCast: async function() {
        const data = {
            id: document.getElementById('c-id').value,
            name: document.getElementById('c-name').value,
            age: document.getElementById('c-age').value,
            height: document.getElementById('c-height').value,
            sizes: document.getElementById('c-sizes').value,
            image_url: document.getElementById('c-image').value,
            introduction: document.getElementById('c-intro').value,
            is_active: document.getElementById('c-active').value
        };
        await this.postData('save_cast', data);
        alert('保存しました');
        this.closeModal();
        this.loadCasts();
    },

    // --- 週間シフト管理 (30分単位プルダウン) ---
    generateTimeOptions: function() {
        let options = '<option value="">-- 休 --</option>';
        const startHour = 12; const totalHours = 24; 
        for(let i=0; i<totalHours * 2; i++) {
            const totalMin = (startHour * 60) + (i * 30);
            let h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            let hDisp = h % 24;
            const val = `${hDisp.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            options += `<option value="${val}">${val}</option>`;
        }
        return options;
    },
    loadWeeklyShiftEditor: async function() {
        const res = await this.postData('get_casts');
        const sel = document.getElementById('ws-cast');
        if(!sel) return;
        sel.innerHTML = '<option value="">▼ キャストを選択してください</option>';
        res.data.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt); });
        this.renderWeeklyHeader();
    },
    renderWeeklyHeader: function() {
        const today = new Date();
        const container = document.getElementById('ws-container');
        if(!container) return;
        container.innerHTML = '';
        const timeOptions = this.generateTimeOptions();
        for(let i=0; i<7; i++) {
            const d = new Date(); d.setDate(today.getDate() + i);
            const year = d.getFullYear(); const month = (d.getMonth()+1).toString().padStart(2,'0'); const day = d.getDate().toString().padStart(2,'0');
            const dateStr = `${year}-${month}-${day}`;
            const dayStr = ['日','月','火','水','木','金','土'][d.getDay()];
            const dayClass = d.getDay()===0 ? 'day-sun' : (d.getDay()===6 ? 'day-sat' : '');
            
            const row = document.createElement('div');
            row.className = 'ws-row';
            row.innerHTML = `<div class="ws-date ${dayClass}">${dateStr} (${dayStr})</div><div class="ws-inputs"><select class="ws-start" data-date="${dateStr}">${timeOptions}</select> ～ <select class="ws-end" data-date="${dateStr}">${timeOptions}</select></div>`;
            container.appendChild(row);
        }
    },
    loadCastWeeklyData: async function(castId) {
        if(!castId) { this.renderWeeklyHeader(); return; }
        const container = document.getElementById('ws-container');
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">データを読み込んでいます...</div>';
        const res = await this.postData('get_weekly_availability', { cast_id: castId });
        this.renderWeeklyHeader();
        const inputs = document.querySelectorAll('.ws-start');
        inputs.forEach(inp => {
            const date = inp.dataset.date;
            const target = res.data.find(d => d.date === date);
            const row = inp.closest('.ws-row');
            const endInp = row.querySelector('.ws-end');
            if(target && target.shift) { inp.value = target.shift.start || ''; endInp.value = target.shift.end || ''; }
        });
    },
    saveWeeklyShift: async function() {
        const castId = document.getElementById('ws-cast').value;
        if(!castId) { alert('キャストを選択してください'); return; }
        const shifts = [];
        const rows = document.querySelectorAll('.ws-row');
        rows.forEach(r => {
            const start = r.querySelector('.ws-start').value;
            const end = r.querySelector('.ws-end').value;
            const date = r.querySelector('.ws-start').dataset.date;
            shifts.push({ date: date, start: start, end: end });
        });
        await this.postData('save_weekly_shift', { cast_id: castId, shifts: shifts });
        alert('週間シフトを保存しました！');
    },

    // --- メニュー管理 (★ここが復活！) ---
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const list = document.getElementById('menu-list');
        list.innerHTML = '';
        res.data.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${m.type==='course'?'<span style="background:#e0e7ff;color:#3730a3;padding:4px 8px;border-radius:4px;font-size:12px;">コース</span>':'<span style="background:#f1f5f9;color:#475569;padding:4px 8px;border-radius:4px;font-size:12px;">OP</span>'}</td>
                            <td>${m.name}</td>
                            <td>${parseInt(m.price).toLocaleString()}円</td>
                            <td>${m.minutes}分</td>
                            <td>${m.cast_name||'全員'}</td>
                            <td><button class="btn-primary btn-sm" onclick="UI.editMenu('${m.id}')">編集</button></td>`;
            tr.dataset.json = JSON.stringify(m);
            list.appendChild(tr);
        });
    },
    openMenuModal: function(data = null) {
        document.getElementById('menu-modal').classList.remove('hidden');
        if(data) {
            document.getElementById('m-id').value = data.id;
            document.getElementById('m-type').value = data.type;
            document.getElementById('m-name').value = data.name;
            document.getElementById('m-price').value = data.price;
            document.getElementById('m-minutes').value = data.minutes;
            document.getElementById('m-cast').value = data.cast_id;
        } else {
            document.getElementById('form-menu').reset();
            document.getElementById('m-id').value = '';
        }
    },
    closeMenuModal: function() { document.getElementById('menu-modal').classList.add('hidden'); },
    editMenu: function(id) {
        const rows = document.querySelectorAll('#menu-list tr');
        rows.forEach(r => { if(JSON.parse(r.dataset.json).id === id) this.openMenuModal(JSON.parse(r.dataset.json)); });
    },
    saveMenu: async function() {
        const data = {
            id: document.getElementById('m-id').value,
            type: document.getElementById('m-type').value,
            name: document.getElementById('m-name').value,
            price: document.getElementById('m-price').value,
            minutes: document.getElementById('m-minutes').value,
            cast_id: document.getElementById('m-cast').value,
            is_active: true
        };
        await this.postData('save_menu', data);
        alert('保存しました');
        this.closeMenuModal();
        this.loadMenu();
    },

    // --- 予約管理 ---
    loadReservations: async function() {
        const res = await this.postData('get_reservations');
        const list = document.getElementById('res-list');
        list.innerHTML = '';
        res.data.forEach(r => {
            let badge = '';
            if(r.status === 'pending') badge = '<span style="background:#fef3c7;color:#b45309;padding:4px 8px;border-radius:10px;font-size:12px;font-weight:bold;">未確定</span>';
            else if(r.status === 'confirmed') badge = '<span style="background:#dcfce7;color:#15803d;padding:4px 8px;border-radius:10px;font-size:12px;font-weight:bold;">確定済</span>';
            else if(r.status === 'canceled') badge = '<span style="background:#fee2e2;color:#b91c1c;padding:4px 8px;border-radius:10px;font-size:12px;font-weight:bold;">キャンセル</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div style="font-weight:bold;">${r.date.split('T')[0]} ${r.time}</div></td>
                <td>${r.cast_name}</td>
                <td><div style="font-weight:bold;">${r.customer_name}</div></td>
                <td>${r.customer_tel||'-'}</td>
                <td>${r.course_name}</td>
                <td>${badge}</td>
                <td>
                    ${r.status === 'pending' ? `<button onclick="UI.updateRes('${r.id}', 'confirmed')" class="btn-primary btn-sm" style="background:#16a34a;">確定</button>` : ''}
                    ${r.status !== 'canceled' ? `<button onclick="UI.updateRes('${r.id}', 'canceled')" class="btn-primary btn-sm btn-danger" style="margin-left:5px;">却下</button>` : ''}
                </td>
            `;
            list.appendChild(tr);
        });
    },
    updateRes: async function(id, status) {
        if(!confirm(status === 'confirmed' ? '予約を確定しますか？' : '予約を取り消しますか？')) return;
        await this.postData('update_reservation', { id: id, status: status });
        alert('更新しました');
        this.loadReservations();
    }
};
