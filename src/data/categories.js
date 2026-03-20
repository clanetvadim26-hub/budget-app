export const FIXED_CATEGORIES = [
  { id: 'rent', label: 'Rent/Mortgage', icon: '🏠' },
  { id: 'electricity', label: 'Electricity', icon: '⚡' },
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'internet', label: 'Internet/WiFi', icon: '📡' },
  { id: 'phone', label: 'Phone Bills', icon: '📱' },
  { id: 'car_insurance', label: 'Car Insurance', icon: '🚗' },
  { id: 'health_insurance', label: 'Health Insurance', icon: '🏥' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📺' },
  { id: 'loan_payments', label: 'Loan Payments', icon: '🏦' },
];

export const VARIABLE_CATEGORIES = [
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'gas', label: 'Gas', icon: '⛽' },
  { id: 'dining_out', label: 'Dining Out', icon: '🍽️' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'personal_care', label: 'Personal Care', icon: '💆' },
  { id: 'gym', label: 'Gym/Fitness', icon: '💪' },
  { id: 'medical', label: 'Medical/Pharmacy', icon: '💊' },
  { id: 'home_supplies', label: 'Home Supplies', icon: '🧹' },
  { id: 'gifts', label: 'Gifts', icon: '🎁' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: '📦' },
];

export const ALL_CATEGORIES = [...FIXED_CATEGORIES, ...VARIABLE_CATEGORIES];

export const getCategoryById = (id) =>
  ALL_CATEGORIES.find((c) => c.id === id) || { id, label: id, icon: '💰' };

export const CATEGORY_COLORS = {
  rent: '#E57373',
  electricity: '#FFB74D',
  water: '#64B5F6',
  internet: '#81C784',
  phone: '#BA68C8',
  car_insurance: '#4DD0E1',
  health_insurance: '#F06292',
  subscriptions: '#A1887F',
  loan_payments: '#FF8A65',
  groceries: '#AED581',
  gas: '#FFF176',
  dining_out: '#FF7043',
  entertainment: '#7986CB',
  clothing: '#F48FB1',
  personal_care: '#80DEEA',
  gym: '#DCEDC8',
  medical: '#EF9A9A',
  home_supplies: '#B0BEC5',
  gifts: '#F8BBD0',
  travel: '#80CBC4',
  miscellaneous: '#CFD8DC',
};
