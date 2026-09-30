export const emptyProduct = {
  name: '',
  category: 'Casa',
  price: 0,
  stock_quantity: 0,
  allow_preorder: true,
  photo_visible: true,
  admin_file_url: '',
  color: '',
  material: 'PLA',
  dimensions: '',
  production: '3 a 5 dias úteis',
  colors: '',
  image: '',
  desc: '',
  details: '',
  badge: '',
  active: true,
}

export const slugify = value =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const fromDbProduct = item => ({
  ...item,
  desc: item.description || '',
  stock_quantity: Number(item.stock_quantity || 0),
  allow_preorder: item.allow_preorder !== false,
  photo_visible: item.photo_visible !== false,
  admin_file_url: item.admin_file_url || '',
  active: item.active !== false,
})

export const toDbProduct = product => ({
  id: product.id,
  slug: product.slug || slugify(product.name),
  name: product.name,
  category: product.category,
  price: Number(product.price),
  stock_quantity: Math.max(0, Number(product.stock_quantity || 0)),
  allow_preorder: product.allow_preorder !== false,
  photo_visible: product.photo_visible !== false,
  admin_file_url: product.admin_file_url || null,
  color: product.color || '',
  badge: product.badge || '',
  image: product.image || '',
  description: product.desc || '',
  details: product.details || '',
  material: product.material || 'PLA',
  dimensions: product.dimensions || '',
  production: product.production || '',
  colors: product.colors || '',
  active: product.active !== false,
})
