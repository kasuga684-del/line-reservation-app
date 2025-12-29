const UI = {
    init: function() {
        this.checkAuth();
        this.initDropdowns();
        this.bindEvents();
        // 初期表示
        const page = document.body.dataset.page || 'home';
        this.navigate(page);
    },
    navigate: function(id) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('view-' + id);
        if(target) {
            target.classList.add('active');
            if(id==='casts') this.loadCasts();
            if(id==='schedule') this.loadWeeklyShiftEditor();
            if(id==='menu') this.loadMenu();
            if(id==='reservations') this.loadReservations();
        }
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const nav = document.getElementById('nav-' + id);
        if(nav) nav.classList.add('active');
    },
    initDropdowns: function() {
        const createOpt = (s,e,st=1,sx='') => { let o=''; for(let i=s;i<=e;i+=st)o+=`<option value="${i}">${i}${sx}</option>`; return o; };
        if(document.getElementById('c-age')) {
            document.getElementById('c-age').innerHTML = createOpt(18,50,1,'歳');
            document.getElementById('c-height').innerHTML = createOpt(135,175,1,'cm');
            document.getElementById('c-bust').innerHTML = createOpt(70,120);
            document.getElementById('c-waist').innerHTML = createOpt(50,100);
            document.getElementById('c-hip').innerHTML = createOpt(70,120);
            let c=''; ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(x=>c+=`<option value="${x}">${x}カップ</option>`);
            document.getElementById('c-cup').innerHTML = c;
        }
        if(document.getElementById('m-price-course')) {
            document.getElementById('m-price-course').innerHTML = createOpt(10000,40000,2000,'円');
            let t=''; [60,75,90,105,120].forEach(x=>t+=`<option value="${x}">${x}分</option>`);
            document.getElementById('m-minutes-course').innerHTML = t;
            document.getElementById('m-fee-course').innerHTML = createOpt(1000,5000,500,'円');
        }
    },
    bindEvents: function() {
        // ボタンイベントの紐づけ
        const bind = (id, func) => { const el=document.getElementById(id); if(el) el.addEventListener('click', func); };
        bind('btn-login', ()=>this.login());
        bind('btn-new-cast', ()=>this.openModal('cast-modal'));
        bind('btn-save-cast', ()=>this.saveCast());
        bind('btn-close-modal', ()=>document.getElementById('cast-modal').classList.add('hidden'));
        bind('btn-save-weekly', ()=>this.saveWeeklyShift());
        bind('btn-new-course', ()=>this.openMenuModal('course'));
        bind('btn-new-option', ()=>this.openMenuModal('option'));
        bind('btn-save-menu', ()=>this.saveMenu());
        bind('btn-close-menu-modal', ()=>document.getElementById('menu-modal').classList.add('hidden'));
        
        const wsCast = document.getElementById('ws-cast');
        if(wsCast) wsCast.addEventListener('change', (e)=>this.loadCastWeeklyData(e.target.value));
    },
    checkAuth: function() {
        if(!document.body.classList.contains('admin-mode')) return; 
        const token = localStorage.getItem('auth_token');
        const overlay = document.getElementById('login-overlay');
        if(token) overlay.classList.add('hidden');
        else overlay.classList.remove('hidden');
    },
    postData: async function(act, pl={}) {
        try {
            const res = await fetch(CONFIG.API_URL, { method:'POST', mode:'cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({action:act, token:localStorage.getItem('auth_token'), ...pl}) });
            const json = await res.json();
            if(json.status==='error') throw new Error(json.message);
            return json;
        } catch(e) { alert('エラー: '+e.message); throw e; }
    },
    login: async function() {
        const id=document.getElementById('inp-shop-id').value; const pw=document.getElementById('inp-password').value;
        const res = await this.postData('login', {shop_id:id, password:pw});
        if(res.status==='success') { localStorage.setItem('auth_token', res.token); location.reload(); }
    },
    // --- キャスト ---
    loadCasts: async function() {
        const res = await this.postData('get_casts');
        const list = document.getElementById('cast-list');
        list.innerHTML = '';
        const ws = document.getElementById('ws-cast'); // シフト用のプルダウンも更新
        if(ws) ws.innerHTML = '<option value="">▼ キャストを選択</option>';
        
        res.data.forEach(c => {
            // 一覧
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.name}</td><td>${c.age}歳</td><td>${c.is_active?'在籍':'退店'}</td><td><button class="btn-primary" onclick="UI.editCast('${c.id}')">編集</button> <button class="btn-danger" onclick="UI.deleteItem('cast','${c.id}')">削除</button></td>`;
            tr.dataset.json = JSON.stringify(c);
            list.appendChild(tr);
            // シフト用
            if(ws && c.is_active) { const opt=document.createElement('option'); opt.value=c.id; opt.textContent=c.name; ws.appendChild(opt); }
        });
    },
    openModal: function(id) {
        document.getElementById(id).classList.remove('hidden');
        if(id==='cast-modal') {
            document.getElementById('form-cast').reset();
            document.getElementById('c-id').value='';
            // 初期値
            document.getElementById('c-age').value=20; document.getElementById('c-height').value=160;
            document.getElementById('c-bust').value=85; document.getElementById('c-cup').value='D';
            document.getElementById('c-waist').value=58; document.getElementById('c-hip').value=88;
        }
    },
    editCast: function(id) {
        const rows = document.querySelectorAll('#cast-list tr');
        rows.forEach(r => {
            const data = JSON.parse(r.dataset.json);
            if(data.id === id) {
                this.openModal('cast-modal');
                document.getElementById('c-id').value = data.id;
                document.getElementById('c-name').value = data.name;
                document.getElementById('c-age').value = data.age;
                document.getElement                document.getElementById('c-image').value = data.image_url;
                document.getElementById('c-intro').value = data.introduction;
                const m = (data.sizes||'').match(/B(\d+)\(([A-Z])\)-W(\d+)-H(\d+)/);
                if(m) {
                    document.getElementById('c-bust').value=m[1]; document.getElementById('c-cup').value=m[2];
                    document.getElementById('c-waist').value=m[3]; document.getElementById('c-hip').value=m[4];
                }
            }
        });
    },
    saveCast: async function() {
        const sz = `B${document.getElementById('c-bust').value}(${document.getElementById('c-cup').value})-W${document.getElementById('c-waist').value}-H${document.getElementById('c-hip').value}`;
        const d = {
            id:document.getElementById('c-id').value, name:document.getElementById('c-name').value, age:document.getElementById('c-age').value,
            height:document.getElementById('c-height').value, sizes:sz, image_url:document.getElementById('c-image').value,
            introduction:document.getElementById('c-intro').value, is_active:document.getElementById('c-active').value
        };
        await this.postData('save_cast', d); alert('保存しました'); document.getElementById('cast-modal').classList.add('hidden'); this.loadCasts();
    },
    deleteItem: async function(type, id) {
        if(!confirm('削除しますか？')) return;
        await this.postData('delete_data', {target_type:type, target_id:id}); alert('削除しました');
        if(type==='cast') this.loadCasts(); else this.loadMenu();
    },
    // --- シフト ---
    loadWeeklyShiftEditor: function() {
        const con = document.getElementById('ws-container'); con.innerHTML = '';
        const today = new Date();
        // 30分単位プルダウン作成
        let opts = '<option value="">-- 休 --</option>';
        for(let i=0;i<48;i++){
            let m=i*30 + (12*60); let h=Math.floor(m/60); let mm=m%60; let hd=h%24;
            let v = `${('0'+hd).slice(-2)}:${('0'+mm).slice(-2)}`;
            opts += `<option value="${v}">${v}</option>`;
        }
        for(let i=0;i<7;i++) {
            let d=new Date(); d.setDate(today.getDate()+i);
            let ds = d.toISOString().split('T')[0];
            let w = ['日','月','火','水','木','金','土'][d.getDay()];
            let cls = d.getDay()===0?'color:red':(d.getDay()===6?'color:blue':'');
            let row = document.createElement('div');
            row.className = 'ws-row';
            row.style.padding='10px'; row.style.borderBottom='1px solid #eee';
            row.innerHTML = `<span style="display:inline-block;width:150px;font-weight:bold;${cls}">${ds} (${w})</span>
            <select class="ws-start" data-date="${ds}">${opts}</select> ～ <select class="ws-end" data-date="${ds}">${opts}</select>`;
            con.appendChild(row);
        }
    },
    loadCastWeeklyData: async function(id) {
        if(!id) return;
        const res = await this.postData('get_weekly_availability', {cast_id:id});
        const rows = document.querySelectorAll('.ws-row');
        rows.forEach(r => {
            const start = r.querySelector('.ws-start'); const end = r.querySelector('.ws-end');
            const d = start.dataset.date;
            const t = res.data.find(x => x.date === d);
            if(t && t.shift) { start.value = t.shift.start||''; end.value = t.shift.end||''; }
            else { start.value=''; end.value=''; }
        });
    },
    saveWeeklyShift: async function() {
        const id = document.getElementById('ws-cast').value;
        if(!id) return alert('キャストを選択してください');
        const shifts = [];
        document.querySelectorAll('.ws-row').forEach(r => {
            shifts.push({ date:r.querySelector('.ws-start').dataset.date, start:r.querySelector('.ws-start').value, end:r.querySelector('.ws-end').value });
        });
        await this.postData('save_weekly_shift', {cast_id:id, shifts:shifts}); alert('保存しました');
    },
    // --- メニュー ---
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const cl = document.getElementById('course-list'); const ol = document.getElementById('option-list');
        cl.innerHTML=''; ol.innerHTML='';
        res.data.forEach(m => {
            const tr = document.createElement('tr');
            let info = m.type==='course' ? `${m.minutes}分 (指名料+${m.nomination_fee}円)` : '-';
            tr.innerHTML = `<td>${m.name}</td><td>${parseInt(m.price).toLocaleString()}円</td><td>${info}</td><td>${m.cast_name||'全員'}</td>
            <td><button class="btn-primary" onclick="UI.editMenu('${m.id}')">編集</button> <button class="btn-danger" onclick="UI.deleteItem('menu','${m.id}')">削除</button></td>`;
            tr.dataset.json = JSON.stringify(m);
            if(m.type==='course') cl.appendChild(tr); else ol.appendChild(tr);
        });
    },
    openMenuModal: function(type) {
        document.getElementById('menu-modal').classList.remove('hidden');
        document.getElementById('form-menu').reset();
        document.getElementById('m-id').value=''; document.getElementById('m-type').value=type;
        document.getElementById('input-area-course').style.display = type==='course'?'block':'none';
        document.getElementById('input-area-option').style.display = type==='option'?'block':'none';
    },
    editMenu: function(id) {
        const rows = document.querySelectorAll('#course-list tr, #option-list tr');
        rows.forEach(r => {
            const d = JSON.parse(r.dataset.json);
            if(d.id === id) {
                this.openMenuModal(d.type);
                document.getElementById('m-id').value=d.id; document.getElementById('m-name').value=d.name;
                document.getElementById('m-cast').value=d.cast_id;
                if(d.type==='course') {
                    document.getElementById('m-price-course').value=d.price; document.getElementById('m-minutes-course').value=d.minutes;
                    document.getElementById('m-fee-course').value=d.nomination_fee;
                } else {
                    document.getElementById('m-price-option').value=d.price;
                }
            }
        });
    },
    saveMenu: async function() {
        const t = document.getElementById('m-type').value;
        const p = t==='course' ? document.getElementById('m-price-course').value : document.getElementById('m-price-option').value;
        const m = t==='course' ? document.getElementById('m-minutes-course').value : 0;
        const f = t==='course' ? document.getElementById('m-fee-course').value : 0;
        const d = {
            id:document.getElementById('m-id').value, type:t, name:document.getElementById('m-name').value,
            price:p, minutes:m, nomination_fee:f, cast_id:document.getElementById('m-cast').value, is_active:true
        };
        await this.postData('save_menu', d); alert('保存しました'); document.getElementById('menu-modal').classList.add('hidden'); this.loadMenu();
    },
    // --- 予約 ---
    loadReservations: async function() {
        const res = await this.postData('get_reservations');
        const list = document.getElementById('res-list'); list.innerHTML='';
        res.data.forEach(r => {
            let st = r.status==='pending'?'未確定':(r.status==='confirmed'?'確定':'キャンセル');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.date.split('T')[0]} ${r.time}</td><td>${r.cast_name}</td><td>${r.customer_name}</td><td>${r.customer_tel}</td><td>${r.course_name}</td><td>${st}</td>
            <td>${r.status==='pending'?`<button class="btn-primary" onclick="UI.updateRes('${r.id}','confirmed')">確定</button> `:''}
            ${r.status!=='canceled'?`<button class="btn-danger" onclick="UI.updateRes('${r.id}','canceled')">却下</button>`:''}</td>`;
            list.appendChild(tr);
        });
    },
    updateRes: async function(id, st) {
        if(!confirm('更新しますか？')) return;
        await this.postData('update_reservation', {id:id, status:st}); alert('更新しました'); this.loadReservations();
    }
};
