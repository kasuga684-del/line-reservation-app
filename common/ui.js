const UI = {
    init: function() { 
        this.checkAuth(); 
        this.initDropdowns();
        this.bindEvents(); 
    },

    // --- 初期化：プルダウン ---
    initDropdowns: function() {
        const createOpt = (start, end, step = 1, suffix = '') => {
            let opts = '';
            for(let i=start; i<=end; i+=step) opts += `<option value="${i}">${i}${suffix}</option>`;
            return opts;
        };

        // キャスト用
        if(document.getElementById('c-age')) {
            document.getElementById('c-age').innerHTML = createOpt(18, 50, 1, '歳');
            document.getElementById('c-height').innerHTML = createOpt(135, 175, 1, 'cm');
            document.getElementById('c-bust').innerHTML = createOpt(70, 120, 1);
            document.getElementById('c-waist').innerHTML = createOpt(50, 100, 1);
            document.getElementById('c-hip').innerHTML = createOpt(70, 120, 1);
            const cups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
            let cupOpts = ''; cups.forEach(c => cupOpts += `<option value="${c}">${c}カップ</option>`);
            document.getElementById('c-cup').innerHTML = cupOpts;
        }
        
        // メニュー用
        if(document.getElementById('m-price-course')) {
            document.getElementById('m-price-course').innerHTML = createOpt(10000, 40000, 2000, '円');
            
            // 時間 (60, 75... 120)
            let timeOpts = ''; 
            [60, 75, 90, 105, 120].forEach(t => timeOpts += `<option value="${t}">${t}分</option>`);
            document.getElementById('m-minutes-course').innerHTML = timeOpts;

            // ★指名料 (1000～5000, 500円刻み)
            document.getElementById('m-fee-course').innerHTML = createOpt(1000, 5000, 500, '円');
        }
    },

    bindEvents: function() {
        if(document.getElementById('btn-login')) document.getElementById('btn-login').addEventListener('click', () => this.login());
        if(document.getElementById('btn-new-cast')) document.getElementById('btn-new-cast').addEventListener('click', () => this.openModal());
        if(document.getElementById('btn-save-cast')) document.getElementById('btn-save-cast').addEventListener('click', () => this.saveCast());
        if(document.getElementById('btn-close-modal')) document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        const wsCast = document.getElementById('ws-cast');
        if(wsCast) wsCast.addEventListener('change', (e) => this.loadCastWeeklyData(e.target.value));
        if(document.getElementById('btn-save-weekly')) document.getElementById('btn-save-weekly').addEventListener('click', () => this.saveWeeklyShift());
        if(document.getElementById('btn-new-course')) document.getElementById('btn-new-course').addEventListener('click', () => this.openMenuModal('course'));
        if(document.getElementById('btn-new-option')) document.getElementById('btn-new-option').addEventListener('click', () => this.openMenuModal('option'));
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
    loadCasts: async function() {
        const res = await this.postData('get_casts');
        const list = document.getElementById('cast-list');
        list.innerHTML = '';
        res.data.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><div style="font-weight:bold;">${c.name}</div></td><td>${c.age}歳</td><td>${c.is_active?'<span style="color:#2563eb;font-weight:bold;">在籍</span>':'<span style="color:#94a3b8;">退店</span>'}</td>
            <td><button class="btn-primary btn-sm" onclick="UI.editCast('${c.id}')">編集</button><button class="btn-danger btn-sm" onclick="UI.deleteItem('cast', '${c.id}')" style="margin-left:5px;">削除</button></td>`;
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
            document.getElementById('c-image').value = data.image_url || '';
            document.getElementById('c-intro').value = data.introduction || '';
            document.getElementById('c-active').value = data.is_active;
            const sizes = data.sizes || '';
            const match = sizes.match(/B(\d+)\(([A-Z])\)-W(\d+)-H(\d+)/);
            if(match) {
                document.getElementById('c-bust').value = match[1]; document.getElementById('c-cup').value = match[2];
                document.getElementById('c-waist').value = match[3]; document.getElementById('c-hip').value = match[4];
            } else {
                document.getElementById('c-bust').value = 85; document.getElementById('c-cup').value = 'D';
                document.getElementById('c-waist').value = 58; document.getElementById('c-hip').value = 88;
            }
        } else {
            document.getElementById('form-cast').reset();
            document.getElementById('c-id').value = '';
            document.getElementById('c-age').value = 20; document.getElementById('c-height').value = 160;
            document.getElementById('c-bust').value = 85; document.getElementById('c-cup').value = 'D';
            document.getElementById('c-waist').value = 58; document.getElementById('c-hip').value = 88;
        }
    },
    closeModal: function() { document.getElementById('cast-modal').classList.add('hidden'); },
    editCast: function(id) {
        const rows = document.querySelectorAll('#cast-list tr');
        rows.forEach(r => { if(JSON.parse(r.dataset.json).id === id) this.openModal(JSON.parse(r.dataset.json)); });
    },
    saveCast: async function() {
        const b = document.getElementById('c-bust').value; const cup = document.getElementById('c-cup').value;
        const w = document.getElementById('c-waist').value; const h = document.getElementById('c-hip').value;
        const sizesStr = `B${b}(${cup})-W${w}-H${h}`;
        const data = {
            id: document.getElementById('c-id').value, name: document.getElementById('c-name').value, age: document.getElementById('c-age').value,
            height: document.getElementById('c-height').value, sizes: sizesStr, image_url: document.getElementById('c-image').value,
            introduction: document.getElementById('c-intro').value, is_active: document.getElementById('c-active').value
        };
        await this.postData('save_cast', data); alert('保存しました'); this.closeModal(); this.loadCasts();
    },
    deleteItem: async function(type, id) {
        if(!confirm('本当に削除しますか？\n※この操作は取り消せません。')) return;
        await this.postData('delete_data', { target_type: type, target_id: id });
        alert('削除しました');
        if(type === 'cast') this.loadCasts();
        else this.loadMenu();
    },
    generateTimeOptions: function() {
        let options = '<option value="">-- 休 --</option>'; const startHour = 12; const totalHours = 24; 
        for(let i=0; i<totalHours * 2; i++) {
            const totalMin = (startHour * 60) + (i * 30);
            let h = Math.floor(totalMin / 60); const m = totalMin % 60; let hDisp = h % 24;
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
        container.innerHTML = '<div style="padding:40px;text-align:center;">データを読み込んでいます...</div>';
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

    // --- メニュー管理 (指名料・シンプルオプション) ---
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const courseList = document.getElementById('course-list');
        const optionList = document.getElementById('option-list');
        courseList.innerHTML = ''; optionList.innerHTML = '';

        res.data.forEach(m => {
            const tr = document.createElement('tr');
            // 表示ロジック: コースなら「指名料」も表示、オプションなら「時間」は無視
            let info = '';
            if(m.type === 'course') {
                info = `<div>${m.minutes}分</div><div style="font-size:11px;color:#64748b;">(指名料 +${parseInt(m.nomination_fee||0).toLocaleString()}円)</div>`;
            } else {
                info = '-';
            }

            tr.innerHTML = `<td>${m.name}</td><td>${parseInt(m.price).toLocaleString()}円</td><td>${info}</td><td>${m.cast_name||'全員'}</td>
            <td><button class="btn-primary btn-sm" onclick="UI.editMenu('${m.id}')">編集</button><button class="btn-danger btn-sm" onclick="UI.deleteItem('menu', '${m.id}')" style="margin-left:5px;">削除</button></td>`;
            tr.dataset.json = JSON.stringify(m);
            if(m.type === 'course') courseList.appendChild(tr); else optionList.appendChild(tr);
        });
    },
    openMenuModal: function(type = 'course') {
        document.getElementById('menu-modal').classList.remove('hidden');
        document.getElementById('form-menu').reset();
        document.getElementById('m-id').value = '';
        document.getElementById('m-type').value = type;
        if(type === 'course') {
            document.getElementById('modal-title').textContent = 'コースの作成';
            document.getElementById('input-area-course').classList.remove('hidden');
            document.getElementById('input-area-option').classList.add('hidden');
        } else {
            document.getElementById('modal-title').textContent = 'オプションの作成';
            document.getElementById('input-area-course').classList.add('hidden');
            document.getElementById('input-area-option').classList.remove('hidden');
        }
    },
    closeMenuModal: function() { document.getElementById('menu-modal').classList.add('hidden'); },
    editMenu: function(id) {
        this.postData('get_menu').then(res => {
             const target = res.data.find(m => m.id === id);
             if(target) {
                 this.openMenuModal(target.type);
                 document.getElementById('m-id').value = target.id;
                 document.getElementById('m-name').value = target.name;
                 document.getElementById('m-cast').value = target.cast_id;
                 if(target.type === 'course') {
                     document.getElementById('m-price-course').value = target.price;
                     document.getElementById('m-minutes-course').value = target.minutes;
                     document.getElementById('m-fee-course').value = target.nomination_fee || 0;
                 } else {
                     document.getElementById('m-price-option').value = target.price;
                 }
             }
        });
    },
    saveMenu: async function() {
        const type = document.getElementById('m-type').value;
        const price = type === 'course' ? document.getElementById('m-price-course').value : document.getElementById('m-price-option').value;
        
        // オプションなら時間は0固定
        const minutes = type === 'course' ? document.getElementById('m-minutes-course').value : 0;
        const fee = type === 'course' ? document.getElementById('m-fee-course').value : 0;

        if(!price) { alert('料金を入力してください'); return; }
        const data = {
            id: document.getElementById('m-id').value, type: type, name: document.getElementById('m-name').value,
            price: price, minutes: minutes, nomination_fee: fee,
            cast_id: document.getElementById('m-cast').value, is_active: true
        };
        await this.postData('save_menu', data); alert('保存しました'); this.closeMenuModal(); this.loadMenu();
    },
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
            tr.innerHTML = `<td><div style="font-weight:bold;">${r.date.split('T')[0]} ${r.time}</div></td><td>${r.cast_name}</td><td><div style="font-weight:bold;">${r.customer_name}</div></td><td>${r.customer_tel||'-'}</td><td>${r.course_name}</td><td>${badge}</td><td>${r.status === 'pending' ? `<button onclick="UI.updateRes('${r.id}', 'confirmed')" class="btn-primary btn-sm" style="background:#16a34a;">確定</button>` : ''}${r.status !== 'canceled' ? `<button onclick="UI.updateRes('${r.id}', 'canceled')" class="btn-primary btn-sm btn-danger" style="margin-left:5px;">却下</button>` : ''}</td>`;
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
