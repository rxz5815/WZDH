document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let activeSubFilters = {}; 
    let currentEngine = "https://www.baidu.com/s?wd=";
    let isSavingOrder = false; 

    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- [1. 高清小地球 & 智能竞速] ---
    const GLOBE_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7.06-3.6-7.55-7.55H5.4c.45 2.13 2.11 3.84 4.25 4.3l.35 3.25zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm6.65-5.35c-.49 3.95-3.6 7.06-7.55 7.55l.35-3.25c2.14-.46 3.8-2.17 4.25-4.3h2.95zM4.45 11.45c.49-3.95 3.6-7.06 7.55-7.55l-.35 3.25c-2.14.46-3.8 2.17-4.25 4.3H4.45zm14.15 0c-.45-2.13-2.11-3.84-4.25-4.3l.35-3.25c3.95.49 7.06 3.6 7.55 7.55h-3.65z'/%3E%3C/svg%3E`;

    async function getSmartIcon(targetUrl) {
        if (!targetUrl || targetUrl.includes('placeholder')) return GLOBE_ICON;
        let domain = "";
        try { domain = new URL(targetUrl).hostname; } catch (e) { domain = targetUrl; }
        // 优先排列国际API
        const t1 = [`https://favicon.im/?url=${domain}&size=64`, `https://favicon.vemetric.com/${domain}&size=64&format=png`, `https://favicon.is/${domain}?larger=true` ];
        const t2 = [`https://faviconsnap.com/api/favicon?url=${domain}`, `https://icons.duckduckgo.com/ip3/${domain}.ico`, `https://api.afmax.cn/so/ico/index.php?r=${targetUrl}` ];
        const check = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => (i.width > 1) ? res(url) : rej(); i.onerror = rej; i.src = url; });
        try { return await Promise.any(t1.map(check)); } catch (e) { try { return await Promise.any(t2.map(check)); } catch (e2) { return GLOBE_ICON; } }
    }

    // --- [2. 请求拆分] ---
    async function apiAdminAction(action, data) {
        let pwd = sessionStorage.getItem('auth_pwd_v9') || prompt("管理密码:");
        if (!pwd) return false;
        isSavingOrder = true;
        try {
            const res = await fetch('/api/links', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ...data, password: pwd, action }) });
            if (res.ok) {
                sessionStorage.setItem('auth_pwd_v9', pwd);
                if (action !== 'updateLinksOrder' && action !== 'updateOrder') await fetchData(); 
                isSavingOrder = false;
                return true;
            }
            if (res.status === 401) { alert("密码错误！"); sessionStorage.removeItem('auth_pwd_v9'); }
        } catch (e) { console.error(e); }
        isSavingOrder = false;
        return false;
    }

    async function apiSilentRepair(linkObj) {
        const pwd = sessionStorage.getItem('auth_pwd_v9');
        if (!pwd || isSavingOrder) return; 
        try { await fetch('/api/links', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ link: linkObj, password: pwd, action: 'save' }) }); } catch (e) {}
    }

    // --- [3. 渲染与图标替换逻辑] ---
  const grads = ['linear-gradient(to right, #0f0c29,#302b63,#24243e)',
                   'linear-gradient(to right, #667db6,#0082c8,#667db6)',
                   'linear-gradient(to right, #373b44,#4286f4)',
                   'linear-gradient(to right, #355c7d,#6c5b7b,#c06c84)',
                   'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                   'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
                   'linear-gradient(135deg, #202124 0%, #3c4043 100%)',
                   'linear-gradient(135deg, #2c3e50 0%, #4ca1af 80%)',
                   'linear-gradient(45deg, #3d2b56 0%, #8e54e9 80%)',
                   'linear-gradient(135deg, #283048 0%, #859398 80%)',
                   'linear-gradient(45deg, #1e2a38 0%, #5a7fa5 80%)',
                   'linear-gradient(135deg, #192841 0%, #607d8b 80%)',
                   'linear-gradient(45deg, #271f30 0%, #7b4397 80%)',
                   'linear-gradient(135deg, #182c39 0%, #486a78 80%)',
                   'linear-gradient(45deg, #221d2e 0%, #614e77 80%)',
                   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  ];
    
    const updateBg = (v, s = true) => { const bg = document.getElementById('bg-canvas'); if(v.startsWith('http')) bg.style.backgroundImage = `url(${v})`; else bg.style.background = v; if(s) localStorage.setItem('nav_bg_v18', v); };
    updateBg(localStorage.getItem('nav_bg_v18') || grads[0]);
    document.getElementById('btn-toggle-bg').onclick = () => updateBg(grads[(grads.indexOf(localStorage.getItem('nav_bg_v18')) + 1) % grads.length]);
    document.getElementById('btn-random-bg').onclick = async () => { const r = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`); if(r.url) updateBg(r.url); };

async function fetchData() {
    try {
        const res = await fetch('/api/links');
        const data = await res.json();
        allLinks = data.links || [];
        categoryOrder = data.order || [];
        render();
        // 关键修复：如果分类管理弹窗正开着，获取新数据后立即刷新弹窗内的列表
        if (document.getElementById('modal-cat').style.display === 'flex') {
            renderCatAdmin();
        }
    } catch (e) { render(); }
}
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        main.innerHTML = ''; nav.innerHTML = '';
        const catHint = document.getElementById('cat-hint');
        catHint.innerHTML = '<option value="">选择大分类</option>';
        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});
        let sortedCats = categoryOrder.filter(c => Object.keys(grouped).includes(c));
        Object.keys(grouped).forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            catHint.innerHTML += `<option value="${cat}">${cat}</option>`;
            const sec = document.createElement('section'); sec.id = cat;
            const subCats = [...new Set(allLinks.filter(l => l.category === cat && l.subCategory).map(l => l.subCategory))];
            const currentSub = activeSubFilters[cat] || 'all';
            let subHtml = subCats.length > 0 ? `<div class="sub-cat-filter"><span class="sub-cat-item ${currentSub === 'all' ? 'active' : ''}" data-sub="all">全部</span>${subCats.map(s => `<span class="sub-cat-item ${currentSub === s ? 'active' : ''}" data-sub="${s}">${s}</span>`).join('')}</div>` : '';
            sec.innerHTML = `<div class="category-header"><h2 class="category-title">${cat}</h2>${subHtml}</div><div class="link-grid" data-cat="${cat}" data-sub="${currentSub}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            sec.querySelectorAll('.sub-cat-item').forEach(item => {
                const switchSub = () => {
                    activeSubFilters[cat] = item.dataset.sub;
                    sec.querySelectorAll('.sub-cat-item').forEach(i => i.classList.remove('active')); item.classList.add('active'); grid.dataset.sub = item.dataset.sub;
                    grid.querySelectorAll('.link-card').forEach(card => card.style.display = (item.dataset.sub === 'all' || card.dataset.sub === item.dataset.sub) ? '' : 'none');
                };
                item.onclick = item.onmouseenter = switchSub;
            });

            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                e.preventDefault(); grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const idx = allLinks.findIndex(l => l.url === url);
                if (idx > -1) {

                const item = allLinks.splice(idx, 1)[0];
                    const oldCat = item.category; 
                    item.category = cat;         
                    const sub = grid.dataset.sub; 

                    if (sub !== 'all') {
                        // 场景1：拖进具体的子分类（如 B3），无论从哪来，都变 B3
                        item.subCategory = sub;
                    } else if (oldCat !== cat) {
                        // 场景2：跨了大类拖进“全部”视图，必须清除子分类，防止数据错乱
                        item.subCategory = "";
                    }
                    // 场景3：同大类内“全部”视图拖动，保留原 subCategory，只改排序
                    
                    let ins = -1;
                    for (let i = allLinks.length - 1; i >= 0; i--) { if (allLinks[i].category === cat && (sub === 'all' || allLinks[i].subCategory === sub)) { ins = i + 1; break; } }
                    if (ins === -1) allLinks.push(item); else allLinks.splice(ins, 0, item);
                    render(); 
                    await apiAdminAction('updateLinksOrder', { link: allLinks }); 
                }
            };
