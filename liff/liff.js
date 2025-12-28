const LIFF_App = {
    shopId: 'demo',
    selectedCastId: null,
    castsData: [],
    bookingData: {},

    init: async function() {
        const params = new URLSearchParams(window.location.search);
        if(params.has('shop')) this.shopId = params.get('shop');
        await this.loadCasts();
        await this.loadMenu();
    },

    postData: async function(act, pl = {}) {
        const url = CONFIG.API_URL;
        try {
            const res = await fetch(url, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: act, shop_id: this.shopId, ...pl }) });
            return await res.json();
        } catch (e) { console.error(e); alert('通信エラー。再読み込みしてください。'); throw e; }
    },

    loadCasts: async function() {
        const res = await this.postData('get_casts');
        this.castsData = res.data;
        const container = document.getElementById('cast-grid');
        container.innerHTML = '';
        this.castsData.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            card.onclick = () => this.showCastDetail(c.id);
            const imgUrl = c.image_url || 'https://via.placeholder.com/300x400/ffb6c1/ffffff?text=No+Image';
            const sizes = c.sizes || '-';
            const intro = c.introduction || '';
            card.innerHTML = `<div class="cast-img-wrapper"><div class="cast-img" style="background-image: url('${imgUrl}');"></div></div>
                <div class="cast-info"><h3>${c.name} <small>(${c.age})</small></h3><div class="meta">T${c.height} / ${sizes}</div><div class="card-intro">${intro}</div></div>`;
            container.appendChild(card);
        });
    },

    showCastDetail: async function(castId) {
        const cast = this.castsData.find(c => c.id === castId);
        if(!cast) return;
        this.selectedCastId = castId;
        this.switchView('view-detail');
        window.scrollTo(0, 0);

        const imgUrl = cast.image_url || 'https://via.placeholder.com/400x500/ffb6c1/ffffff?text=No+Image';
        document.getElementById('detail-img').style.backgroundImage = `url('${imgUrl}')`;
        document.getElementById('detail-name').textContent = cast.name;
        document.getElementById('detail-age').textContent = `(${cast.age}歳)`;
        document.getElementById('detail-meta').textContent = `T${cast.height}cm / ${cast.sizes || '-'}`;
        document.getElementById('detail-intro').innerHTML = cast.introduction ? cast.introduction.replace(/\n/g, '<br>') : 'よろしくお願いします！';
        
        document.getElementById('schedule-matrix').innerHTML = '<div style="padding:20px;text-align:center;">スケジュール確認中...</div>';
        try {
            const res = await this.postData('get_weekly_availability', { cast_id: castId });
            this.renderMatrix(res.data);
        } catch(e) { document.getElementById('schedule-matrix').innerHTML = '読み込み失敗'; }
    },

    renderMatrix: function(data) {
        const matrix = document.getElementById('schedule-matrix');
        let html = '<table class="sch-table"><thead><tr><th>時間</th>';
        data.forEach(d => {
            const date = new Date(d.date);
            const m = date.getMonth()+1; const da = date.getDate();
            const w = ['日','月','火','水','木','金','土'][date.getDay()];
            const cls = date.getDay()===0?'col-sun':(date.getDay()===6?'col-sat':'');
            html += `<th class="${cls}">${m}/${da}<br>${w}</th>`;
        });
        html += '</tr></thead><tbody>';
        const startH = 12; const endH = 29;
        for(let h=startH; h<endH; h++) {
            for(let min=0; min<60; min+=30) {
                const hD = h%24; const timeStr = `${hD.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
                html += `<tr><td class="time-label">${timeStr}</td>`;
                data.forEach(day => {
                    let isShift = false;
                    if(day.shift && day.shift.start && day.shift.end) {
                        const sP = day.shift.start.split(':'); const eP = day.shift.end.split(':');
                        let sV = parseInt(sP[0])*100+parseInt(sP[1]); let eV = parseInt(eP[0])*100+parseInt(eP[1]);
                        const tV = h*100+min;
                        if(sV<1000) sV+=2400; if(eV<sV) eV+=2400;
                        if(tV>=sV && tV<eV) isShift = true;
                    }
                    if(!isShift || day.bookings.includes(timeStr)) html += '<td class="cell-ng">✕</td>';
                    else html += `<td class="cell-ok" onclick="LIFF_App.selectSlot('${day.date}', '${timeStr}')">〇</td>`;
                });
                html += '</tr>';
            }
        }
        html += '</tbody></table>';
        matrix.innerHTML = html;
    },

    selectSlot: function(date, time) {
        this.bookingData.date = date; this.bookingData.time = time;
        this.switchView('view-form');
        document.getElementById('confirm-datetime').textContent = `${date} ${time}～`;
    },
    switchView: function(id) {
        ['view-list', 'view-detail', 'view-form'].forEach(v => document.getElementById(v).classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },
    loadMenu: async function() {
        const res = await this.postData('get_menu');
        const sel = document.getElementById('res-course');
        sel.innerHTML = '<option value="">▼ コースを選択してください ▼</option>';
        res.data.forEach(m => {
            if(m.type === 'course') {
                const fee = m.nomination_fee ? ` (指名料+${parseInt(m.nomination_fee).toLocaleString()}円)` : '';
                const opt = document.createElement('option'); opt.value = m.id;
                opt.textContent = `${m.name} (${m.minutes}分) - ${parseInt(m.price).toLocaleString()}円${fee}`;
                sel.appendChild(opt);
            });
    },
    submit: async function() {
        const data = {
            cast_id: this.selectedCastId, date: this.bookingData.date, time: this.bookingData.time,
            course_id: document.getElementById('res-course').value,
            customer_name: document.getElementById('res-name').value, customer_tel: document.getElementById('res-tel').value,
            line_id: 'DUMMY'
        };
        if(!data.course_id || !data.customer_name || !data.customer_tel) { alert('入力してください'); return; }
        document.getElementById('btn-submit').disabled = true;
        const res = await this.postData('save_reservation', data);
        if(res.status==='success') { alert('送信しました！'); location.reload(); }
        else { alert('エラー: '+res.message); document.getElementById('btn-submit').disabled = false; }
    }
};
document.addEventListener('DOMContentLoaded', ()=>LIFF_App.init());
