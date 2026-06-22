export interface ParsedProduct {
  Name: string;
  SKU: string;
  Price: number;
  "Cost Price": number;
  "Stock Quantity": number;
  Category: string;
  Brand: string;
  Unit: string;
  Status: string;
  "Short Description": string;
  _row_number: number;
  _status?: "valid" | "invalid";
  _errors?: string[];
  _parsedData?: any;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

export const validateAndParseData = (data: any[], categories: any[], brands: any[]): ParsedProduct[] => {
  return data.map((row, index) => {
    const parsedRow: ParsedProduct = {
      Name: row.Name || "",
      SKU: row.SKU || "",
      Price: parseFloat(row.Price) || 0,
      "Cost Price": parseFloat(row["Cost Price"]) || 0,
      "Stock Quantity": parseInt(row["Stock Quantity"]) || 0,
      Category: row.Category || "",
      Brand: row.Brand || "",
      Unit: row.Unit || "pcs",
      Status: row.Status || "Active",
      "Short Description": row["Short Description"] || "",
      _row_number: index + 2, // Accounting for header row
      _status: "valid",
      _errors: []
    };

    const errors: string[] = [];
    const dbData: any = {};

    if (!parsedRow.Name) errors.push("Name is required");
    if (parsedRow.Price <= 0) errors.push("Price must be > 0");
    if (!parsedRow.Category) errors.push("Category is required");

    // Validate and map Category
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === parsedRow.Category.toLowerCase()
    );
    if (matchedCategory) {
      dbData.category_id = matchedCategory.id;
      dbData.igst_rate = matchedCategory.igst_rate || 0;
    } else if (parsedRow.Category) {
      errors.push(`Category '${parsedRow.Category}' not found in database`);
    }

    // Validate and map Brand
    if (parsedRow.Brand) {
      const matchedBrand = brands.find(
        (b) => b.name.toLowerCase() === parsedRow.Brand.toLowerCase()
      );
      if (matchedBrand) {
        dbData.brand_id = matchedBrand.id;
      } else {
        errors.push(`Brand '${parsedRow.Brand}' not found in database`);
      }
    }

    // Compute final fields
    if (errors.length === 0) {
      const igstRate = dbData.igst_rate || 0;
      const priceExclusive = parsedRow.Price;
      const priceInclusive = Math.round(priceExclusive * (1 + igstRate / 100) * 100) / 100;

      dbData.name = parsedRow.Name;
      dbData.slug = generateSlug(parsedRow.Name);
      dbData.sku = parsedRow.SKU;
      dbData.price = priceInclusive;
      dbData.cost_price = parsedRow["Cost Price"];
      dbData.stock_quantity = parsedRow["Stock Quantity"];
      dbData.unit = parsedRow.Unit;
      dbData.status = parsedRow.Status === "Draft" ? "Draft" : "Active";
      dbData.visibility = parsedRow.Status === "Draft" ? false : true;
      dbData.short_description = parsedRow["Short Description"];
      dbData.igst_rate = igstRate;
      dbData.cgst_rate = 0;
      dbData.sgst_rate = 0;
      dbData.is_tax_inclusive = true;
      dbData.has_variants = false;
    }

    if (errors.length > 0) {
      parsedRow._status = "invalid";
      parsedRow._errors = errors;
    } else {
      parsedRow._parsedData = dbData;
    }

    return parsedRow;
  });
};
