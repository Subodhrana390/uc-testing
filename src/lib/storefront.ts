export const supportPhone = "+91 98888 63377";
export const supportPhoneHref = "tel:+919888863377";
export const supportEmail = "ucenterprises1@gmail.com";
export const supportEmailHref = "mailto:ucenterprises1@gmail.com";
export const companyAddress = "Shop No. 1, Khairabad Village, Near Bus Stand, Bela Road, Khairabad, Ropar, Punjab - 140001, India.";
export const companyTagline = "Complete solutions for laboratory, industrial & safety requirements.";
export const companyCoreValues = "Quality is our Promise, Safety is our Priority.";
export const companyWebsite = "www.ucenterprises.in";

export type StoreDepartment =
  | "chemicals-reagents"
  | "glassware-plasticware"
  | "tools-hardware"
  | "safety-equipment-ppe"
  | "industrial-electrical";

// Hardcoded departments removed in favor of dynamic categories from Supabase

const departmentKeywordMap: Record<StoreDepartment, string[]> = {
  "chemicals-reagents": [
    "chemical",
    "reagent",
    "solvent",
    "powder",
    "buffer",
    "indicator",
  ],
  "glassware-plasticware": [
    "glassware",
    "plasticware",
    "beaker",
    "flask",
    "tube",
    "cylinder",
    "pipette",
    "bottle",
  ],
  "tools-hardware": [
    "tool",
    "hardware",
    "power",
    "hand",
    "measure",
    "cut",
    "fastener",
  ],
  "safety-equipment-ppe": [
    "safety",
    "ppe",
    "protective",
    "first aid",
    "hazard",
    "fire",
    "mask",
    "goggle",
  ],
  "industrial-electrical": [
    "industrial",
    "electrical",
    "electronic",
    "wire",
    "detector",
    "lockout",
    "tagout",
  ],
};

export function getDepartmentFromCategoryName(name: string | null | undefined): StoreDepartment {
  const value = (name || "").toLowerCase();

  for (const [department, keywords] of Object.entries(departmentKeywordMap) as Array<
    [StoreDepartment, string[]]
  >) {
    if (keywords.some((keyword) => value.includes(keyword))) {
      return department;
    }
  }

  return "industrial-electrical";
}

export function getDepartmentMeta(department: string) {
  // Return a generic meta since we are moving away from hardcoded departments
  return {
    id: department,
    label: department.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    description: "Industrial supplies and laboratory equipment."
  };
}

export const primaryNavLinks = [
  { href: "/", label: "Home" },
  { href: "/products?promo=true", label: "Deals & Offers" },
  { href: "/categories", label: "Categories" },
  { href: "/products", label: "All Products" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/track-order", label: "Track Order" },
];

export const footerLinks = {
  company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
    { href: "/track-order", label: "Track Order" },
  ],
  policies: [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/cookie-policy", label: "Cookie Policy" },
  ],
};



