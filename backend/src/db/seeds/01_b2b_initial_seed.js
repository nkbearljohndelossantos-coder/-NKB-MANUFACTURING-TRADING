const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // 1. Seed Categories if empty
  const categoryCount = await knex('b2b_categories').count('id as count').first();
  if (Number(categoryCount.count) === 0) {
    await knex('b2b_categories').insert([
      { name: 'Skin Care', description: 'Face and body lotions, creams, serums' },
      { name: 'Hair Care', description: 'Shampoos, conditioners, hair treatments' },
      { name: 'Cosmetics', description: 'Foundations, concealers, lipsticks' },
      { name: 'Sun Care', description: 'Sunscreen, UV protection formulations' }
    ]);
  }

  // 2. Seed Master Products if empty
  const productCount = await knex('b2b_products').count('id as count').first();
  if (Number(productCount.count) === 0) {
    const skinCat = await knex('b2b_categories').where('name', 'Skin Care').first();
    const sunCat = await knex('b2b_categories').where('name', 'Sun Care').first();

    const [lotionId] = await knex('b2b_products').insert({
      sku: 'LOT-001',
      product_name: 'Hydrating Body Lotion 500ml',
      description: 'Moisturizing Aloe & Vitamin E Body Lotion for B2B Retail Distribution',
      category_id: skinCat ? skinCat.id : null,
      category_name: 'Skin Care',
      unit_of_measure: 'bottle',
      unit_price: 100.00,
      cost_price: 45.00,
      current_stock: 10000,
      minimum_stock: 500,
      is_active: 1
    });

    const [sunscreenId] = await knex('b2b_products').insert({
      sku: 'SUN-002',
      product_name: 'Hydrating Sunscreen SPF 50+ 100ml',
      description: 'Broad spectrum UV barrier sunscreen',
      category_id: sunCat ? sunCat.id : null,
      category_name: 'Sun Care',
      unit_of_measure: 'tube',
      unit_price: 180.00,
      cost_price: 75.00,
      current_stock: 5000,
      minimum_stock: 300,
      is_active: 1
    });

    const [serumId] = await knex('b2b_products').insert({
      sku: 'SER-003',
      product_name: 'Niacinamide Glow Serum 30ml',
      description: 'Concentrated 10% Niacinamide brightening serum',
      category_id: skinCat ? skinCat.id : null,
      category_name: 'Skin Care',
      unit_of_measure: 'bottle',
      unit_price: 250.00,
      cost_price: 90.00,
      current_stock: 4000,
      minimum_stock: 200,
      is_active: 1
    });

    // Seed Batches
    if (lotionId) {
      await knex('b2b_product_batches').insert([
        {
          product_id: lotionId,
          batch_number: 'LOT-2026-B1',
          manufacturing_date: '2026-01-15',
          expiration_date: '2028-01-15',
          quantity_available: 6000
        },
        {
          product_id: lotionId,
          batch_number: 'LOT-2026-B2',
          manufacturing_date: '2026-02-10',
          expiration_date: '2028-02-10',
          quantity_available: 4000
        }
      ]);
    }
  }

  // 3. Seed Sample Client: ABC Cosmetics
  const clientCount = await knex('b2b_clients').count('id as count').first();
  let clientAbcId;
  if (Number(clientCount.count) === 0) {
    [clientAbcId] = await knex('b2b_clients').insert({
      client_code: 'CLI-001',
      company_name: 'ABC Cosmetics Distribution Inc.',
      tin_number: '123-456-789-000',
      contact_person: 'Maria Santos',
      email: 'client@abccosmetics.com',
      phone: '+63 917 123 4567',
      billing_address: 'Suite 808, Enterprise Tower, Ayala Ave, Makati City, Metro Manila',
      delivery_address: 'Warehouse 4, NKB Industrial Park, Santa Rosa, Laguna',
      credit_limit: 500000.00,
      payment_terms: '30 Days',
      credit_status: 'Good',
      credit_control_action: 'Require Approval',
      current_balance: 0.00,
      is_active: 1
    });

    await knex('b2b_clients').insert({
      client_code: 'CLI-002',
      company_name: 'Glow Beauty Labs Philippines',
      tin_number: '987-654-321-000',
      contact_person: 'John Dela Cruz',
      email: 'orders@glowbeautylabs.ph',
      phone: '+63 918 765 4321',
      billing_address: 'Unit 12B, Prestige Center, Ortigas, Pasig City',
      delivery_address: 'Block 3 Lot 8, Cavite Light Industrial Park, Silang, Cavite',
      credit_limit: 750000.00,
      payment_terms: '15 Days',
      credit_status: 'Good',
      credit_control_action: 'Require Approval',
      current_balance: 0.00,
      is_active: 1
    });
  } else {
    const c = await knex('b2b_clients').where('client_code', 'CLI-001').first();
    if (c) clientAbcId = c.id;
  }

  // 4. Seed Standard Enterprise Users with Role-Based Access
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const staffUsers = [
    { username: 'admin', full_name: 'System Administrator', email: 'admin@nkbmanufacturing.com', role: 'ADMIN' },
    { username: 'manager', full_name: 'Operations Manager', email: 'manager@nkbmanufacturing.com', role: 'MANAGER' },
    { username: 'sales', full_name: 'Senior Sales Executive', email: 'sales@nkbmanufacturing.com', role: 'SALES' },
    { username: 'warehouse', full_name: 'Warehouse Logistics Supervisor', email: 'warehouse@nkbmanufacturing.com', role: 'WAREHOUSE' },
    { username: 'accounting', full_name: 'Chief Accountant', email: 'accounting@nkbmanufacturing.com', role: 'ACCOUNTING' },
    { username: 'client_abc', full_name: 'Maria Santos (ABC Cosmetics)', email: 'client@abccosmetics.com', role: 'CLIENT', client_id: clientAbcId }
  ];

  for (const u of staffUsers) {
    const existing = await knex('users').where('username', u.username).first();
    if (!existing) {
      await knex('users').insert({
        username: u.username,
        password: defaultPasswordHash,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        client_id: u.client_id || null,
        status: 1
      });
    }
  }

  console.log('[SEED] B2B master data, cosmetic products, clients, and role users seeded.');
};
