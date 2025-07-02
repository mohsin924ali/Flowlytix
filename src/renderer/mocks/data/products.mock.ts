/**
 * Product Mock Data
 * Sample products for testing and development
 */

export interface MockProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  price: number;
  costPrice: number;
  currency: string;
  inStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  tags: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const mockProducts: MockProduct[] = [
  {
    id: 'prod-1',
    sku: 'ELEC001',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life',
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'TechSound',
    price: 299.99,
    costPrice: 150.0,
    currency: 'USD',
    inStock: 45,
    minStockLevel: 10,
    maxStockLevel: 100,
    unit: 'piece',
    weight: 0.35,
    dimensions: {
      length: 20,
      width: 18,
      height: 8,
      unit: 'cm',
    },
    status: 'ACTIVE',
    tags: ['wireless', 'bluetooth', 'noise-cancellation', 'premium'],
    images: ['/images/products/headphones-1.jpg'],
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod-2',
    sku: 'FURN001',
    name: 'Ergonomic Office Chair',
    description: 'Comfortable ergonomic office chair with lumbar support and adjustable height',
    category: 'Furniture',
    subcategory: 'Office',
    brand: 'ComfortDesk',
    price: 449.99,
    costPrice: 225.0,
    currency: 'USD',
    inStock: 25,
    minStockLevel: 5,
    maxStockLevel: 50,
    unit: 'piece',
    weight: 18.5,
    dimensions: {
      length: 65,
      width: 65,
      height: 110,
      unit: 'cm',
    },
    status: 'ACTIVE',
    tags: ['ergonomic', 'office', 'adjustable', 'comfort'],
    images: ['/images/products/chair-1.jpg'],
    createdAt: new Date('2023-03-20'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 'prod-3',
    sku: 'BOOK001',
    name: 'Business Strategy Handbook',
    description: 'Comprehensive guide to modern business strategy and management practices',
    category: 'Books',
    subcategory: 'Business',
    brand: 'Educational Press',
    price: 34.99,
    costPrice: 12.0,
    currency: 'USD',
    inStock: 120,
    minStockLevel: 20,
    maxStockLevel: 200,
    unit: 'piece',
    weight: 0.8,
    dimensions: {
      length: 24,
      width: 16,
      height: 3,
      unit: 'cm',
    },
    status: 'ACTIVE',
    tags: ['business', 'strategy', 'handbook', 'management'],
    images: ['/images/products/book-1.jpg'],
    createdAt: new Date('2023-05-10'),
    updatedAt: new Date('2023-12-15'),
  },
  {
    id: 'prod-4',
    sku: 'CLOTH001',
    name: 'Professional Business Shirt',
    description: 'High-quality cotton business shirt suitable for professional environments',
    category: 'Clothing',
    subcategory: 'Shirts',
    brand: 'ProfessionalWear',
    price: 89.99,
    costPrice: 35.0,
    currency: 'USD',
    inStock: 75,
    minStockLevel: 15,
    maxStockLevel: 150,
    unit: 'piece',
    weight: 0.3,
    status: 'ACTIVE',
    tags: ['professional', 'cotton', 'business', 'formal'],
    images: ['/images/products/shirt-1.jpg'],
    createdAt: new Date('2023-06-25'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: 'prod-5',
    sku: 'TECH001',
    name: 'Smart Fitness Tracker',
    description: 'Advanced fitness tracker with heart rate monitoring and GPS',
    category: 'Technology',
    subcategory: 'Wearables',
    brand: 'FitTech',
    price: 199.99,
    costPrice: 80.0,
    currency: 'USD',
    inStock: 0,
    minStockLevel: 10,
    maxStockLevel: 80,
    unit: 'piece',
    weight: 0.05,
    dimensions: {
      length: 4,
      width: 2,
      height: 1,
      unit: 'cm',
    },
    status: 'ACTIVE',
    tags: ['fitness', 'tracker', 'smart', 'gps', 'health'],
    images: ['/images/products/tracker-1.jpg'],
    createdAt: new Date('2023-08-12'),
    updatedAt: new Date('2024-01-20'),
  },
];

export const generateMockProducts = (count: number = 100): MockProduct[] => {
  const categories = ['Electronics', 'Furniture', 'Books', 'Clothing', 'Technology', 'Home & Garden', 'Sports'];
  const brands = ['TechCorp', 'Quality Goods', 'Premium Brand', 'Affordable Plus', 'Luxury Items'];
  const statuses: MockProduct['status'][] = ['ACTIVE', 'INACTIVE', 'DISCONTINUED'];
  const units = ['piece', 'kg', 'liter', 'meter', 'pack'];

  return Array.from({ length: count }, (_, index) => ({
    id: `prod-${index + 6}`,
    sku: `SKU${(index + 6).toString().padStart(3, '0')}`,
    name: `Product ${index + 6}`,
    description: `Description for product ${index + 6}`,
    category: categories[Math.floor(Math.random() * categories.length)] || 'General',
    brand: brands[Math.floor(Math.random() * brands.length)] || 'Generic',
    price: Math.floor(Math.random() * 1000) + 10,
    costPrice: Math.floor(Math.random() * 500) + 5,
    currency: 'USD',
    inStock: Math.floor(Math.random() * 200),
    minStockLevel: Math.floor(Math.random() * 20) + 5,
    maxStockLevel: Math.floor(Math.random() * 500) + 50,
    unit: units[Math.floor(Math.random() * units.length)] || 'piece',
    weight: Math.random() * 10,
    status: statuses[Math.floor(Math.random() * statuses.length)] || 'ACTIVE',
    tags: [`tag-${index}`, 'sample'],
    images: [`/images/products/product-${index + 6}.jpg`],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  }));
};

export const allMockProducts = [...mockProducts, ...generateMockProducts()];