(grouped[cat] || []).forEach(l => {
    const card = createCard(l);
    // 关键修复：如果当前分类处于子分类筛选模式，隐藏不属于该子分类的卡片
    if (currentSub !== 'all' && l.subCategory !== currentSub) {
        card.style.display = 'none';
    }
    grid.appendChild(card);
});            main.appendChild(sec);
        });
    }

    function createCard(l) {
        const card = document.createElement('div');
        card.className = 'link-card'; card.draggable = true;
        card.dataset.sub = l.subCategory || "";
        if (l.desc) card.setAttribute('data-desc', l.desc);

        // 如果没有图标，或者还是旧的谷歌地址，先用地球
        const needsRepair = !l.icon || l.icon.includes('google.com');
        card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${needsRepair ? GLOBE_ICON : l.icon}" class="site-icon"><h3>${l.title}</h3>`;
        const img = card.querySelector('.site-icon');

        const repairIcon = async () => {
            const betterUrl = await getSmartIcon(l.url);
            if (betterUrl && betterUrl !== GLOBE_ICON) {
                img.src = betterUrl;
                // --- 核心逻辑：只有国际加速API才允许存入数据库 ---
                const isGlobal = ['favicon.im', 'vemetric.com', 'favicon.is'].some(api => betterUrl.includes(api));
                if (isGlobal) {
                    l.icon = betterUrl; 
                    apiSilentRepair(l); 
                }
            }
        };

        img.onerror = () => { if(img.src !== GLOBE_ICON) repairIcon(); };
        if (needsRepair) repairIcon();

        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', l.url); card.classList.add('dragging'); };
        card.ondragend = () => card.classList.remove('dragging');
        card.ondragover = e => { e.preventDefault(); if (document.querySelector('.dragging') !== card) card.classList.add('drag-insert-before'); };
        card.ondragleave = () => card.classList.remove('drag-insert-before');
        card.ondrop = async (e) => {
            e.preventDefault(); e.stopPropagation();
            card.classList.remove('drag-insert-before');
            const dragUrl = e.dataTransfer.getData('text/plain');
            if (dragUrl === l.url) return;
            const idx = allLinks.findIndex(x => x.url === dragUrl);
            if (idx === -1) return;
            
            const item = allLinks.splice(idx, 1)[0];
            const oldCat = item.category;           
            const targetCat = l.category;           
            const grid = card.closest('.link-grid');
            const sub = grid.dataset.sub;           

            item.category = targetCat;              
            if (sub !== 'all') {
                // 拖到 B3 分类下的某个卡片上，站点变 B3
                item.subCategory = sub;
            } else if (oldCat !== targetCat) {
                // 拖到 B 大类“全部”视图的某个卡片上，清空子分类
                item.subCategory = "";
            }
            
            allLinks.splice(allLinks.findIndex(x => x.url === l.url), 0, item);
            render(); 
            await apiAdminAction('updateLinksOrder', { link: allLinks });
        };
        return card;
    }

    // --- [4. 搜索与弹窗逻辑] ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel), inp = box.querySelector('.search-input'), engineBar = box.querySelector('.search-engines'), isModal = boxSel.includes('modal'), resultsArea = document.getElementById('modal-results-area');
        inp.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase(), isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(!isInt) return;
            if (q.length === 0) { if(isModal) resultsArea.innerHTML = ''; else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); } return; }
            if(isModal) { resultsArea.innerHTML = ''; allLinks.filter(l => l.title !== 'placeholder_hidden' && l.title.toLowerCase().includes(q)).forEach(l => resultsArea.appendChild(createCard(l))); }
            else { document.body.classList.add('is-searching'); document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? 'block' : 'none'); document.querySelectorAll('section').forEach(sec => sec.style.display = Array.from(sec.querySelectorAll('.link-card')).some(c => c.style.display !== 'none') ? 'block' : 'none'); }
        });
        const confirmSearch = () => { const q = inp.value.trim(), isInt = box.querySelector('.tab.active').dataset.type === 'internal'; if(q && !isInt) window.open(currentEngine + encodeURIComponent(q), '_blank'); };
        box.querySelector('.search-trigger-btn').onclick = confirmSearch;
        inp.onkeydown = e => { if(e.key === 'Enter') confirmSearch(); };
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
            const isInt = t.dataset.type === 'internal'; engineBar && (engineBar.style.display = isInt ? 'none' : 'flex');
            inp.placeholder = isInt ? "快速检索站内..." : "输入搜索内容"; inp.value = ""; if(isModal) resultsArea.innerHTML = ''; else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); } inp.focus();
        });
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');
    document.body.addEventListener('click', e => { if(e.target.classList.contains('engine')) { document.querySelectorAll('.engine').forEach(x => x.classList.remove('active')); e.target.classList.add('active'); currentEngine = e.target.dataset.url; } });
    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); document.getElementById('modal-results-area').innerHTML = ''; });

