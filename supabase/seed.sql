insert into categories (name, slug, status)
values
  ('Welding Electrodes', 'welding-electrodes', 'Active'),
  ('Welding Machines', 'welding-machines', 'Active'),
  ('Industrial Safety Hardware', 'industrial-safety-hardware', 'Active'),
  ('Electronic Goods', 'electronic-goods', 'Active'),
  ('CCTV and Security Systems', 'cctv-security-systems', 'Active'),
  ('Laboratory Chemicals', 'laboratory-chemicals', 'Active'),
  ('Industrial Powders', 'industrial-powders', 'Active'),
  ('General Office and Supply Items', 'general-office-supply-items', 'Active')
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status;

insert into products (
  name,
  slug,
  price,
  category_id,
  stock_quantity,
  description,
  specification,
  manufacturing_info,
  warranty_info,
  image_url,
  status
)
values
  (
    'ARC Welding Electrode E6013 3.15mm',
    'arc-welding-electrode-e6013-315mm',
    1450,
    (select id from categories where slug = 'welding-electrodes'),
    120,
    '<p>Reliable E6013 welding electrodes suitable for fabrication shops, repair work, and general welding applications.</p>',
    '<ul><li>Size: 3.15 mm</li><li>Use: Mild steel welding</li><li>Pack type: Bulk carton supply</li></ul>',
    '<p>Quality-checked supply for workshop and industrial purchase requirements.</p>',
    '<p>Replacement support available for transit damage or verified supply issue.</p>',
    '/images/prod_main.png',
    'Active'
  ),
  (
    'IGBT Inverter Welding Machine 250A',
    'igbt-inverter-welding-machine-250a',
    18500,
    (select id from categories where slug = 'welding-machines'),
    18,
    '<p>Heavy-duty inverter welding machine for industrial fabrication, maintenance work, and contractor usage.</p>',
    '<ul><li>Output: 250A</li><li>Technology: IGBT inverter</li><li>Application: Workshop and site work</li></ul>',
    '<p>Designed for dependable welding performance and commercial workload usage.</p>',
    '<p>Standard seller warranty with service support as per brand policy.</p>',
    '/images/prod_side.png',
    'Active'
  ),
  (
    'Industrial Safety Hand Gloves Pack',
    'industrial-safety-hand-gloves-pack',
    650,
    (select id from categories where slug = 'industrial-safety-hardware'),
    75,
    '<p>Safety gloves for industrial handling, workshop use, and daily site operations.</p>',
    '<ul><li>Pack: 12 pairs</li><li>Use: Workshop, hardware, fabrication</li></ul>',
    '<p>Commercial-use safety supply item for general industrial procurement.</p>',
    '<p>No warranty on consumable wear items. Transit issue support available.</p>',
    '/images/hot1.png',
    'Active'
  ),
  (
    'HP Laser Printer for Office Use',
    'hp-laser-printer-for-office-use',
    22499,
    (select id from categories where slug = 'electronic-goods'),
    14,
    '<p>Business-ready office laser printer suitable for billing, documents, and daily commercial printing.</p>',
    '<ul><li>Function: Print</li><li>Use: Office and billing counter</li><li>Connectivity: USB and network</li></ul>',
    '<p>Sourced for office, school, and institutional purchase needs.</p>',
    '<p>Brand warranty applicable. Installation guidance available on request.</p>',
    '/images/prod_switch.png',
    'Active'
  ),
  (
    '8 Channel CCTV Security Kit',
    '8-channel-cctv-security-kit',
    32999,
    (select id from categories where slug = 'cctv-security-systems'),
    9,
    '<p>Complete CCTV setup for shop, office, warehouse, and factory security monitoring.</p>',
    '<ul><li>Channels: 8</li><li>Use: Office, retail, industrial site</li><li>Package: DVR, cameras, power accessories</li></ul>',
    '<p>Commercial-grade security solution for Indian business installations.</p>',
    '<p>Warranty support available as per manufacturer coverage.</p>',
    '/images/offer1.png',
    'Active'
  ),
  (
    'Laboratory Grade Isopropyl Alcohol',
    'laboratory-grade-isopropyl-alcohol',
    950,
    (select id from categories where slug = 'laboratory-chemicals'),
    40,
    '<p>Lab-use cleaning and chemical handling supply suitable for institutions, workshops, and testing setups.</p>',
    '<ul><li>Grade: Laboratory use</li><li>Pack: 1 litre</li><li>Use: Cleaning and process support</li></ul>',
    '<p>Handle and store as per safety guidance and chemical usage norms.</p>',
    '<p>Chemical supplies are non-returnable after opening unless damaged in transit.</p>',
    '/images/offer2.png',
    'Active'
  ),
  (
    'Aluminium Oxide Powder Fine Grade',
    'aluminium-oxide-powder-fine-grade',
    2800,
    (select id from categories where slug = 'industrial-powders'),
    28,
    '<p>Fine-grade industrial powder for laboratory, finishing, and specialized process applications.</p>',
    '<ul><li>Grade: Fine</li><li>Use: Industrial and lab process work</li><li>Pack: Bulk supply available</li></ul>',
    '<p>Supplied for B2B and institutional purchase with handling guidance where required.</p>',
    '<p>Replacement only for damaged or incorrect supply on delivery.</p>',
    '/images/hot2.png',
    'Active'
  ),
  (
    'A4 Copier Paper 75 GSM Box',
    'a4-copier-paper-75-gsm-box',
    1525,
    (select id from categories where slug = 'general-office-supply-items'),
    90,
    '<p>Daily office-use copier paper for invoices, documentation, and bulk printing requirements.</p>',
    '<ul><li>Size: A4</li><li>GSM: 75</li><li>Supply: Box quantity</li></ul>',
    '<p>General office supply item for recurring business procurement.</p>',
    '<p>Transit damage support available on sealed supply packs.</p>',
    '/images/combo.png',
    'Active'
  )
on conflict (slug) do update
set
  name = excluded.name,
  price = excluded.price,
  category_id = excluded.category_id,
  stock_quantity = excluded.stock_quantity,
  description = excluded.description,
  specification = excluded.specification,
  manufacturing_info = excluded.manufacturing_info,
  warranty_info = excluded.warranty_info,
  image_url = excluded.image_url,
  status = excluded.status;
