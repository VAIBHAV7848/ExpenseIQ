/* ========================================
   ExpenseIQ — Sample / Demo Data
   ======================================== */

const SAMPLE_TRANSACTIONS = [
  { id:"txn_001",type:"income",category:"cat_salary",amount:35000,description:"Monthly Salary - April",date:"2026-04-01",createdAt:"2026-04-01T09:00:00.000Z" },
  { id:"txn_002",type:"expense",category:"cat_rent",amount:8000,description:"Room rent - April",date:"2026-04-01",createdAt:"2026-04-01T10:00:00.000Z" },
  { id:"txn_003",type:"expense",category:"cat_food",amount:120,description:"Breakfast at college canteen",date:"2026-04-02",createdAt:"2026-04-02T08:30:00.000Z" },
  { id:"txn_004",type:"expense",category:"cat_transport",amount:85,description:"Auto to college",date:"2026-04-02",createdAt:"2026-04-02T08:00:00.000Z" },
  { id:"txn_005",type:"expense",category:"cat_food",amount:250,description:"Lunch with friends - Dominos",date:"2026-04-03",createdAt:"2026-04-03T13:00:00.000Z" },
  { id:"txn_006",type:"expense",category:"cat_subscriptions",amount:199,description:"Spotify Premium",date:"2026-04-03",createdAt:"2026-04-03T11:00:00.000Z" },
  { id:"txn_007",type:"income",category:"cat_freelance",amount:5000,description:"Logo design freelance project",date:"2026-04-04",createdAt:"2026-04-04T15:00:00.000Z" },
  { id:"txn_008",type:"expense",category:"cat_shopping",amount:1299,description:"Phone case - Amazon",date:"2026-04-04",createdAt:"2026-04-04T18:00:00.000Z" },
  { id:"txn_009",type:"expense",category:"cat_food",amount:180,description:"Dinner - Biryani",date:"2026-04-05",createdAt:"2026-04-05T20:00:00.000Z" },
  { id:"txn_010",type:"expense",category:"cat_entertainment",amount:300,description:"Movie tickets - PVR",date:"2026-04-05",createdAt:"2026-04-05T17:00:00.000Z" },
  { id:"txn_011",type:"expense",category:"cat_transport",amount:150,description:"Uber to mall",date:"2026-04-06",createdAt:"2026-04-06T14:00:00.000Z" },
  { id:"txn_012",type:"expense",category:"cat_bills",amount:599,description:"Jio Recharge",date:"2026-04-06",createdAt:"2026-04-06T10:00:00.000Z" },
  { id:"txn_013",type:"expense",category:"cat_food",amount:450,description:"Grocery from BigBasket",date:"2026-04-07",createdAt:"2026-04-07T11:00:00.000Z" },
  { id:"txn_014",type:"expense",category:"cat_health",amount:500,description:"Medicine from Apollo Pharmacy",date:"2026-04-07",createdAt:"2026-04-07T16:00:00.000Z" },
  { id:"txn_015",type:"expense",category:"cat_education",amount:999,description:"Udemy course - React",date:"2026-04-08",createdAt:"2026-04-08T09:00:00.000Z" },
  { id:"txn_016",type:"expense",category:"cat_food",amount:200,description:"Tea + Snacks - Chai Point",date:"2026-04-08",createdAt:"2026-04-08T16:00:00.000Z" },
  { id:"txn_017",type:"income",category:"cat_gifts",amount:2000,description:"Birthday gift from uncle",date:"2026-04-09",createdAt:"2026-04-09T12:00:00.000Z" },
  { id:"txn_018",type:"expense",category:"cat_shopping",amount:2499,description:"Wireless earbuds - Flipkart",date:"2026-04-09",createdAt:"2026-04-09T19:00:00.000Z" },
  { id:"txn_019",type:"expense",category:"cat_food",amount:350,description:"Pizza party at hostel",date:"2026-04-10",createdAt:"2026-04-10T21:00:00.000Z" },
  { id:"txn_020",type:"expense",category:"cat_transport",amount:200,description:"Bus pass recharge",date:"2026-04-10",createdAt:"2026-04-10T09:00:00.000Z" },
  { id:"txn_021",type:"expense",category:"cat_bills",amount:800,description:"Electricity bill",date:"2026-04-11",createdAt:"2026-04-11T10:00:00.000Z" },
  { id:"txn_022",type:"expense",category:"cat_entertainment",amount:499,description:"Netflix subscription",date:"2026-04-11",createdAt:"2026-04-11T20:00:00.000Z" },
  { id:"txn_023",type:"expense",category:"cat_food",amount:280,description:"Mess food - weekly",date:"2026-04-12",createdAt:"2026-04-12T12:00:00.000Z" },
  { id:"txn_024",type:"income",category:"cat_freelance",amount:3000,description:"Website bug fix project",date:"2026-04-12",createdAt:"2026-04-12T17:00:00.000Z" },
  { id:"txn_025",type:"expense",category:"cat_shopping",amount:1599,description:"T-shirt from Myntra",date:"2026-04-13",createdAt:"2026-04-13T14:00:00.000Z" },
  { id:"txn_026",type:"income",category:"cat_salary",amount:35000,description:"Monthly Salary - March",date:"2026-03-01",createdAt:"2026-03-01T09:00:00.000Z" },
  { id:"txn_027",type:"expense",category:"cat_rent",amount:8000,description:"Room rent - March",date:"2026-03-01",createdAt:"2026-03-01T10:00:00.000Z" },
  { id:"txn_028",type:"expense",category:"cat_food",amount:4200,description:"Monthly mess food",date:"2026-03-02",createdAt:"2026-03-02T12:00:00.000Z" },
  { id:"txn_029",type:"expense",category:"cat_transport",amount:1800,description:"Monthly transport expenses",date:"2026-03-05",createdAt:"2026-03-05T09:00:00.000Z" },
  { id:"txn_030",type:"expense",category:"cat_shopping",amount:3400,description:"Clothes and accessories",date:"2026-03-08",createdAt:"2026-03-08T15:00:00.000Z" },
  { id:"txn_031",type:"expense",category:"cat_bills",amount:2100,description:"Phone + Internet + Electricity",date:"2026-03-10",createdAt:"2026-03-10T11:00:00.000Z" },
  { id:"txn_032",type:"expense",category:"cat_entertainment",amount:1500,description:"Weekend outings",date:"2026-03-12",createdAt:"2026-03-12T18:00:00.000Z" },
  { id:"txn_033",type:"income",category:"cat_freelance",amount:8000,description:"Web development project",date:"2026-03-15",createdAt:"2026-03-15T14:00:00.000Z" },
  { id:"txn_034",type:"expense",category:"cat_health",amount:700,description:"Doctor visit + medicine",date:"2026-03-16",createdAt:"2026-03-16T10:00:00.000Z" },
  { id:"txn_035",type:"expense",category:"cat_education",amount:1500,description:"Books + Course material",date:"2026-03-18",createdAt:"2026-03-18T11:00:00.000Z" },
  { id:"txn_036",type:"expense",category:"cat_subscriptions",amount:698,description:"Spotify + iCloud",date:"2026-03-20",createdAt:"2026-03-20T09:00:00.000Z" },
  { id:"txn_037",type:"income",category:"cat_investment",amount:1200,description:"Mutual fund dividend",date:"2026-03-22",createdAt:"2026-03-22T15:00:00.000Z" },
  { id:"txn_038",type:"expense",category:"cat_food",amount:800,description:"Weekend restaurant",date:"2026-03-23",createdAt:"2026-03-23T20:00:00.000Z" },
  { id:"txn_039",type:"expense",category:"cat_transport",amount:500,description:"Train ticket home",date:"2026-03-25",createdAt:"2026-03-25T07:00:00.000Z" },
  { id:"txn_040",type:"expense",category:"cat_shopping",amount:2200,description:"Amazon shopping spree",date:"2026-03-26",createdAt:"2026-03-26T16:00:00.000Z" },
  { id:"txn_041",type:"expense",category:"cat_food",amount:650,description:"Zomato orders this week",date:"2026-03-28",createdAt:"2026-03-28T21:00:00.000Z" },
  { id:"txn_042",type:"income",category:"cat_gifts",amount:1500,description:"Holi gift money",date:"2026-03-29",createdAt:"2026-03-29T12:00:00.000Z" },
  { id:"txn_043",type:"expense",category:"cat_entertainment",amount:350,description:"Gaming credits",date:"2026-03-29",createdAt:"2026-03-29T22:00:00.000Z" },
  { id:"txn_044",type:"expense",category:"cat_other_exp",amount:300,description:"Miscellaneous expenses",date:"2026-03-30",createdAt:"2026-03-30T13:00:00.000Z" },
  { id:"txn_045",type:"expense",category:"cat_education",amount:2000,description:"Coursera subscription",date:"2026-03-31",createdAt:"2026-03-31T10:00:00.000Z" },
  { id:"txn_046",type:"expense",category:"cat_food",amount:150,description:"Coffee - Starbucks",date:"2026-04-14",createdAt:"2026-04-14T10:00:00.000Z" },
  { id:"txn_047",type:"expense",category:"cat_transport",amount:120,description:"Rapido bike taxi",date:"2026-04-14",createdAt:"2026-04-14T08:00:00.000Z" },
  { id:"txn_048",type:"income",category:"cat_investment",amount:800,description:"Stock dividend",date:"2026-04-15",createdAt:"2026-04-15T11:00:00.000Z" },
  { id:"txn_049",type:"expense",category:"cat_food",amount:380,description:"Swiggy order - dinner",date:"2026-04-15",createdAt:"2026-04-15T20:00:00.000Z" },
  { id:"txn_050",type:"expense",category:"cat_bills",amount:1200,description:"WiFi bill + Water bill",date:"2026-04-16",createdAt:"2026-04-16T09:00:00.000Z" }
];

const SAMPLE_BUDGETS = [
  {
    id: "budget_2026_04", month: "2026-04", totalBudget: 20000,
    categoryBudgets: { cat_food:5000, cat_transport:3000, cat_shopping:4000, cat_bills:3000, cat_entertainment:2000, cat_health:1500, cat_education:2000, cat_subscriptions:500 }
  },
  {
    id: "budget_2026_03", month: "2026-03", totalBudget: 20000,
    categoryBudgets: { cat_food:5000, cat_transport:2500, cat_shopping:4000, cat_bills:2500, cat_entertainment:2000, cat_health:1000, cat_education:2000, cat_subscriptions:1000 }
  }
];