window.openEdit = (l = {}) => {
        const modal = document.getElementById('modal-link');
        modal.style.display = 'flex';

        // 1. 动态改标题：判断是“添加”还是“编辑”
        const isEdit = l.title && l.title !== 'placeholder_hidden';
        modal.querySelector('.modal-title-center').textContent = isEdit ? "编辑站点" : "添加站点";

        // 2. 填充内容
        document.getElementById('in-title').value = isEdit ? l.title : '';
        document.getElementById('in-desc').value = l.desc || '';
        
        // 3. 核心：强制触发分类联动，确保小分类下拉框有数据
        const catSelect = document.getElementById('cat-hint');
        catSelect.value = l.category || '';
        updateSubCatDropdown(l.category || '', l.subCategory || '');
        
        const urlInput = document.getElementById('in-url'), prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url && !l.url.includes('placeholder')) ? l.url : '';
        
        if (l.icon) { 
            prevImg.src = l.icon; 
            prevImg.classList.add('loaded'); 
        } else { 
            prevImg.src = ''; 
            prevImg.classList.remove('loaded'); 
        }
    };
    function updateSubCatDropdown(catName, selectedSub = "") {
        const subCatHint = document.getElementById('sub-cat-hint');
        subCatHint.innerHTML = '<option value="">选择二级小类</option>';
        if (!catName) return;
        [...new Set(allLinks.filter(l => l.category === catName && l.subCategory).map(l => l.subCategory))].forEach(s => {
            const opt = document.createElement('option'); opt.value = s; opt.textContent = s; if (s === selectedSub) opt.selected = true; subCatHint.appendChild(opt);
        });
    }

    document.getElementById('in-url').oninput = async function() {
        const val = this.value.trim(), prevImg = document.getElementById('prev-img');
        if (!val || !val.startsWith('http')) { prevImg.src = ''; prevImg.classList.remove('loaded'); return; }
        prevImg.src = await getSmartIcon(val); prevImg.classList.add('loaded');
    };

    document.getElementById('btn-cat-admin').onclick = () => { renderCatAdmin(); document.getElementById('modal-cat').style.display = 'flex'; };

    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box'); if (!box) return; box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c)); cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });
        sortedCats.forEach((c, idx) => {
            const row = document.createElement('div'); row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `<i class="fas fa-bars drag-handle"></i><input type="text" value="${c}"><div class="row-btns"><button class="btn-mini blue" onclick="addSubCat('${c}')">+子类</button><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button></div>`;
            row.ondragstart = (e) => { e.dataTransfer.setData('cat-idx', idx); row.style.opacity = '0.5'; };
            row.ondragend = () => row.style.opacity = '1'; row.ondragover = e => e.preventDefault();
            row.ondrop = async (e) => {
                e.preventDefault(); const from = e.dataTransfer.getData('cat-idx'); if (from === "" || parseInt(from) === idx) return;
                const newOrder = [...sortedCats]; const [moved] = newOrder.splice(parseInt(from), 1); newOrder.splice(idx, 0, moved);
                categoryOrder = newOrder; render(); renderCatAdmin(); await apiAdminAction('updateOrder', { order: categoryOrder });
            };
            box.appendChild(row);
            const subs = [...new Set(allLinks.filter(l => l.category === c && l.subCategory).map(l => l.subCategory))];
            if (subs.length > 0) {
                const subBox = document.createElement('div'); subBox.className = 'sub-cat-admin-list';
                subs.forEach((s) => {
                    const sRow = document.createElement('div'); sRow.className = 'sub-cat-row'; sRow.draggable = true;
                    sRow.innerHTML = `<i class="fas fa-bars drag-handle" style="font-size:12px; opacity:0.5;"></i><input type="text" value="${s}"><div class="row-btns"><button class="btn-mini blue" onclick="renameSubCat('${c}', '${s}', this)">改名</button><button class="btn-mini red" onclick="deleteSubCat('${c}', '${s}')">删除</button></div>`;
                    sRow.ondragstart = (e) => { e.stopPropagation(); e.dataTransfer.setData('sub-parent', c); e.dataTransfer.setData('sub-name', s); sRow.style.opacity = '0.5'; };
                    sRow.ondragend = () => sRow.style.opacity = '1'; sRow.ondragover = e => e.preventDefault();
                    sRow.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation(); const pCat = e.dataTransfer.getData('sub-parent'), fSub = e.dataTransfer.getData('sub-name');
                        if (pCat !== c || fSub === s) return;
                        const otherLinks = allLinks.filter(l => !(l.category === c && l.subCategory === fSub));
                        const moving = allLinks.filter(l => l.category === c && l.subCategory === fSub);
                        otherLinks.splice(otherLinks.findIndex(l => l.category === c && l.subCategory === s), 0, ...moving);
                        allLinks = otherLinks; render(); renderCatAdmin(); await apiAdminAction('updateLinksOrder', { link: allLinks });
                    };
                    subBox.appendChild(sRow);
                });
                box.appendChild(subBox);
            }
        });
    }

    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiAdminAction('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiAdminAction('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`确定要删除分类 "${cat}" 及其所有站点吗？`) && apiAdminAction('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => { const n = document.getElementById('new-cat-input').value.trim(); if(n) apiAdminAction('addCategory', { newCategory: n }).then(() => document.getElementById('new-cat-input').value = ''); };
    window.addSubCat = p => { const n = prompt(`为 "${p}" 添加子分类:`); if(n) apiAdminAction('addSubCategory', { parentCategory: p, newSubCategory: n }); };
    window.renameSubCat = (p, o, btn) => { const n = btn.closest('.sub-cat-row').querySelector('input').value.trim(); if(n && n !== o) apiAdminAction('renameSubCategory', { parentCategory: p, oldSubCategory: o, newSubCategory: n }); };
    window.deleteSubCat = (parent, sub) => { if(confirm(`确定删除子分类 "${sub}" 吗？`)) { if (activeSubFilters[parent] === sub) activeSubFilters[parent] = 'all'; apiAdminAction('deleteSubCategory', { parentCategory: parent, oldSubCategory: sub }); } };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault(); const data = Object.fromEntries(new FormData(this));
        if (!data.category) return alert("请选择一个分类！");
        data.icon = document.getElementById('prev-img').src;
        if(await apiAdminAction('save', { link: data })) document.getElementById('modal-link').style.display = 'none';
    };

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => { document.getElementById('modal-search').style.display='flex'; setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100); };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => { const y = window.scrollY; document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none'; };
});
