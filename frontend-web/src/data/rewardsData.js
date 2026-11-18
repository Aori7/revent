/** Mock data for the REVENT Rewards prototype; replace with API responses later. */
export const rewardCatalog = [
  {
    id: 'fairprice-5', title: '$5 FairPrice Voucher', cost: 200,
    category: 'Groceries', icon: 'shopping-basket',
    subtitle: 'Save on your next grocery run',
    details: [
      '$5 off your next grocery run',
      'Valid at participating FairPrice outlets',
      'Valid for 30 days from redemption',
      'One redemption per user per day (planned backend rule)'
    ],
    terms: 'Demo-only voucher. Not redeemable at any real retailer. Actual eligibility and redemption limits will be enforced when the backend is connected.'
  },
  {
    id: 'transport-5', title: '$5 Transport Voucher', cost: 180,
    category: 'Transport', icon: 'bus',
    subtitle: 'Make your next journey a little easier',
    details: ['Voucher value: $5', 'Valid for 30 days from redemption', 'Demo voucher — no real transport credit is issued'],
    terms: 'Prototype reward for demonstration only. Final participating transport service and terms will be provided later.'
  },
  {
    id: 'coffee-2', title: '$2 Coffee Voucher', cost: 100,
    category: 'Food & Drinks', icon: 'coffee',
    subtitle: 'Enjoy a small treat for learning safely',
    details: ['Voucher value: $2', 'Valid for 30 days from redemption', 'Demo voucher — cannot be used in stores'],
    terms: 'Prototype reward for demonstration only. Final merchant details will be provided later.'
  },
  {
    id: 'grocery-10', title: '$10 Grocery Voucher', cost: 350,
    category: 'Groceries', icon: 'shopping-basket',
    subtitle: 'A little extra towards everyday essentials',
    details: ['Voucher value: $10', 'Valid for 30 days from redemption', 'Demo voucher — cannot be used in stores'],
    terms: 'Prototype reward for demonstration only.'
  }
];

export const earnPointTasks = [
  {
    id: 'learning',
    title: 'Complete a learning card',
    description: 'Explore a scam scenario and reveal its red flags',
    points: 10,
    path: '/education',
    linkText: 'Explore learning cards'
  },
  {
    id: 'practice',
    title: 'Complete the readiness check',
    description: 'Assess your ability to recognise AI-powered scams',
    points: 5,
    path: '/readiness',
    linkText: 'Try readiness check'
  }
];

export const getRewardById = (id) => rewardCatalog.find((reward) => reward.id === id);
