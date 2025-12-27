const UI = {
    init: function() { this.checkAuth(); this.bindEvents(); },
        // --- 週間シフト管理 ---
    loadWeeklyShiftEditor: async function() {
        // 1. キャスト一覧取得
        const res = await this.postData('get_casts');
        const sel = document.getElementById('ws-cast');
        sel.innerHTML = '<option value="">キャストを選択してください</option>';
        res.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            sel.appendChild(opt);
        });
        
        // 日付ヘッダー生成
        this.renderWeeklyHeader();
    },
    
    renderWeeklyHeader: function() {
        const today = new Date();
        const container = document.getElementById('ws-container');
        container.innerHTML = '';
        
        for(let i=0; i<7; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayStr = ['日','月','火','水','木','金','土'][d.getDay()];
            
            const row = document.createElement('div');
            row.className = 'ws-row';
            row.innerHTML = `
                <div class="ws-date">${dateStr} (${dayStr})</div>
                <div class="ws-inputs">
                    <input type="time" class="ws-start" data-date="${dateStr}"> ～ 
                    <input type="time" class="ws-end" data-date="${dateStr}">
                </div>
            `;
            container.appendChild(row);
        }
    },

    loadCastWeeklyData: async function(castId) {
        if(!castId) return;
        // マトリクス取得用APIを流用して、現在のシフトを埋める
        const res = await this.postData('get_weekly_availability', { cast_id: castId });
        
        const inputs = document.querySelectorAll('.ws-start');
        inputs.forEach(inp => {
            const date = inp.dataset.date;
            const target = res.data.find(d => d.date === date);
            
            const row = inp.closest('.ws-row');
            const endInp = row.querySelector('.ws-end');
            
            if(target && target.shift) {
                inp.value = target.shift.start || '';
                endInp.value = target.shift.end || '';
            } else {
                inp.value = '';
                endInp.value = '';
            }
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

    // 既存のbindEventsに追加
    bindEvents: function() {
                if(document.getElementById('ws-cast')) document.getElementById('ws-cast').addEventListener('change', (e) => this.loadCastWeeklyData(e.target.value));
        if(document.getElementById('btn-save-weekly')) document.getElementById('btn-save-weekly').addEventListener('click', () => this.saveWeeklyShift());
        if(document.getElementById('btn-login')) document.getElementById('btn-login').addEventListener('click', () => this.login());
        if(document.getElementById('btn-save-cast')) document.getElementById('btn-save-cast').addEventListener('click', () => this.saveCast());
        if(document.getElementById('btn-new-cast')) document.getElementById('btn-new-cast').addEventListener('click', () => this.openModal());
        if(document.getElementById('btn-close-modal')) document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        if(document.getElementById('schedule-date')) document.getElementById('schedule-date').addEventListener('change', () => this.loadSchedule());
        if(document.getElementById('btn-save-schedule')) document.getElementById('btn-save-schedule').addEventListener('click', () => this.saveSchedule());
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
    // Casts
    loadCasts: async function() {
        const res = await this.postData('get_casts');
        const list = document.getElementById('cast-list');
        list.innerHTML = '';
        res.data.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.name}</td><td>${c.age}</td><td>${c.is_active?'在籍':'退店'}</td><td><button onclick="UI.editCast('${c.id}')">編集</button></td>`;
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
    // Schedule
    loadSchedule: async function() {
        const date = document.getElementById('schedule-date').value;
        if(!date) return;
        const list = document.getElementById('schedule-list');
        list.innerHTML = '<tr><td colspan="4">読み込み中...</td></tr>';
        const res = await this.postData('get_schedule', { date: date });
        list.innerHTML = '';
        if(res.data.length === 0) { list.innerHTML = '<tr><td colspan="4">キャストがいません。</td></tr>'; return; }
        res.data.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${s.name}</td><td><input type="time" class="inp-start" data-id="${s.cast_id}" value="${s.start_time}"> ～ <input type="time" class="inp-end" data-id="${s.cast_id}" value="${s.end_time}"></td><td><label><input type="checkbox" class="inp-immediate" data-id="${s.cast_id}" ${s.is_immediate ? 'checked' : ''}> 今すぐOK</label></td><td>-</td>`;
            list.appendChild(tr);
        });
    },
    saveSchedule: async function() {
        const date = document.getElementById('schedule-date').value;
        const rows = document.querySelectorAll('#schedule-list tr');
        const schedules = [];
        rows.forEach(tr => {
            const startInp = tr.querySelector('.inp-start');
            if(!startInp) return;
            schedules.push({
                cast_id: startInp.dataset.id,
                start_time: startInp.value,
                end_time: tr.querySelector('.inp-end').value,
                is_immediate: tr.querySelector('.inp-immediate').checked
            });
        });
        await this.postData('save_schedule', { date: date, schedules: schedules });
        alert('シフトを保存しました！');
    },
    // Menu
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const list = document.getElementById('menu-list');
        list.innerHTML = '';
        res.data.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${m.type==='course'?'コース':'OP'}</td><td>${m.name}</td><td>${m.price}円</td><td>${m.minutes}分</td><td>${m.cast_name}</td><td><button onclick="UI.editMenu('${m.id}')">編集</button></td>`;
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
    // Reservations
    loadReservations: async function() {
        const res = await this.postData('get_reservations');
        const list = document.getElementById('res-list');
        list.innerHTML = '';
        res.data.forEach(r => {
            let statusBadge = '';
            if(r.status === 'pending') statusBadge = '<span style="background:#ffc107; padding:3px 8px; border-radius:10px;">未確定</span>';
            else if(r.status === 'confirmed') statusBadge = '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:10px;">確定済</span>';
            else if(r.status === 'canceled') statusBadge = '<span style="background:#dc3545; color:white; padding:3px 8px; border-radius:10px;">キャンセル</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.date.split('T')[0]} ${r.time}</td><td>${r.cast_name}</td><td>${r.customer_name}</td><td>${r.course_name}</td><td>${statusBadge}</td><td>${r.status === 'pending' ? `<button onclick="UI.updateRes('${r.id}', 'confirmed')" style="background:#28a745; color:white;">確定</button>` : ''}${r.status !== 'canceled' ? `<button onclick="UI.updateRes('${r.id}', 'canceled')" style="background:#dc3545; color:white;">却下</button>` : ''}</td>`;
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
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    if(document.getElementById('cast-list')) UI.loadCasts();
    if(document.getElementById('schedule-list')) { const t = new Date().toISOString().split('T')[0]; document.getElementById('schedule-date').value = t; UI.loadSchedule(); }
    if(document.getElementById('menu-list')) UI.loadMenu();
    if(document.getElementById('res-list')) UI.loadReservations();
});


