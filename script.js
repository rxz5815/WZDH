document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let activeSubFilters = {}; 
    let currentEngine = "https://www.baidu.com/s?wd=";
    
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const grads = [
        'linear-gradient(to right, #667db6,#0082c8,#667db6)',
        'linear-gradient(to right, #373b44,#4286f4)',
        'linear-gradient(to right, #355c7d,#6c5b7b,#c06c84)',
        'linear-gradient(to right, #0f0c29,#302b63,#24243e)',
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

    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v18', val);
    };
    updateBg(localStorage.getItem('nav_bg_v18') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v18');
        let nextIdx = (grads.indexOf(curr) + 1) % grads.length;
        updateBg(grads[nextIdx]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links || [];
            categoryOrder = data.order || [];
            render(); 
            if (document.getElementById('modal-cat').style.display === 'flex') {
                renderCatAdmin();
            }
        } catch (e) { render(); }
    }
    fetchData();

    const catHint = document.getElementById('cat-hint');
    const subCatHint = document.getElementById('sub-cat-hint');
    catHint.onchange = () => updateSubCatDropdown(catHint.value);

    function updateSubCatDropdown(catName, selectedSub = "") {
        subCatHint.innerHTML = '<option value="">选择二级小类</option>';
        if (!catName) return;
        const subs = [...new Set(allLinks.filter(l => l.category === catName && l.subCategory).map(l => l.subCategory))];
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            if (s === selectedSub) opt.selected = true;
            subCatHint.appendChild(opt);
        });
    }

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        main.innerHTML = ''; nav.innerHTML = '';
        catHint.innerHTML = '<option value="">选择大分类</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        let cats = Object.keys(grouped);
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            catHint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            const subCats = [...new Set(allLinks.filter(l => l.category === cat && l.subCategory).map(l => l.subCategory))];
            const currentSub = activeSubFilters[cat] || 'all';

            let subFilterHtml = '';
            if (subCats.length > 0) {
                subFilterHtml = `<div class="sub-cat-filter">
                    <span class="sub-cat-item ${currentSub === 'all' ? 'active' : ''}" data-sub="all">全部</span>
                    ${subCats.map(s => `<span class="sub-cat-item ${currentSub === s ? 'active' : ''}" data-sub="${s}">${s}</span>`).join('')}
                </div>`;
            }

            sec.innerHTML = `<div class="category-header"><h2 class="category-title">${cat}</h2>${subFilterHtml}</div><div class="link-grid" data-cat="${cat}" data-sub="${currentSub}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
// 绑定子分类切换逻辑：支持点击 + 鼠标划过
            sec.querySelectorAll('.sub-cat-item').forEach(item => {
                const switchSub = () => {
                    const subTarget = item.dataset.sub;
                    // 如果已经是当前选中的，则不重复执行，防止闪烁
                    if (activeSubFilters[cat] === subTarget && item.classList.contains('active')) return;

                    activeSubFilters[cat] = subTarget; 
                    sec.querySelectorAll('.sub-cat-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    grid.dataset.sub = subTarget;
    
                    grid.querySelectorAll('.link-card').forEach(card => {
                        card.style.display = (subTarget === 'all' || card.dataset.sub === subTarget) ? '' : 'none';
                    });
                };

                item.onclick = switchSub;      // 保留点击，兼容移动端
                item.onmouseenter = switchSub; // 核心优化：鼠标移入即触发切换
            });

            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async function(e) {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const itemIdx = allLinks.findIndex(l => l.url === url);
                if (itemIdx > -1) {
                    const item = allLinks.splice(itemIdx, 1)[0];
                    const oldCat = item.category;
                    item.category = cat;
                    const currentSub = grid.dataset.sub;
                    if (currentSub !== 'all') item.subCategory = currentSub;
                    else if (oldCat !== cat) item.subCategory = ""; 

                    let insertIdx = -1;
                    for (let i = allLinks.length - 1; i >= 0; i--) {
                        if (allLinks[i].category === cat && (currentSub === 'all' || allLinks[i].subCategory === currentSub)) {
                            insertIdx = i + 1; break;
                        }
                    }
                    if (insertIdx === -1) allLinks.push(item);
                    else allLinks.splice(insertIdx, 0, item);
                    render(); apiReq('updateLinksOrder', { link: allLinks }, true);
                }
            };

            (grouped[cat] || []).forEach(l => {
                const card = createCard(l);
                if (currentSub !== 'all' && l.subCategory !== currentSub) card.style.display = 'none';
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    function createCard(l) {
        const card = document.createElement('div');
        card.className = 'link-card'; card.draggable = true;
        card.dataset.sub = l.subCategory || "";
        if (l.desc) card.setAttribute('data-desc', l.desc);
        card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };

        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', l.url); card.classList.add('dragging'); };
        card.ondragend = () => card.classList.remove('dragging');
        card.ondragover = e => { e.preventDefault(); if (document.querySelector('.dragging') !== card) card.classList.add('drag-insert-before'); };
        card.ondragleave = () => card.classList.remove('drag-insert-before');

        card.ondrop = async (e) => {
            e.preventDefault(); e.stopPropagation();
            card.classList.remove('drag-insert-before');
            const draggedUrl = e.dataTransfer.getData('text/plain');
            if (draggedUrl === l.url) return;
            const draggedIdx = allLinks.findIndex(x => x.url === draggedUrl);
            if (draggedIdx === -1) return;
            const item = allLinks.splice(draggedIdx, 1)[0];
            const oldCat = item.category;
            const grid = card.closest('.link-grid');
            const currentSub = grid.dataset.sub;
            item.category = l.category;
            if (currentSub !== 'all') item.subCategory = currentSub;
            else if (oldCat !== l.category) item.subCategory = "";
            const newTargetIdx = allLinks.findIndex(x => x.url === l.url);
            allLinks.splice(newTargetIdx, 0, item);
            render(); apiReq('updateLinksOrder', { link: allLinks }, true);
        };
        return card;
    }

    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engineBar = box.querySelector('.search-engines');
        const isModal = boxSel.includes('modal');
        const resultsArea = document.getElementById('modal-results-area');

        inp.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(!isInt) return;
            if (q.length === 0) {
                if(isModal) resultsArea.innerHTML = '';
                else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); }
                return;
            }
            if(isModal) {
                resultsArea.innerHTML = '';
                allLinks.filter(l => l.title !== 'placeholder_hidden' && l.title.toLowerCase().includes(q)).forEach(l => resultsArea.appendChild(createCard(l)));
            } else {
                document.body.classList.add('is-searching');
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? 'block' : 'none');
                document.querySelectorAll('section').forEach(sec => {
                    sec.style.display = Array.from(sec.querySelectorAll('.link-card')).some(c => c.style.display !== 'none') ? 'block' : 'none';
                });
            }
        });

        const confirmSearch = () => {
            const q = inp.value.trim();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(q && !isInt) window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        box.querySelector('.search-trigger-btn').onclick = confirmSearch;
        inp.onkeydown = e => { if(e.key === 'Enter') confirmSearch(); };
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const isInt = t.dataset.type === 'internal';
            if(engineBar) engineBar.style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站内..." : "输入搜索内容";
            inp.value = ""; if(isModal) resultsArea.innerHTML = '';
            else { document.body.classList.remove('is-searching'); document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); }
            inp.focus();
        });
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.body.addEventListener('click', e => {
        if(e.target.classList.contains('engine')) {
            document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active'); currentEngine = e.target.dataset.url;
        }
    });

    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-results-area').innerHTML = '';
    });

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-desc').value = l.desc || '';
        catHint.value = l.category || '';
        updateSubCatDropdown(l.category || '', l.subCategory || '');
        const urlInput = document.getElementById('in-url');
        const prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        if (l.icon && l.icon !== '') { prevImg.src = l.icon; prevImg.classList.add('loaded'); }
        else { prevImg.src = ''; prevImg.classList.remove('loaded'); }
    };

    document.getElementById('in-url').oninput = function() {
        const val = this.value.trim();
        const prevImg = document.getElementById('prev-img');
        if (!val || !val.startsWith('http')) { prevImg.src = ''; prevImg.classList.remove('loaded'); return; }
        try {
            const domain = new URL(val).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const tempImg = new Image(); tempImg.src = iconUrl;
            tempImg.onload = () => { prevImg.src = iconUrl; prevImg.classList.add('loaded'); };
            tempImg.onerror = () => { prevImg.src = ''; prevImg.classList.remove('loaded'); };
        } catch (e) { }
    };

    document.getElementById('btn-cat-admin').onclick = () => { renderCatAdmin(); document.getElementById('modal-cat').style.display = 'flex'; };

    
function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        if (!box) return;
        box.innerHTML = '';
        
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            // --- 大类行 ---
            const row = document.createElement('div');
            row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `
                <i class="fas fa-bars drag-handle"></i>
                <input type="text" value="${c}">
                <div class="row-btns">
                    <button class="btn-mini blue" onclick="addSubCat('${c}')">+子类</button>
                    <button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button>
                    <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
                </div>`;
            
            row.ondragstart = (e) => { e.dataTransfer.setData('cat-idx', idx); row.style.opacity = '0.5'; };
            row.ondragend = () => row.style.opacity = '1';
            row.ondragover = e => e.preventDefault();
            row.ondrop = async (e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData('cat-idx');
                if (from === "") return;
                const fromIdx = parseInt(from);
                if (fromIdx === idx) return;
                const newOrder = [...sortedCats];
                const [movedItem] = newOrder.splice(fromIdx, 1);
                newOrder.splice(idx, 0, movedItem);
                categoryOrder = newOrder;
                render();
                renderCatAdmin();
                apiReq('updateOrder', { order: categoryOrder }, true);
            };
            box.appendChild(row);

            // --- 子类列表渲染 ---
            const subCats = [...new Set(allLinks
                .filter(l => l.category === c && l.subCategory)
                .map(l => l.subCategory)
            )];

            if (subCats.length > 0) {
                const subBox = document.createElement('div');
                subBox.className = 'sub-cat-admin-list';
                subCats.forEach((s) => {
                    const sRow = document.createElement('div');
                    sRow.className = 'sub-cat-row';
                    sRow.draggable = true; 
                    sRow.innerHTML = `
                        <i class="fas fa-bars drag-handle" style="font-size:12px; opacity:0.5;"></i>
                        <input type="text" value="${s}">
                        <div class="row-btns">
                            <button class="btn-mini blue" onclick="renameSubCat('${c}', '${s}', this)">改名</button>
                            <button class="btn-mini red" onclick="deleteSubCat('${c}', '${s}')">删除</button>
                        </div>`;
                    
                    sRow.ondragstart = (e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('sub-parent', c);
                        e.dataTransfer.setData('sub-name', s);
                        sRow.style.opacity = '0.5';
                    };
                    sRow.ondragend = () => sRow.style.opacity = '1';
                    sRow.ondragover = e => e.preventDefault();
                    sRow.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const pCat = e.dataTransfer.getData('sub-parent');
                        const fSub = e.dataTransfer.getData('sub-name');
                        if (pCat !== c || fSub === s) return;

                        const otherLinks = allLinks.filter(l => !(l.category === c && l.subCategory === fSub));
                        const movingLinks = allLinks.filter(l => l.category === c && l.subCategory === fSub);
                        const tPos = otherLinks.findIndex(l => l.category === c && l.subCategory === s);
                        otherLinks.splice(tPos, 0, ...movingLinks);
                        allLinks = otherLinks;

                        render();
                        renderCatAdmin();
                        apiReq('updateLinksOrder', { link: allLinks }, true);
                    };
                    subBox.appendChild(sRow);
                });
                box.appendChild(subBox);
            }
        });
    }

    async function apiReq(action, data, noRefresh = false) {
        let pwd = sessionStorage.getItem('auth_pwd_v9') || prompt("管理密码:");
        if(!pwd) return false;
        const res = await fetch('/api/links', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ...data, password: pwd, action }) });
        if(res.ok) { sessionStorage.setItem('auth_pwd_v9', pwd); if(!noRefresh) await fetchData(); return true; }
        if(res.status === 401) { alert("密码错误！"); sessionStorage.removeItem('auth_pwd_v9'); }
        return false;
    }

    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`确定要删除分类 "${cat}" 及其所有站点吗？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const n = document.getElementById('new-cat-input').value.trim();
        if(n) apiReq('addCategory', { newCategory: n }).then(() => document.getElementById('new-cat-input').value = '');
    };
    window.addSubCat = p => { const n = prompt(`为 "${p}" 添加子分类:`); if(n) apiReq('addSubCategory', { parentCategory: p, newSubCategory: n }); };
    window.renameSubCat = (p, o, btn) => { const n = btn.closest('.sub-cat-row').querySelector('input').value.trim(); if(n && n !== o) apiReq('renameSubCategory', { parentCategory: p, oldSubCategory: o, newSubCategory: n }); };
    
    window.deleteSubCat = (parent, sub) => {
        if(confirm(`确定删除子分类 "${sub}" 吗？其下站点将失去子分类属性。`)) {
            if (activeSubFilters[parent] === sub) {
                activeSubFilters[parent] = 'all';
            }
            apiReq('deleteSubCategory', { parentCategory: parent, oldSubCategory: sub });
        }
    };
    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault(); const data = Object.fromEntries(new FormData(this));
        if (!data.category) return alert("请选择一个分类！");
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display = 'none';
    };

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => { document.getElementById('modal-search').style.display='flex'; setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100); };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});
