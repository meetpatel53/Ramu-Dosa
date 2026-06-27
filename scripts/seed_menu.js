import { createClient } from '@supabase/supabase-js'
import { menuData } from '../src/data.js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedData() {
  console.log('Starting migration...')

  // Clear existing database records
  console.log('Clearing old categories and menu items...')
  const { error: clearError } = await supabase
    .from('categories')
    .delete()
    .gt('id', 0)

  if (clearError) {
    console.error('Error clearing old categories:', clearError.message)
    return
  }
  console.log('Database cleared.')

  for (const cat of menuData) {
    console.log(`Processing category: ${cat.category}`)

    // 1. Insert Category
    const { data: category, error: catError } = await supabase
      .from('categories')
      .upsert({ 
        name: cat.category, 
        is_chinese: !!cat.isChinese 
      }, { onConflict: 'name' })
      .select()
      .single()

    if (catError) {
      console.error(`Error inserting category ${cat.category}:`, catError.message)
      continue
    }

    // 2. Insert Items
    const itemsToInsert = cat.items.map(item => ({
      category_id: category.id,
      name: item.name,
      description: item.description || null,
      price: item.price || null,
      half_price: item.half || null,
      full_price: item.full || null,
      image_url: item.image || null,
    }))

    const { error: itemError } = await supabase
      .from('menu_items')
      .insert(itemsToInsert)

    if (itemError) {
      console.error(`Error inserting items for ${cat.category}:`, itemError.message)
    } else {
      console.log(`Successfully added ${itemsToInsert.length} items to ${cat.category}`)
    }
  }

  console.log('Migration complete!')
}

seedData()
