import { Brand } from '@/constants/theme';

export interface CaseStudy {
  id: string;
  title: string;
  category: 'casual' | 'executive' | 'interview';
  description: string;
  contextLine: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMin: number;
  suggestions: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'salary-negotiation',
    title: 'Salary Negotiation',
    category: 'executive',
    description:
      'Practice negotiating your base salary increment with your manager using professional and diplomatic framing.',
    contextLine: 'Salary review session with the VP of Engineering',
    difficulty: 'Advanced',
    durationMin: 10,
    suggestions: [
      'market benchmark',
      'increased scope of impact',
      'achievements aligned with goals',
      'competitive compensation',
    ],
  },
  {
    id: 'ordering-coffee',
    title: 'Ordering at a Cafe',
    category: 'casual',
    description:
      'Practice making orders at a busy NYC cafe, asking for custom milk/espresso preferences, and friendly small talk.',
    contextLine: 'Ordering from a high-paced barista',
    difficulty: 'Beginner',
    durationMin: 5,
    suggestions: ['double shot espresso', 'oat milk flat white', 'extra hot', 'keep the change'],
  },
  {
    id: 'system-design',
    title: 'System Design Interview',
    category: 'interview',
    description:
      'A mock technical interview simulating a staff engineer discussion on database sharding, caching, and horizontal scaling.',
    contextLine: 'Staff Engineer system design interview loop',
    difficulty: 'Advanced',
    durationMin: 15,
    suggestions: [
      'horizontal scaling',
      'cache eviction policy',
      'single point of failure',
      'read replica database',
    ],
  },
  {
    id: 'hotel-checkin',
    title: 'Hotel Check-In',
    category: 'casual',
    description:
      'Confirm a booking, request a room upgrade, and ask for local tourist recommendations at a boutique hotel reception.',
    contextLine: 'Boutique hotel front desk arrival',
    difficulty: 'Intermediate',
    durationMin: 7,
    suggestions: [
      'room upgrade options',
      'booking confirmation',
      'complimentary breakfast',
      'local attractions',
    ],
  },
];

export const CATEGORY_COLORS = {
  casual: { bg: Brand.accentBlueBg, text: Brand.accentBlue, label: 'Casual Chat' },
  executive: { bg: Brand.primaryBadgeBg, text: Brand.primary, label: 'Executive Meeting' },
  interview: { bg: Brand.accentAmberBg, text: Brand.accentAmber, label: 'Mock Interview' },
} as const;
