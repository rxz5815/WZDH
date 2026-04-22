export async function onRequest(context) {
  const { request, env } = context;
  const { password, link, action, oldCategory, newCategory, order } = await request.json().catch(() => ({}));

  if (request.method === 'GET') {
    const links = await env.LINKS_KV.get('all_links');
    const catOrder = await env.LINKS_KV.get('category_order');
    return new Response(JSON.stringify({
      links: JSON.parse(links || '[]'),
      order: JSON.parse(catOrder || '[]')
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (password !== env.EDIT_PASSWORD) return new Response('Unauthorized', { status: 401 });

  // 处理排序更新
  if (action === 'updateOrder') {
    await env.LINKS_KV.put('category_order', JSON.stringify(order));
    return new Response('OK', { status: 200 });
  }

  let links = JSON.parse(await env.LINKS_KV.get('all_links') || '[]');

  if (action === 'delete') {
    links = links.filter(l => l.url !== link.url);
  } else if (action === 'renameCategory') {
    links = links.map(l => l.category === oldCategory ? { ...l, category: newCategory } : l);
  } else if (action === 'deleteCategory') {
    links = links.filter(l => l.category !== oldCategory);
  } else if (action === 'addCategory') {
    links.push({ category: newCategory, title: 'placeholder_hidden', url: 'https://placeholder' + Math.random(), icon: '' });
  } else {
    links = links.filter(l => l.title !== 'placeholder_hidden');
    const idx = links.findIndex(l => l.url === link.url);
    if (idx > -1) links[idx] = link;
    else links.push(link);
  }

  await env.LINKS_KV.put('all_links', JSON.stringify(links));
  return new Response('OK', { status: 200 });
}
