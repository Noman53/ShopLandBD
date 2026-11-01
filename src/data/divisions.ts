// Bangladesh Division/District list with Bangla names
export interface Division {
  value: string;
  labelEn: string;
  labelBn: string;
  isDhaka: boolean;
}

export const BANGLADESH_DIVISIONS: Division[] = [
  { value: 'dhaka-city', labelEn: 'Dhaka - City Corporation', labelBn: 'ঢাকা', isDhaka: true },
  { value: 'dhaka-outside', labelEn: 'Dhaka - Outside City Corporation', labelBn: 'ঢাকা সিটি কর্পোরেশনের বাইরে', isDhaka: false },
  { value: 'bagerhat', labelEn: 'Bagerhat', labelBn: 'বাগেরহাট', isDhaka: false },
  { value: 'bandarban', labelEn: 'Bandarban', labelBn: 'বান্দরবান', isDhaka: false },
  { value: 'barguna', labelEn: 'Barguna', labelBn: 'বরগুনা', isDhaka: false },
  { value: 'barisal', labelEn: 'Barisal', labelBn: 'বরিশাল', isDhaka: false },
  { value: 'bhola', labelEn: 'Bhola', labelBn: 'ভোলা', isDhaka: false },
  { value: 'bogra', labelEn: 'Bogra', labelBn: 'বগুড়া', isDhaka: false },
  { value: 'brahmanbaria', labelEn: 'Brahmanbaria', labelBn: 'ব্রাহ্মণবাড়িয়া', isDhaka: false },
  { value: 'chandpur', labelEn: 'Chandpur', labelBn: 'চাঁদপুর', isDhaka: false },
  { value: 'chapai-nawabganj', labelEn: 'Chapai Nawabganj', labelBn: 'চাঁপাইনবাবগঞ্জ', isDhaka: false },
  { value: 'chattogram', labelEn: 'Chattogram', labelBn: 'চট্টগ্রাম', isDhaka: false },
  { value: 'chuadanga', labelEn: 'Chuadanga', labelBn: 'চুয়াডাঙ্গা', isDhaka: false },
  { value: 'comilla', labelEn: 'Comilla', labelBn: 'কুমিল্লা', isDhaka: false },
  { value: 'coxs-bazar', labelEn: "Cox's Bazar", labelBn: 'কক্সবাজার', isDhaka: false },
  { value: 'dinajpur', labelEn: 'Dinajpur', labelBn: 'দিনাজপুর', isDhaka: false },
  { value: 'faridpur', labelEn: 'Faridpur', labelBn: 'ফরিদপুর', isDhaka: false },
  { value: 'feni', labelEn: 'Feni', labelBn: 'ফেনী', isDhaka: false },
  { value: 'gaibandha', labelEn: 'Gaibandha', labelBn: 'গাইবান্ধা', isDhaka: false },
  { value: 'gazipur', labelEn: 'Gazipur', labelBn: 'গাজীপুর', isDhaka: true },
  { value: 'gopalganj', labelEn: 'Gopalganj', labelBn: 'গোপালগঞ্জ', isDhaka: false },
  { value: 'habiganj', labelEn: 'Habiganj', labelBn: 'হবিগঞ্জ', isDhaka: false },
  { value: 'jamalpur', labelEn: 'Jamalpur', labelBn: 'জামালপুর', isDhaka: false },
  { value: 'jashore', labelEn: 'Jashore', labelBn: 'যশোর', isDhaka: false },
  { value: 'jhalokathi', labelEn: 'Jhalokathi', labelBn: 'ঝালকাঠি', isDhaka: false },
  { value: 'jhenaidah', labelEn: 'Jhenaidah', labelBn: 'ঝিনাইদহ', isDhaka: false },
  { value: 'joypurhat', labelEn: 'Joypurhat', labelBn: 'জয়পুরহাট', isDhaka: false },
  { value: 'khagrachari', labelEn: 'Khagrachari', labelBn: 'খাগড়াছড়ি', isDhaka: false },
  { value: 'khulna', labelEn: 'Khulna', labelBn: 'খুলনা', isDhaka: false },
  { value: 'kishoreganj', labelEn: 'Kishoreganj', labelBn: 'কিশোরগঞ্জ', isDhaka: false },
  { value: 'kurigram', labelEn: 'Kurigram', labelBn: 'কুড়িগ্রাম', isDhaka: false },
  { value: 'kushtia', labelEn: 'Kushtia', labelBn: 'কুষ্টিয়া', isDhaka: false },
  { value: 'lakshmipur', labelEn: 'Lakshmipur', labelBn: 'লক্ষ্মীপুর', isDhaka: false },
  { value: 'lalmonirhat', labelEn: 'Lalmonirhat', labelBn: 'লালমনিরহাট', isDhaka: false },
  { value: 'madaripur', labelEn: 'Madaripur', labelBn: 'মাদারীপুর', isDhaka: false },
  { value: 'magura', labelEn: 'Magura', labelBn: 'মাগুরা', isDhaka: false },
  { value: 'manikganj', labelEn: 'Manikganj', labelBn: 'মানিকগঞ্জ', isDhaka: false },
  { value: 'meherpur', labelEn: 'Meherpur', labelBn: 'মেহেরপুর', isDhaka: false },
  { value: 'moulvibazar', labelEn: 'Moulvibazar', labelBn: 'মৌলভীবাজার', isDhaka: false },
  { value: 'munshiganj', labelEn: 'Munshiganj', labelBn: 'মুন্সীগঞ্জ', isDhaka: false },
  { value: 'mymensingh', labelEn: 'Mymensingh', labelBn: 'ময়মনসিংহ', isDhaka: false },
  { value: 'naogaon', labelEn: 'Naogaon', labelBn: 'নওগাঁ', isDhaka: false },
  { value: 'narail', labelEn: 'Narail', labelBn: 'নড়াইল', isDhaka: false },
  { value: 'narayanganj', labelEn: 'Narayanganj', labelBn: 'নারায়ণগঞ্জ', isDhaka: true },
  { value: 'narsingdi', labelEn: 'Narsingdi', labelBn: 'নরসিংদী', isDhaka: false },
  { value: 'natore', labelEn: 'Natore', labelBn: 'নাটোর', isDhaka: false },
  { value: 'netrokona', labelEn: 'Netrokona', labelBn: 'নেত্রকোনা', isDhaka: false },
  { value: 'nilphamari', labelEn: 'Nilphamari', labelBn: 'নীলফামারী', isDhaka: false },
  { value: 'noakhali', labelEn: 'Noakhali', labelBn: 'নোয়াখালী', isDhaka: false },
  { value: 'pabna', labelEn: 'Pabna', labelBn: 'পাবনা', isDhaka: false },
  { value: 'panchagarh', labelEn: 'Panchagarh', labelBn: 'পঞ্চগড়', isDhaka: false },
  { value: 'patuakhali', labelEn: 'Patuakhali', labelBn: 'পটুয়াখালী', isDhaka: false },
  { value: 'pirojpur', labelEn: 'Pirojpur', labelBn: 'পিরোজপুর', isDhaka: false },
  { value: 'rajbari', labelEn: 'Rajbari', labelBn: 'রাজবাড়ী', isDhaka: false },
  { value: 'rajshahi', labelEn: 'Rajshahi', labelBn: 'রাজশাহী', isDhaka: false },
  { value: 'rangamati', labelEn: 'Rangamati', labelBn: 'রাঙ্গামাটি', isDhaka: false },
  { value: 'rangpur', labelEn: 'Rangpur', labelBn: 'রংপুর', isDhaka: false },
  { value: 'satkhira', labelEn: 'Satkhira', labelBn: 'সাতক্ষীরা', isDhaka: false },
  { value: 'shariatpur', labelEn: 'Shariatpur', labelBn: 'শরীয়তপুর', isDhaka: false },
  { value: 'sherpur', labelEn: 'Sherpur', labelBn: 'শেরপুর', isDhaka: false },
  { value: 'sirajganj', labelEn: 'Sirajganj', labelBn: 'সিরাজগঞ্জ', isDhaka: false },
  { value: 'sunamganj', labelEn: 'Sunamganj', labelBn: 'সুনামগঞ্জ', isDhaka: false },
  { value: 'sylhet', labelEn: 'Sylhet', labelBn: 'সিলেট', isDhaka: false },
  { value: 'tangail', labelEn: 'Tangail', labelBn: 'টাঙ্গাইল', isDhaka: false },
  { value: 'thakurgaon', labelEn: 'Thakurgaon', labelBn: 'ঠাকুরগাঁও', isDhaka: false },
];

export function getDivisionLabel(value: string, language: 'bn' | 'en'): string {
  const division = BANGLADESH_DIVISIONS.find(d => d.value === value);
  if (!division) return value;
  return language === 'bn' ? division.labelBn : division.labelEn;
}

export function isDhakaArea(divisionValue: string): boolean {
  const division = BANGLADESH_DIVISIONS.find(d => d.value === divisionValue);
  return division?.isDhaka ?? false;
}
