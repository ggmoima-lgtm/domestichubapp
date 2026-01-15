export interface Worker {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  reviews: number;
  experience: string;
  hourlyRate: string;
  verified: boolean;
  avatar: string;
  skills: string[];
  bio?: string;
  languages?: string[];
  availability?: string;
}

export const mockWorkers: Worker[] = [
  {
    id: "1",
    name: "Maria Santos",
    role: "Nanny & Caregiver",
    location: "Makati",
    rating: 4.9,
    reviews: 127,
    experience: "8 yrs",
    hourlyRate: "₱150",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    skills: ["Childcare", "Cooking", "First Aid", "Tutoring"],
    bio: "Loving and experienced nanny with a background in early childhood education. I create nurturing environments where children can learn and grow.",
    availability: "Full-time, Mon-Sat",
  },
  {
    id: "2",
    name: "Rosa Garcia",
    role: "Housekeeper",
    location: "Quezon City",
    rating: 4.8,
    reviews: 89,
    experience: "5 yrs",
    hourlyRate: "₱120",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    skills: ["Cleaning", "Laundry", "Organizing", "Cooking"],
    bio: "Detail-oriented housekeeper who takes pride in maintaining clean and organized homes. I treat every home as if it were my own.",
    availability: "Part-time, Flexible",
  },
  {
    id: "3",
    name: "Ana Reyes",
    role: "Elderly Caregiver",
    location: "Pasig",
    rating: 5.0,
    reviews: 64,
    experience: "10 yrs",
    hourlyRate: "₱180",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    skills: ["Elder Care", "Medication Management", "Physical Therapy", "Companionship"],
    bio: "Compassionate caregiver specializing in elderly care. Certified in basic nursing and medication management.",
    availability: "Live-in or Live-out",
  },
  {
    id: "4",
    name: "Lucia Mendoza",
    role: "Cook & Housekeeper",
    location: "Taguig",
    rating: 4.7,
    reviews: 52,
    experience: "6 yrs",
    hourlyRate: "₱140",
    verified: false,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    skills: ["Cooking", "Baking", "Cleaning", "Grocery Shopping"],
    bio: "Skilled home cook with expertise in Filipino and international cuisine. I can prepare healthy meals for the whole family.",
    availability: "Full-time, Mon-Fri",
  },
  {
    id: "5",
    name: "Carmen Flores",
    role: "Nanny",
    location: "Mandaluyong",
    rating: 4.9,
    reviews: 98,
    experience: "7 yrs",
    hourlyRate: "₱160",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    skills: ["Infant Care", "Toddler Care", "Education", "Arts & Crafts"],
    bio: "Energetic and creative nanny who loves working with children. I incorporate fun learning activities into daily routines.",
    availability: "Live-in Available",
  },
  {
    id: "6",
    name: "Elena Cruz",
    role: "All-around Helper",
    location: "Parañaque",
    rating: 4.6,
    reviews: 41,
    experience: "4 yrs",
    hourlyRate: "₱110",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
    skills: ["Cleaning", "Cooking", "Childcare", "Pet Care"],
    bio: "Versatile helper ready to assist with all household tasks. Hard-working and reliable with excellent references.",
    availability: "Flexible Schedule",
  },
];

export const categories = [
  { id: "all", label: "All", icon: "Grid3X3" },
  { id: "nanny", label: "Nannies", icon: "Baby" },
  { id: "housekeeper", label: "Housekeepers", icon: "Home" },
  { id: "caregiver", label: "Caregivers", icon: "Heart" },
  { id: "cook", label: "Cooks", icon: "ChefHat" },
];
