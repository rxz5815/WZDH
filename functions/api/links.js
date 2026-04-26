export async function onRequest(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const { password, link, action, oldCategory, newCategory, order, parentCategory, oldSubCategory, newSubCategory } = body;

  if (request.method === 'GET') {
    const links = await env.LINKS_KV.get('all_links');
    const catOrder = await env.LINKS_KV.get('category_order');
    return new Response(JSON.stringify({
      links: JSON.parse(links || '[]'),
      order: JSON.parse(catOrder || '[]')
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (password !== env.EDIT_PASSWORD) return new Response('Unauthorized', { status: 401 });

  // 排序更新
  if (action === 'updateOrder') {
    await env.LINKS_KV.put('category_order', JSON.stringify(order));
    return new Response('OK', { status: 200 });
  }

  if (action === 'updateLinksOrder') {
    await env.LINKS_KV.put('all_links', JSON.stringify(link)); 
    return new Response('OK', { status: 200 });
  }

  let links = JSON.parse(await env.LINKS_KV.get('all_links') || '[]');

  switch (action) {
    case 'delete':
      links = links.filter(l => l.url !== link.url);
      break;

    case 'renameCategory':
      links = links.map(l => l.category === oldCategory ? { ...l, category: newCategory } : l);
      break;

    case 'deleteCategory':
      links = links.filter(l => l.category !== oldCategory);
      break;

    case 'addCategory':
      links.push({ category: newCategory, title: 'placeholder_hidden', url: 'https://placeholder' + Math.random(), icon: '' });
      break;

    // --- 新增：二级分类逻辑 ---
    case 'addSubCategory':
      links.push({ 
        category: parentCategory, 
        subCategory: newSubCategory, 
        title: 'placeholder_hidden', 
        url: 'https://placeholder_sub' + Math.random(), 
        icon: '' 
      });
      break;

    case 'renameSubCategory':
      links = links.map(l => (l.category === parentCategory && l.subCategory === oldSubCategory) ? { ...l, subCategory: newSubCategory } : l);
      break;

case 'deleteSubCategory':
  // 1. 将该子分类下的真实站点变回普通站点
  links = links.map(l => (l.category === parentCategory && l.subCategory === oldSubCategory) ? { ...l, subCategory: "" } : l);
  // 2. 只删除属于当前大类、且名字匹配的那个子分类占位符
  links = links.filter(l => !(l.title === 'placeholder_hidden' && l.category === parentCategory && l.subCategory === oldSubCategory));
  break;

case 'save':
      // 保留空分类的支撑
      const idx = links.findIndex(l => l.url === link.url);
      if (idx > -1) links[idx] = link;
      else links.push(link);
      break;
  }

  await env.LINKS_KV.put('all_links', JSON.stringify(links));
  return new Response('OK', { status: 200 });
}
