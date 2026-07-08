import { describe, it, expect } from 'vitest';
import { validateAndParseData } from '../src/utils/bulk-upload';

describe('Bulk Upload Utility', () => {
  const dummyCategories = [
    { id: 'cat-1', name: 'Chemicals', igst_rate: 18 },
    { id: 'cat-2', name: 'Glassware', igst_rate: 12 },
  ];

  const dummyBrands = [
    { id: 'brand-1', name: 'Generic' },
    { id: 'brand-2', name: 'PremiumBrand' },
  ];

  it('should successfully validate and map valid product data', () => {
    const rawData = [
      {
        Name: 'Test Product 1',
        SKU: 'TP-001',
        Price: 1000, // Exclusive of tax in raw file
        'Cost Price': 800,
        'Stock Quantity': 100,
        Category: 'Chemicals',
        Brand: 'Generic',
        Unit: 'pcs',
        Status: 'Active',
        'Short Description': 'A good product',
      },
    ];

    const result = validateAndParseData(rawData, dummyCategories, dummyBrands);

    expect(result.length).toBe(1);
    expect(result[0]._status).toBe('valid');
    expect(result[0]._errors).toHaveLength(0);

    const mapped = result[0]._parsedData;
    expect(mapped.name).toBe('Test Product 1');
    expect(mapped.slug).toBe('test-product-1');
    expect(mapped.category_id).toBe('cat-1');
    expect(mapped.brand_id).toBe('brand-1');
    // Price should include IGST (1000 * 1.18 = 1180)
    expect(mapped.price).toBe(1180);
    expect(mapped.igst_rate).toBe(18);
    expect(mapped.status).toBe('Active');
  });

  it('should mark row invalid if missing required fields', () => {
    const rawData = [
      {
        Name: '',
        SKU: 'TP-002',
        Price: 0,
        Category: '',
      },
    ];

    const result = validateAndParseData(rawData, dummyCategories, dummyBrands);

    expect(result.length).toBe(1);
    expect(result[0]._status).toBe('invalid');
    expect(result[0]._errors).toContain('Name is required');
    expect(result[0]._errors).toContain('Price must be > 0');
    expect(result[0]._errors).toContain('Category is required');
  });

  it('should mark row invalid if category or brand does not exist', () => {
    const rawData = [
      {
        Name: 'Invalid Cat Product',
        SKU: 'TP-003',
        Price: 500,
        Category: 'Unknown Category',
        Brand: 'Unknown Brand',
      },
    ];

    const result = validateAndParseData(rawData, dummyCategories, dummyBrands);

    expect(result.length).toBe(1);
    expect(result[0]._status).toBe('invalid');
    expect(result[0]._errors).toContain("Category 'Unknown Category' not found in database");
    expect(result[0]._errors).toContain("Brand 'Unknown Brand' not found in database");
  });

  it('should successfully handle products without brand (brand is optional)', () => {
    const rawData = [
      {
        Name: 'Unbranded Product',
        SKU: 'TP-004',
        Price: 200,
        Category: 'Glassware',
      },
    ];

    const result = validateAndParseData(rawData, dummyCategories, dummyBrands);

    expect(result.length).toBe(1);
    expect(result[0]._status).toBe('valid');
    const mapped = result[0]._parsedData;
    expect(mapped.brand_id).toBeUndefined();
    expect(mapped.category_id).toBe('cat-2');
    // Price with 12% GST = 200 * 1.12 = 224
    expect(mapped.price).toBe(224);
  });
});
