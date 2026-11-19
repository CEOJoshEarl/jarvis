// The Earl family: first family on Family Enterprise.
// Every chore in the Earl Family Household Plan. Andrew's plan shows here only as chore level 1, 2 or 3;
// prices and perks are private (see src/plans.ts).
// Anything the plan didn't pin down is listed in EARL_ASSUMPTIONS so it can
// be confirmed or changed in Settings.

import type { ChoreTemplate, FamilyConfig, Weekday } from './types';

const SUN_FRI: Weekday[] = [0, 1, 2, 3, 4, 5];
const MON_FRI: Weekday[] = [1, 2, 3, 4, 5];
const SAT: Weekday[] = [6];
const QUARTERS = [1, 4, 7, 10];
const SPRING_TO_FALL = [3, 4, 5, 6, 7, 8, 9, 10];

export const EARL_FAMILY: FamilyConfig = {
  id: 'earl',
  name: 'Earl',
  timezone: 'America/New_York',
  members: [
    { id: 'josh', name: 'Josh', short: 'JE', color: '#F5B83D', role: 'admin' },
    { id: 'vanilla', name: 'Vanilla', short: 'VA', color: '#FF7AA8', role: 'admin' },
    { id: 'andrew', name: 'Andrew', short: 'AN', color: '#2FD3C5', role: 'member' },
    { id: 'angela', name: 'Angela', short: 'AG', color: '#A98BFF', role: 'member' },
    { id: 'max', name: 'Max', short: 'MX', color: '#4DA3FF', role: 'member' },
    { id: 'uso', name: 'Uso', short: 'US', color: '#D9A36A', role: 'pet' },
  ],
  tiers: [{ tier: 1, from: '2026-11-01' }],
  rotation: {
    start: '2026-11-29',
    // Week-one order is random; reshuffle in Settings if you like.
    groups: { kids3: ['max', 'angela', 'andrew'] },
  },
  goLive: '2026-11-29',
};

