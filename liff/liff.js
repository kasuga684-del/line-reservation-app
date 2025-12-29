const LIFF_App = {
    shopId: 'demo', selectedCastId: null, castsData: [], bookingData: {},
    init: async function() {
        const p = new URLSearchParams(window.location.search);
        if(p.has('shop')) this.shopId = p.get('shop');
        await this.loadCasts();
        await this.loadMenu();
    },
    postData: async function(act, pl={}) {
        try {
            const res = await fetch(CONFIG.API_URL, { method:'POST', mode:'cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({action:act, shop_id:this.shopId, ...pl}) });
            return await res.json();
        } catch(e) { console.error(e); alert('通信エラー'); throw e; }
    },
    loadCasts: async function() {
        const res = await this.postData('get_casts');
        const con = document.getElementById('cast-grid'); con.innerHTML = '';
        this.castsData = res.data;
        if(!res.data.length) { con.innerHTML='<p style="text-align:center;padding:20px;">キャストがいません</p>'; return; }
        res.data.forEach(c => {
            const card = document.createElement('div'); card.className = 'cast-card';
            card.onclick = () => this.showCastDetail(c.id);
            const img = c.image_url || 'https://via.placeholder.com/300x400/ffb6c1/ffffff?text=No+Image';
            card.innerHTML = `<div class="cast-img-wrapper"><div class="cast-img" style="background-image: url('${img}');"></div></div>
            <div class="cast-info"><h3>${c.name} <small>(${c.age})</small></h3><div class="meta">T${c.height} / ${c.sizes||'-'}</div><div class="card-intro">${c.introduction||''}</div></div>`;
            con.appendChild(card);
        });
    },
    showCastDetail: async function(id) {
        const c = this.castsData.find(x => x.id === id); if(!c) return;
        this.selectedCastId = id;
        this.switchView('view-detail'); window.scrollTo(0,0);
        
        document.getElementById('detail-img').style.backgroundImage = `url('${c.image_url||'https://via.placeholder.com/400x500/ffb6c1/ffffff?text=No+Image'}')`;
        document.getElementById('detail-name').textContent = c.name;
        document.getElementById('detail-age').textContent = `(${c.age}歳)`;
        document.getElementById('detail-meta').textContent = `T${c.height}cm / ${c.sizes||'-'}`;
        document.getElementById('detail-intro').innerHTML = (c.introduction||'').replace(/\n/g,'<br>');
        
        const mat = document.getElementById('schedule-matrix');
        mat.innerHTML = '<div style="padding:20px;text-align:center;">読み込み中...</div>';
        try {
            const res = await this.postData('get_weekly_availability', {cast_id:id});
            this.renderMatrix(res.data);
        } catch(e) { mat.innerHTML='読み込み失敗'; }
    },
    renderMatrix: function(data) {
        let html = '<table class="sch-table"><thead><tr><th>時間</th>';
        data.forEach(d => {
            const dt = new Date(d.date);
            const w = ['日','月','火','水','木','金','土'][dt.getDay()];
            const cl = dt.getDay()===0?'col-sun':(dt.getDay()===6?'col-sat':'');
            html += `<th class="${cl}">${dt.getMonth()+1}/${dt.getDate()}<br>${w}</th>`;
        });
        html += '</tr></thead><tbody>';
        for(let h=12; h<29; h++) {
            for(let m=0; m<60; m+=30) {
                const hd = h%24; const ts = `${('0'+hd).slice(-2)}:${('0'+m).slice(-2)}`;
                html += `<tr><td style="background:#fafafa;font-weight:bold;">${ts}</td>`;
                data.forEach(d => {
                    let ok = false;
                    if(d.shift && d.shift.start && d.shift.end) {
                        const [sh,sm] = d.shift.start.split(':').map(Number); const [eh,em] = d.shift.end.split(':').map(Number);
                        let sV = sh*100+sm; let eV = eh*100+em; let tV = h*100+m;
                        if(sV<1000) sV+=2400; if(eV<sV) eV+=2400;
                        if(tV>=sV && tV<eV) ok = true;
                    }
                    if(ok && !d.bookings.includes(ts)) html += `<td class="cell-ok" onclick="LIFF_App.selectSlot('${d.date}','${ts}')">〇</td>`;
                    else html += `<td class="cell-ng">✕</td>`;
                });
                html += '</tr>';
            }
        }
        document.getElementById('schedule-matrix').innerHTML = html + '</tbody></table>';
    },
    selectSlot: function(d,t) {
        this.bookingData = {date:d, time:t};
        this.switchView('view-form');
        document.getElementById('confirm-datetime').textContent = `${d} ${t}～`;
    },
    switchView: function(id) {
        ['view-list','view-detail','view-form'].forEach(v => document.getElementById(v).classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const sel = document.getElementById('res-course'); sel.innerHTML='<option value="">▼ コース選択</option>';
        res.data.forEach(m => {
            if(m.type==='course') {
                const ft = m.nomination_fee ? ` (指名料+${parseInt(m.nomination_fee).toLocaleString()}円)` : '';
                const opt = document.createElement('option'); opt.value = m.id;
                opt.textContent = `${m.name} (${m.minutes}分) - ${parseInt(m.price).toLocaleString()}円${ft}`;
                sel.appendChild(opt);
            }
        });
    },
    submit: async function() {
        const d = {
            cast_id:this.selectedCastId, date:this.bookingData.date, time:this.bookingData.time,
            course_id:document.getElementById('res-course').value,
            customer_name:document.getElementById('res-name').value, customer_tel:document.getElementById('res-tel').value,
            line_id:'DUMMY'
        };
        if(!d.course_id || !d.customer_name || !d.customer_tel) return alert('入力してください');
        const btn = document.getElementById('btn-submit'); btn.disabled=true; btn.textContent='送信中...';
        const res = await this.postData('save_reservation', d);
        if(res.status==='success') { alert('送信完了！'); location.reload(); }
        else { alert('エラー: '+res.message); btn.disabled=false; }
    }
};
document.addEventListener('DOMContentLoaded', ()=>LIFF_App.init());
