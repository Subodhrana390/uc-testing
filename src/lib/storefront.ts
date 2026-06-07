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
  { href: "/categories", label: "All Categories" },
  { href: "/about", label: "About" },
  { href: "/products", label: "All Products" },
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

export const faqItems = [
  {
    id: "ordering-process",
    category: "Ordering",
    question: "How do I place an order for laboratory or industrial supplies?",
    answer: "To place an order, browse our categories or search for specific products. Adjust the quantity (keeping in mind the Minimum Order Quantity, or MOQ) and click 'Add to Cart'. You can complete checkout securely using credit/debit cards, net banking, or UPI.",
  },
  {
    id: "shipping-timelines",
    category: "Shipping",
    question: "How long does shipping take and how are estimates calculated?",
    answer: "Transit times depend on your destination. We calculate estimates dynamically using your pincode's prefix mapping. Standard delivery takes 3-7 business days, while regional express zones can receive items in 24-48 hours. Use the 'Delivery Check' tool on the product page to see options for your location.",
  },
  {
    id: "tracking-shipment",
    category: "Shipping",
    question: "Can I track my shipment in real-time?",
    answer: "Yes, once your order is dispatched, a tracking number and logistics link will be sent to your registered email and mobile number. You can also input your Order ID on our 'Track Order' page to check the fulfillment status.",
  },
  {
    id: "product-certification",
    category: "Products",
    question: "Are your chemical reagents and lab equipment certified?",
    answer: "Yes, all reagents, precision glassware, and testing instruments supplied by UC Enterprises conform to strict quality guidelines. Certificates of Analysis (COA) and MSDS document sheets are available on request for chemical products.",
  },
  {
    id: "returns-policy",
    category: "Support",
    question: "What is your return and replacement policy?",
    answer: "Due to the sensitive nature of scientific equipment and chemical reagents, we accept returns within 7 days of delivery only for items that arrive damaged, defective, or unopened in original packaging. Please contact our support team to initiate a return request.",
  },
];

