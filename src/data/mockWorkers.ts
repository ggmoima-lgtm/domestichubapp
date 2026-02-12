export interface Worker {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  reviews: number;
  experience: string;
  monthlyRate: string;
  verified: boolean;
  avatar: string;
  skills: string[];
  bio?: string;
  languages?: string[];
  availability?: string;
  introVideo?: string;
  availabilityStatus?: "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";
  availableFrom?: string | null;
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
    monthlyRate: "R3,500",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    skills: ["Childcare", "Cooking", "First Aid", "Tutoring"],
    bio: "Loving and experienced nanny with a background in early childhood education. I create nurturing environments where children can learn and grow.",
    availability: "Full-time, Mon-Sat",
    introVideo: "https://videos.pexels.com/video-files/3209829/3209829-uhd_2560_1440_25fps.mp4",
  },
  {
    id: "2",
    name: "Rosa Garcia",
    role: "Housekeeper",
    location: "Quezon City",
    rating: 4.8,
    reviews: 89,
    experience: "5 yrs",
    monthlyRate: "R2,800",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    skills: ["Cleaning", "Laundry", "Organizing", "Cooking"],
    bio: "Detail-oriented housekeeper who takes pride in maintaining clean and organized homes. I treat every home as if it were my own.",
    availability: "Part-time, Flexible",
    introVideo: "https://videos.pexels.com/video-files/4108037/4108037-uhd_2732_1440_25fps.mp4",
  },
  {
    id: "3",
    name: "Ana Reyes",
    role: "Elderly Caregiver",
    location: "Pasig",
    rating: 5.0,
    reviews: 64,
    experience: "10 yrs",
    monthlyRate: "R4,200",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    skills: ["Elder Care", "Medication Management", "Physical Therapy", "Companionship"],
    bio: "Compassionate caregiver specializing in elderly care. Certified in basic nursing and medication management.",
    availability: "Live-in or Live-out",
    introVideo: "https://videos.pexels.com/video-files/6129439/6129439-uhd_2732_1440_25fps.mp4",
  },
  {
    id: "4",
    name: "Lucia Mendoza",
    role: "Cook & Housekeeper",
    location: "Taguig",
    rating: 4.7,
    reviews: 52,
    experience: "6 yrs",
    monthlyRate: "R3,200",
    verified: false,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    skills: ["Cooking", "Baking", "Cleaning", "Grocery Shopping"],
    bio: "Skilled home cook with expertise in Filipino and international cuisine. I can prepare healthy meals for the whole family.",
    availability: "Full-time, Mon-Fri",
    introVideo: "https://videos.pexels.com/video-files/4253256/4253256-uhd_2560_1440_30fps.mp4",
  },
  {
    id: "5",
    name: "Carmen Flores",
    role: "Nanny",
    location: "Mandaluyong",
    rating: 4.9,
    reviews: 98,
    experience: "7 yrs",
    monthlyRate: "R3,800",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    skills: ["Infant Care", "Toddler Care", "Education", "Arts & Crafts"],
    bio: "Energetic and creative nanny who loves working with children. I incorporate fun learning activities into daily routines.",
    availability: "Live-in Available",
    introVideo: "https://videos.pexels.com/video-files/6129460/6129460-uhd_2732_1440_25fps.mp4",
  },
  {
    id: "6",
    name: "Elena Cruz",
    role: "All-around Helper",
    location: "Parañaque",
    rating: 4.6,
    reviews: 41,
    experience: "4 yrs",
    monthlyRate: "R2,500",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
    skills: ["Cleaning", "Cooking", "Childcare", "Pet Care"],
    bio: "Versatile helper ready to assist with all household tasks. Hard-working and reliable with excellent references.",
    availability: "Flexible Schedule",
    introVideo: "https://videos.pexels.com/video-files/4108039/4108039-uhd_2732_1440_25fps.mp4",
  },
];

export const categories = [
  { id: "all", label: "All", icon: "Grid3X3" },
  { id: "nanny", label: "Nannies", icon: "Baby" },
  { id: "housekeeper", label: "Housekeepers", icon: "Home" },
  { id: "caregiver", label: "Caregivers", icon: "Heart" },
  { id: "cook", label: "Cooks", icon: "ChefHat" },
];