const room = (who: string, name: string): ChoreTemplate[] => [
  {
    id: `${who}-room-daily`, title: `${name}'s room: daily`, area: `${name}'s room`,
    checklist: ['Bed made', 'Clothes away', 'No food or dishes', 'Floor clear', 'Your things out of the living room'],
    proof: 'photo', schedule: { kind: 'daily' }, owner: { kind: 'fixed', members: [who] },
    due: '10:00', dueOn: { 6: '08:00' }, note: 'Saturday: before we leave at 8.',
  },
  {
    id: `${who}-room-weekly`, title: `${name}'s room: weekly`, area: `${name}'s room`,
    checklist: ['Change sheets', 'Sweep under and around the bed', 'Dust', 'Empty trash', 'Wipe surfaces'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: { kind: 'fixed', members: [who] }, due: '21:00',
  },
  {
    id: `${who}-room-monthly`, title: `${name}'s room: monthly`, area: `${name}'s room`,
    checklist: ['Baseboards', 'Windows and blinds', 'Doors and switches', 'Ceiling fan', 'Closet and drawers'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: { kind: 'fixed', members: [who] }, due: '21:00',
  },
];

type Owner = ChoreTemplate['owner'];
const bathroom = (id: string, name: string, owner: Owner): ChoreTemplate[] => [
  {
    id: `${id}-daily`, title: `${name}: sink area`, area: name,
    checklist: ['Sink and counter wiped', 'Towels hung', 'Floor clear'],
    proof: 'photo', schedule: { kind: 'daily' }, owner, due: '21:00', dueOn: { 2: '22:00', 6: '22:00' },
  },
  {
    id: `${id}-weekly`, title: `${name}: weekly clean`, area: name,
    checklist: ['Toilet', 'Shower and tub', 'Mirror', 'Sweep and mop', 'Empty trash', 'Fresh towels'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner, due: '21:00',
  },
  {
    id: `${id}-monthly`, title: `${name}: monthly`, area: name,
    checklist: ['Baseboards', 'Wash mats and shower curtain', 'Restock', 'Clear drawers and under the sink', 'Switches and handles', 'Toilet brush and plunger', 'Drains'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner, due: '21:00',
  },
  {
    id: `${id}-quarterly`, title: `${name}: grout and fan`, area: name,
    checklist: ['Scrub grout', 'Clean exhaust fan'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21, months: QUARTERS }, owner, due: '21:00',
  },
];

const fixed = (...members: string[]): Owner => ({ kind: 'fixed', members });

export const EARL_CATALOG: ChoreTemplate[] = [
  // ---------------- Kitchen rotation ----------------
  {
    id: 'kitchen-dishes', title: 'Kitchen dishes', area: 'Kitchen',
    checklist: ['Dishes and dishwasher', 'Wipe all countertops', 'Move the computer and coffee pot, clean under and behind'],
    proof: 'photo', schedule: { kind: 'daily', days: SUN_FRI },
    owner: { kind: 'byDay', map: { 0: ['angela'], 1: ['max'], 2: ['andrew'], 3: ['max'], 4: ['andrew'], 5: ['max'] } },
    due: '21:00', dueOn: { 2: '22:00' },
  },
  {
    id: 'kitchen-sweep', title: 'Sweep the kitchen and take out the trash', area: 'Kitchen',
    checklist: ['Sweep the whole kitchen and sitting area', "Pull out Uso's crate and clean behind it", 'Take out the trash'],
    proof: 'photo', schedule: { kind: 'daily', days: SUN_FRI },
    owner: { kind: 'byDay', map: { 0: ['max'], 1: ['andrew'], 2: ['max'], 3: ['andrew'], 4: ['max'], 5: ['andrew'] } },
    due: '21:00', dueOn: { 2: '22:00' },
  },
  {
    id: 'kitchen-mop', title: 'Mop the kitchen', area: 'Kitchen', checklist: ['Mop the kitchen and sitting area'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('andrew'),
    byTier: { 3: fixed('vanilla') }, due: '21:00',
  },
  {
    id: 'kitchen-appliances', title: 'Wipe appliances and microwave', area: 'Kitchen',
    checklist: ['Fridge, dishwasher and stove fronts', 'Microwave inside and out'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('andrew'),
    byTier: { 2: fixed('max'), 3: fixed('max') }, due: '21:00',
  },
  {
    id: 'kitchen-cooktop', title: 'Scrub cooktop and clean the stove fan filter', area: 'Kitchen',
    checklist: ['Scrub the cooktop', 'Clean the stove fan filter'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('andrew'),
    byTier: { 2: null, 3: null }, due: '21:00',
  },
  {
    id: 'kitchen-cooktop-sunday', title: 'Scrub cooktop and clean the stove fan filter', area: 'Kitchen',
    checklist: ['Scrub the cooktop', 'Clean the stove fan filter'],
    proof: 'photo', schedule: { kind: 'weekly', due: 0 }, owner: fixed('angela'),
    byTier: { 1: null }, due: '21:00',
  },
  {
    id: 'kitchen-towels', title: 'Swap kitchen towels and sponges', area: 'Kitchen', checklist: ['Fresh towels', 'New sponges'],
    proof: 'photo', schedule: { kind: 'weekly', due: 0 }, owner: fixed('vanilla'), due: '21:00',
  },
  {
    id: 'kitchen-monthly', title: 'Kitchen: monthly', area: 'Kitchen',
    checklist: ['Baseboards', 'Organize cabinets', 'Clean the oven', 'Clean the dishwasher and disposal'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('vanilla'), due: '21:00',
  },

  // ---------------- Uso ----------------
  {
    id: 'uso-morning', title: "Uso's morning feed, water and walk", area: 'Uso',
    checklist: ['Food', 'Fresh water', 'Walk'], proof: 'either',
    schedule: { kind: 'daily' }, owner: fixed('andrew'), byTier: { 3: fixed('josh') },
    due: '10:00', dueOn: { 6: '08:00' }, note: 'Saturday: before we leave at 8.',
  },
  {
    id: 'uso-afternoon', title: "Uso's after-school feed, water and walk", area: 'Uso',
    checklist: ['Food', 'Fresh water', 'Walk'], proof: 'either',
    schedule: { kind: 'daily', days: SUN_FRI }, owner: fixed('max'), due: '16:30',
  },
  {
    id: 'uso-saturday-night', title: "Uso's last walk and fresh water", area: 'Uso',
    checklist: ['Walk', 'Fresh water'], proof: 'either',
    schedule: { kind: 'daily', days: SAT }, owner: fixed('max'), due: '22:00', note: 'When we get home from Sabbath.',
  },
  {
    id: 'uso-bowls', title: "Wash Uso's food and water bowls", area: 'Uso',
    checklist: ["Washed with Uso's own sponge, apart from family dishes", 'Rinse the sink'],
    proof: 'photo', schedule: { kind: 'daily' }, owner: fixed('angela'), due: '20:00', dueOn: { 6: '22:00' },
  },
  {
    id: 'uso-yard', title: "Pick up Uso's poop in the yard", area: 'Uso', checklist: ['Whole yard checked', 'Bagged and in the trash'],
    proof: 'photo', schedule: { kind: 'daily', days: [1, 4] }, owner: fixed('max'), due: '18:00',
  },
  {
    id: 'uso-crate', title: "Clean Uso's crate and area", area: 'Uso', checklist: ['Crate wiped', 'Bedding shaken out', 'Area swept'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('max'), due: '21:00',
  },
  {
    id: 'uso-bath', title: "Uso's bath", area: 'Uso', checklist: ['Bath', 'Dry and brush'],
    proof: 'either', schedule: { kind: 'monthly', dueDay: 15 }, owner: fixed('vanilla', 'angela'), due: '21:00',
  },
  {
    id: 'uso-food', title: "Buy Uso's food", area: 'Uso', checklist: ['Check the bag', 'Restock before it runs out'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 7 }, owner: fixed('andrew'), due: '21:00',
  },

  // ---------------- Josh ----------------
  {
    id: 'josh-mail', title: 'Get the mail', area: 'Mail', checklist: ['Mail in and sorted'],
    proof: 'photo', schedule: { kind: 'daily', days: MON_FRI }, owner: fixed('josh'), due: '20:00',
  },
  {
    id: 'office-daily', title: 'Office: daily', area: "Josh's office", checklist: ['Desk clear', 'Dishes out', 'Papers filed'],
    proof: 'photo', schedule: { kind: 'daily', days: MON_FRI }, owner: fixed('josh'), due: '21:00',
  },
  {
    id: 'office-weekly', title: 'Office: weekly', area: "Josh's office",
    checklist: ['Dust and wipe desk and electronics', 'Sweep and mop', 'Trash and shredder', 'Cables'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('josh'), due: '21:00',
  },
  {
    id: 'office-monthly', title: 'Office: monthly', area: "Josh's office",
    checklist: ['Baseboards', 'Windows and blinds', 'Ceiling fan', 'Purge files and supplies', 'Computer backup'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('josh'), due: '21:00',
  },
  {
    id: 'fridge-filter', title: 'Change the fridge water filter', area: 'Kitchen', checklist: ['New filter in', 'Date written on it'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 15, months: [1, 7] }, owner: fixed('josh'), due: '21:00',
  },

  // ---------------- Vanilla ----------------
  {
    id: 'dinner', title: 'Cook dinner', area: 'Kitchen', checklist: ['Dinner on the table'],
    proof: 'photo', schedule: { kind: 'daily', days: SUN_FRI }, owner: fixed('vanilla'), due: '19:30',
  },
  {
    id: 'fridge-cleanout', title: 'Fridge clean-out', area: 'Kitchen', checklist: ['Toss old food', 'Wipe shelves', 'List what we need'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('vanilla'), due: '18:00', note: 'Before grocery shopping.',
  },
  {
    id: 'groceries', title: 'Grocery shopping', area: 'Kitchen', checklist: ['Shopping done', 'Groceries put away'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('vanilla'), due: '21:00',
  },
  {
    id: 'pantry', title: 'Organize the pantry', area: 'Kitchen', checklist: ['Organize shelves', 'Toss expired food and seasonings'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('vanilla'), due: '21:00',
  },

  // ---------------- Master suite (Josh and Vanilla) ----------------
  {
    id: 'master-daily', title: 'Master bedroom: daily', area: 'Master suite',
    checklist: ['Bed made', 'Clothes away', 'No food or dishes', 'Floor clear'],
    proof: 'photo', schedule: { kind: 'daily' }, owner: fixed('josh', 'vanilla'), due: '21:00', dueOn: { 6: '08:00' },
  },
  {
    id: 'master-weekly', title: 'Master bedroom: weekly', area: 'Master suite',
    checklist: ['Change sheets', 'Sweep under and around the bed', 'Dust', 'Empty trash', 'Wipe surfaces'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('josh', 'vanilla'), due: '21:00',
  },
  {
    id: 'master-monthly', title: 'Master bedroom: monthly', area: 'Master suite',
    checklist: ['Baseboards', 'Windows and blinds', 'Doors and switches', 'Ceiling fan', 'Closet and drawers'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('josh', 'vanilla'), due: '21:00',
  },
  ...bathroom('master-bath', 'Master bath', fixed('josh', 'vanilla')),

  // ---------------- Kids' rooms and bathrooms ----------------
  ...room('andrew', 'Andrew'),
  ...room('angela', 'Angela'),
  ...room('max', 'Max'),
  ...bathroom('angela-bath', "Angela's bathroom", fixed('angela')),
  ...bathroom('boys-bath', "Andrew and Max's bathroom", { kind: 'alternate', members: ['andrew', 'max'] }),

  // ---------------- Weekly rotation (Andrew, Max, Angela) ----------------
  ...bathroom('guest-bath', 'Guest bathroom', { kind: 'rotation', group: 'kids3', slot: 0 }).filter(t => !t.id.endsWith('-daily')),
  {
    id: 'front-reset', title: 'Front of the house reset', area: 'Foyer, living and dining room',
    checklist: ['Foyer: shoes away, floor clear', 'Living room: clutter picked up, pillows and blankets straight', 'Dining room: table cleared and wiped, chairs pushed in'],
    proof: 'photo', schedule: { kind: 'daily', days: SUN_FRI }, owner: { kind: 'rotation', group: 'kids3', slot: 1 },
    due: '21:00', dueOn: { 2: '22:00' }, note: 'Whoever has the foyer this week does the nightly reset. Everyone still picks up their own things.',
  },
  {
    id: 'foyer-weekly', title: 'Foyer, stairs and hallways: weekly', area: 'Foyer, stairs and hallways',
    checklist: ['Sweep or vacuum', 'Dust', 'Wipe tables', 'Shoes away', 'Coat closet straight'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: { kind: 'rotation', group: 'kids3', slot: 1 }, due: '21:00',
  },
  {
    id: 'foyer-monthly', title: 'Foyer, stairs and hallways: monthly', area: 'Foyer, stairs and hallways',
    checklist: ['Baseboards', 'Doors and switches', 'Ceiling fans', 'Windows and blinds'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: { kind: 'rotation', group: 'kids3', slot: 1 }, due: '21:00',
  },
  {
    id: 'laundry-weekly', title: 'Laundry room: weekly', area: 'Laundry room',
    checklist: ['Wipe washer, dryer and counters', 'Sweep and mop'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: { kind: 'rotation', group: 'kids3', slot: 2 }, due: '21:00',
  },
  {
    id: 'laundry-monthly', title: 'Laundry room: monthly', area: 'Laundry room',
    checklist: ['Pull out machines and sweep behind', 'Baseboards', 'Washer cleaning cycle', 'Rinse hampers', 'Restock supplies'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: { kind: 'rotation', group: 'kids3', slot: 2 }, due: '21:00',
  },
  {
    id: 'dryer-vent', title: 'Clean the dryer vent duct', area: 'Laundry room', checklist: ['Vent duct cleared'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21, months: [4, 10] }, owner: { kind: 'rotation', group: 'kids3', slot: 2 }, due: '21:00',
  },

  // ---------------- Living and dining (owner not set in the plan) ----------------
  {
    id: 'living-weekly', title: 'Living and dining room: weekly', area: 'Living and dining room',
    checklist: ['Sweep or vacuum', 'Dust', 'Wipe tables', 'Pillows and blankets straight'],
    proof: 'photo', schedule: { kind: 'weekly', due: 5 }, owner: fixed('angela'), due: '21:00',
  },
  {
    id: 'living-monthly', title: 'Living and dining room: monthly', area: 'Living and dining room',
    checklist: ['Baseboards', 'Under cushions', 'Doors and switches', 'Ceiling fans', 'Windows and blinds'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('angela'), due: '21:00',
  },

  // ---------------- Andrew: outside and the house ----------------
  {
    id: 'trash-out', title: 'Trash bins to the street', area: 'Outside', checklist: ['Both bins at the curb'],
    proof: 'photo', schedule: { kind: 'weekly', due: 3 }, owner: fixed('andrew'), byTier: { 3: fixed('max') },
    due: '19:00', note: 'Pickup is Thursday.',
  },
  {
    id: 'trash-back', title: 'Trash bins back behind the house', area: 'Outside', checklist: ['Behind the house, hidden from the street'],
    proof: 'photo', schedule: { kind: 'weekly', due: 4 }, owner: fixed('andrew'), byTier: { 3: fixed('max') },
    due: '19:00', note: 'Behind the house. Not the side, not the front. This has been an HOA issue.',
  },
  {
    id: 'trash-rinse', title: 'Rinse the trash bins', area: 'Outside', checklist: ['Both bins rinsed'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21, months: SPRING_TO_FALL }, owner: fixed('andrew'), byTier: { 3: fixed('max') }, due: '19:00',
  },
  {
    id: 'yard', title: 'Yard work', area: 'Outside', checklist: ['Grass', 'Hedges', 'Weeds', 'Leaves'],
    proof: 'either', schedule: { kind: 'everyNWeeks', n: 2, due: 5, months: [3, 4, 5, 6, 7, 8, 9, 10, 11] }, owner: fixed('andrew'), due: '18:00',
  },
  {
    id: 'flower-beds', title: 'Flower beds and pine straw', area: 'Outside', checklist: ['Beds weeded', 'Fresh pine straw'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21, months: [3, 6, 9, 12] }, owner: fixed('andrew'), due: '18:00',
  },
  {
    id: 'porch', title: 'Porch, walkways and spider webs', area: 'Outside', checklist: ['Porch swept', 'Walkways clear', 'Spider webs down'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 14 }, owner: fixed('andrew'), due: '18:00',
  },
  {
    id: 'gutters', title: 'Clean the gutters', area: 'Outside', checklist: ['Gutters cleared', 'Downspouts flowing'],
    proof: 'either', schedule: { kind: 'monthly', dueDay: 21, months: [5, 11] }, owner: fixed('andrew'), due: '18:00',
  },
  {
    id: 'outside-windows', title: 'Outside windows', area: 'Outside', checklist: ['All outside windows washed'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21, months: [4, 10] }, owner: fixed('andrew'), byTier: { 3: null }, due: '18:00',
  },
  {
    id: 'pressure-wash', title: 'Pressure washing', area: 'Outside', checklist: ['House', 'Deck', 'Driveway'],
    proof: 'either', schedule: { kind: 'asNeeded' }, owner: fixed('andrew'), due: '18:00',
  },
  {
    id: 'garage', title: 'Garage', area: 'Garage', checklist: ['Floor swept', 'Everything in its spot'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('andrew'), due: '21:00',
  },
  {
    id: 'storage-room', title: 'Upstairs storage room', area: 'Storage room', checklist: ['Floor clear', 'Everything in its spot'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 21 }, owner: fixed('andrew'), byTier: { 3: null }, due: '21:00',
  },
  {
    id: 'hvac', title: 'Change the HVAC filters', area: 'House', checklist: ['New filters in', 'Date written on them'],
    proof: 'photo', schedule: { kind: 'monthly', dueDay: 15, months: QUARTERS }, owner: fixed('andrew'), due: '21:00',
  },
  {
    id: 'smoke-detectors', title: 'Test smoke detectors and change batteries', area: 'House', checklist: ['Every detector tested', 'Fresh batteries'],
    proof: 'either', schedule: { kind: 'monthly', dueDay: 15, months: [3, 11] }, owner: fixed('andrew'),
    byTier: { 2: fixed('josh'), 3: fixed('josh') }, due: '21:00',
  },
  {
    id: 'bulb', title: 'Replace a light bulb', area: 'House', checklist: ['Bulb replaced'],
    proof: 'photo', schedule: { kind: 'asNeeded' }, owner: fixed('andrew'), due: '21:00',
    note: 'A parent assigns this to whoever covers that room.',
  },
  {
    id: 'packages', title: 'Bring in packages', area: 'Packages', checklist: ['Packages inside'],
    proof: 'photo', schedule: { kind: 'asNeeded' }, owner: fixed('max'), due: '20:00',
  },
  {
    id: 'garage-cleanout', title: 'Family garage and storage clean-out', area: 'Garage',
    checklist: ['Garage cleared and organized', 'Storage room cleared and organized'],
    proof: 'either', schedule: { kind: 'asNeeded' }, owner: fixed('josh', 'vanilla', 'andrew', 'angela', 'max'), due: '18:00',
  },
];

/** Gaps in the plan, filled with a sensible default. Shown in Settings. */
export const EARL_ASSUMPTIONS: string[] = [
  "Due times: morning walk by 10 AM, after-school walk by 4:30, dishes and sweeping by 9 PM (Tuesday 10 PM, after church), weekly jobs Friday 9 PM, monthly jobs the 21st.",
  "Saturday: beds and Uso's morning care due by 8 AM. Max does Uso's last walk when you get home (due 10 PM).",
  "Picking up Uso's poop in the yard: Monday and Thursday by 6 PM.",
  'Saturday has no kitchen rotation: whoever cooks or eats cleans up after themselves.',
  'Porch, walkways and spider webs: once a month. Pressure washing and light bulbs are assigned by hand when needed.',
  'Gutters: May and November. Outside windows: April and October. HVAC filters: every 3 months. Smoke detectors: March and November.',
  'Living and dining room weekly and monthly: Angela. Kitchen monthly deep clean and swapping towels and sponges: Vanilla.',
  'Nightly front of the house reset (foyer, living and dining room), Sunday to Friday by 9 PM: whoever has the foyer in the rotation that week.',
  'Gutters stay with Andrew on every plan. On his top plan, outside windows and the storage room come off his list with no one named to take them.',
  'Each person signs off their own room photo; Josh and Vanilla approve each other\'s.',
];
