import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role for seeding usually
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAttributes() {
  console.log("Starting attribute seeding...");

  // 1. Get Categories
  const { data: categories } = await supabase.from('categories').select('id, name');
  if (!categories) {
    console.error("No categories found");
    return;
  }

  const findCatId = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id;

  const plywoodId = findCatId("Plywood");
  const laminateId = findCatId("Laminate");
  const hardwareId = findCatId("Hardware");

  const seedData = [
    {
      catName: "Plywood",
      catId: plywoodId,
      groups: [
        {
          name: "Core Specifications",
          attributes: [
            { name: "Thickness", type: "dropdown", options: ["6mm", "9mm", "12mm", "16mm", "18mm", "25mm"], is_required: true },
            { name: "Grade", type: "dropdown", options: ["MR (Moisture Resistant)", "BWR (Boiling Water Resistant)", "BWP (Boiling Water Proof)"], is_required: true },
            { name: "Core Type", type: "dropdown", options: ["Poplar", "Gurjan", "Hardwood", "Eucalyptus"], is_required: false }
          ]
        }
      ]
    },
    {
      catName: "Laminates",
      catId: laminateId,
      groups: [
        {
          name: "Design & Texture",
          attributes: [
            { name: "Thickness", type: "dropdown", options: ["0.8mm", "1.0mm", "1.25mm"], is_required: true },
            { name: "Finish Type", type: "dropdown", options: ["Glossy", "Matte", "SF (Suede Finish)", "Texture", "High Gloss"], is_required: true },
            { name: "Design Code", type: "text", is_required: false }
          ]
        }
      ]
    }
  ];

  for (const entry of seedData) {
    if (!entry.catId) {
      console.log(`Skipping ${entry.catName} (Category not found)`);
      continue;
    }

    for (const group of entry.groups) {
      // Create Group
      const { data: gData, error: gError } = await supabase
        .from('attribute_groups')
        .insert([{ name: group.name, category_id: entry.catId }])
        .select()
        .single();

      if (gError) {
        console.error(`Error creating group ${group.name}:`, gError);
        continue;
      }

      console.log(`Created group: ${group.name} for ${entry.catName}`);

      // Create Attributes
      const attributesToInsert = group.attributes.map(a => ({
        ...a,
        group_id: gData.id
      }));

      const { error: aError } = await supabase
        .from('attributes')
        .insert(attributesToInsert);

      if (aError) {
        console.error(`Error creating attributes for ${group.name}:`, aError);
      } else {
        console.log(`Successfully seeded ${group.attributes.length} attributes for ${group.name}`);
      }
    }
  }

  console.log("Seeding completed!");
}

seedAttributes();
