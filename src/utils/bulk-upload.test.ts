import { describe, it, expect } from 'vitest';
import { validateAndParseData } from './bulk-upload';

describe('Bulk Upload Utilities', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Electronics', igst_rate: 18 },
    { id: 'cat-2', name: 'Clothing', igst_rate: 5 }
  ];

  const mockBrands = [
    { id: 'brand-1', name: 'Samsung' },
    { id: 'brand-2', name: 'Nike' }
  ];

  it('should validate and parse correct data successfully', () => {
    const inputData = [{
      "Name": "Test Product",
      "SKU": "TEST-001",
      "Barcode": "12345",
      "HSN Code": "1234",
      "Price": "100",
      "Cost Price": "80",
      "Sale Price": "90",
      "Stock Quantity": "10",
      "Category": "Electronics",
      "Brand": "Samsung",
      "Unit": "pcs",
      "Status": "Active",
      "Short Description": "Short desc",
      "Long Description": "Long desc",
      "Specification": "Specs",
      "Manufacturing Info": "Mfg info",
      "Warranty Info": "1 year",
      "SEO Title": "SEO",
      "SEO Keywords": "seo, keywords",
      "SEO Description": "seo desc",
      "Has Variants": "No"
    }];

    const result = validateAndParseData(inputData, mockCategories, mockBrands);

    expect(result.length).toBe(1);
    expect(result[0]._status).toBe('valid');
    expect(result[0]._errors?.length).toBe(0);
    expect(result[0]._parsedData.name).toBe('Test Product');
    expect(result[0]._parsedData.slug).toBe('test-product');
    expect(result[0]._parsedData.category_id).toBe('cat-1');
    expect(result[0]._parsedData.brand_id).toBe('brand-1');
    expect(result[0]._parsedData.igst_rate).toBe(18);
    // Price = 100 * 1.18 = 118
    expect(result[0]._parsedData.price).toBe(118);
    // Sale Price = 90 * 1.18 = 106.2
    expect(result[0]._parsedData.sale_price).toBe(106.2);
    expect(result[0]._parsedData.has_variants).toBe(false);
  });

  it('should flag errors for missing required fields', () => {
    const inputData = [{
      "Name": "",
      "Price": "0",
      "Category": ""
    }];

    const result = validateAndParseData(inputData, mockCategories, mockBrands);

    expect(result[0]._status).toBe('invalid');
    expect(result[0]._errors).toContain('Name is required');
    expect(result[0]._errors).toContain('Price must be > 0');
    expect(result[0]._errors).toContain('Category is required');
  });

  it('should flag errors for invalid category or brand', () => {
    const inputData = [{
      "Name": "Test Product 2",
      "Price": "100",
      "Category": "Invalid Category",
      "Brand": "Invalid Brand"
    }];

    const result = validateAndParseData(inputData, mockCategories, mockBrands);

    expect(result[0]._status).toBe('invalid');
    expect(result[0]._errors).toContain("Category 'Invalid Category' not found in database");
    expect(result[0]._errors).toContain("Brand 'Invalid Brand' not found in database");
  });
});
