/* =====================================================================
 * RaGo - Per-category service field definitions (frontend-only, additive)
 * Consumed by dashboard-svc-editor.js to render tailored, professional
 * options for each service type. Values are persisted to service.meta.
 * Field types: text | textarea | number | select | checkbox | multi
 * ===================================================================== */
window.RGP_SVC_FIELDS = {
  "airport": [
    {"k":"direction","l":"Service direction","t":"select","o":["Arrival","Departure","Both"]},
    {"k":"vehicle_type","l":"Vehicle type","t":"select","o":["Sedan","SUV","Van","Minibus","Bus"]},
    {"k":"passengers","l":"Max passengers","t":"number"},
    {"k":"luggage","l":"Luggage capacity","t":"number"},
    {"k":"route","l":"Route (from - to)","t":"text","p":"e.g. Cairo Airport - Downtown hotel"},
    {"k":"waiting_time","l":"Free waiting time","t":"text","p":"e.g. 60 minutes"},
    {"k":"meet_greet","l":"Meet & greet at the gate","t":"checkbox"},
    {"k":"flight_tracking","l":"Flight tracking included","t":"checkbox"}
  ],
  "visa": [
    {"k":"visa_types","l":"Visa types offered","t":"multi","p":"Tourist, Business, ..."},
    {"k":"entry_type","l":"Entry type","t":"select","o":["Single entry","Multiple entry"]},
    {"k":"processing_time","l":"Processing time","t":"text","p":"e.g. 3-5 business days"},
    {"k":"validity","l":"Validity","t":"text","p":"e.g. 30 days"},
    {"k":"gov_fee","l":"Government fee","t":"number"},
    {"k":"appointment_needed","l":"Appointment required","t":"checkbox"},
    {"k":"required_docs","l":"Required documents","t":"textarea","p":"Passport, photo, ..."}
  ],
  "transfers": [
    {"k":"vehicle_type","l":"Vehicle type","t":"select","o":["Sedan","SUV","Van","Minibus","Bus"]},
    {"k":"passengers","l":"Max passengers","t":"number"},
    {"k":"trip_type","l":"Trip type","t":"select","o":["One-way","Round-trip"]},
    {"k":"from","l":"From","t":"text"},
    {"k":"to","l":"To","t":"text"},
    {"k":"luggage","l":"Luggage capacity","t":"number"},
    {"k":"driver_languages","l":"Driver languages","t":"multi","p":"English, Arabic, ..."},
    {"k":"child_seat","l":"Child seat available","t":"checkbox"}
  ],
  "hotels": [
    {"k":"stars","l":"Star rating","t":"select","o":["1","2","3","4","5"]},
    {"k":"room_types","l":"Room types","t":"multi","p":"Standard, Deluxe, Suite"},
    {"k":"board","l":"Board basis","t":"select","o":["Room only","Bed & breakfast","Half board","Full board","All inclusive"]},
    {"k":"checkin","l":"Check-in time","t":"text","p":"e.g. 14:00"},
    {"k":"checkout","l":"Check-out time","t":"text","p":"e.g. 12:00"},
    {"k":"amenities","l":"Amenities","t":"multi","p":"Pool, WiFi, Spa, ..."},
    {"k":"free_cancellation","l":"Free cancellation","t":"checkbox"}
  ],
  "internal-trips": [
    {"k":"trip_type","l":"Trip type","t":"select","o":["Group","Private"]},
    {"k":"destination","l":"Destination","t":"text","p":"e.g. Luxor & Aswan"},
    {"k":"days","l":"Number of days","t":"number"},
    {"k":"transport","l":"Transport","t":"select","o":["Bus","Van","Private car","Flight","Train","Boat","Mixed"]},
    {"k":"meeting_point","l":"Meeting / pickup point","t":"text"},
    {"k":"pickup_included","l":"Hotel pickup included","t":"checkbox"},
    {"k":"min_pax","l":"Minimum travellers","t":"number"},
    {"k":"max_pax","l":"Maximum travellers","t":"number"},
    {"k":"guide_languages","l":"Guide languages","t":"multi","p":"English, Arabic, ..."},
    {"k":"difficulty","l":"Difficulty level","t":"select","o":["Easy","Moderate","Challenging"]},
    {"k":"itinerary","l":"Day-by-day itinerary","t":"textarea","p":"One line per day"},
    {"k":"includes","l":"What is included","t":"textarea"},
    {"k":"excludes","l":"What is not included","t":"textarea"}
  ],
  "tours": [
    {"k":"tour_type","l":"Tour type","t":"select","o":["Group","Private"]},
    {"k":"duration_hours","l":"Duration (hours)","t":"number"},
    {"k":"guide_languages","l":"Guide languages","t":"multi"},
    {"k":"pickup_included","l":"Hotel pickup included","t":"checkbox"},
    {"k":"wheelchair","l":"Wheelchair accessible","t":"checkbox"},
    {"k":"highlights","l":"Highlights","t":"textarea"},
    {"k":"includes","l":"What is included","t":"textarea"},
    {"k":"excludes","l":"What is not included","t":"textarea"}
  ],
  "nile-cruise": [
    {"k":"route","l":"Cruise route","t":"select","o":["Luxor to Aswan","Aswan to Luxor","Round trip"]},
    {"k":"nights","l":"Number of nights","t":"number"},
    {"k":"cabin_types","l":"Cabin types","t":"multi","p":"Standard, Deluxe, Suite"},
    {"k":"board","l":"Board basis","t":"select","o":["Half board","Full board","All inclusive"]},
    {"k":"facilities","l":"On-board facilities","t":"multi","p":"Pool, Sun deck, ..."},
    {"k":"excursions_included","l":"Excursions included","t":"checkbox"}
  ],
  "diving": [
    {"k":"dive_type","l":"Dive type","t":"select","o":["Intro dive","Certified dive","Course","Snorkeling"]},
    {"k":"dives_count","l":"Number of dives","t":"number"},
    {"k":"depth","l":"Max depth","t":"text","p":"e.g. 18m"},
    {"k":"entry","l":"Entry","t":"select","o":["Boat","Shore"]},
    {"k":"equipment_included","l":"Equipment included","t":"checkbox"},
    {"k":"license_required","l":"Diving license required","t":"checkbox"},
    {"k":"courses","l":"Courses offered","t":"multi","p":"Open Water, Advanced, ..."}
  ],
  "safari": [
    {"k":"safari_type","l":"Safari type","t":"select","o":["Jeep 4x4","Camel","Quad bike","Walking","Mixed"]},
    {"k":"duration","l":"Duration","t":"text","p":"e.g. 3 hours"},
    {"k":"overnight","l":"Overnight camping","t":"checkbox"},
    {"k":"pickup_included","l":"Hotel pickup included","t":"checkbox"},
    {"k":"group_size","l":"Max group size","t":"number"},
    {"k":"includes","l":"What is included","t":"textarea"}
  ],
  "carrental": [
    {"k":"car_type","l":"Car category","t":"select","o":["Economy","Compact","SUV","Luxury","Van"]},
    {"k":"transmission","l":"Transmission","t":"select","o":["Manual","Automatic"]},
    {"k":"seats","l":"Seats","t":"number"},
    {"k":"with_driver","l":"With driver","t":"checkbox"},
    {"k":"fuel_policy","l":"Fuel policy","t":"select","o":["Full to full","Prepaid","Same to same"]},
    {"k":"mileage","l":"Mileage","t":"text","p":"e.g. Unlimited / 200km per day"},
    {"k":"min_days","l":"Minimum rental days","t":"number"},
    {"k":"insurance_included","l":"Insurance included","t":"checkbox"}
  ],
  "guide": [
    {"k":"languages","l":"Languages spoken","t":"multi"},
    {"k":"specialties","l":"Specialties","t":"multi","p":"History, Diving, Food, ..."},
    {"k":"regions","l":"Regions covered","t":"multi"},
    {"k":"years_experience","l":"Years of experience","t":"number"},
    {"k":"licensed","l":"Officially licensed","t":"checkbox"},
    {"k":"service_type","l":"Service type","t":"select","o":["Group","Private","Both"]}
  ],
  "sim": [
    {"k":"sim_type","l":"Type","t":"select","o":["Physical SIM","eSIM"]},
    {"k":"data","l":"Data allowance","t":"text","p":"e.g. 20 GB"},
    {"k":"validity_days","l":"Validity (days)","t":"number"},
    {"k":"network","l":"Network / operator","t":"text"},
    {"k":"calls_included","l":"Calls & SMS included","t":"checkbox"},
    {"k":"delivery","l":"Delivery method","t":"select","o":["Airport pickup","Hotel delivery","Instant eSIM"]}
  ],
  "dining": [
    {"k":"cuisine","l":"Cuisine","t":"multi","p":"Egyptian, Seafood, ..."},
    {"k":"meal_types","l":"Meals served","t":"multi","p":"Breakfast, Lunch, Dinner"},
    {"k":"seating","l":"Seating","t":"select","o":["Indoor","Outdoor","Both"]},
    {"k":"reservation_required","l":"Reservation required","t":"checkbox"},
    {"k":"halal","l":"Halal","t":"checkbox"},
    {"k":"menu","l":"Menu highlights","t":"textarea"}
  ],
  "shopping": [
    {"k":"product_types","l":"Product types","t":"multi","p":"Souvenirs, Spices, ..."},
    {"k":"brands","l":"Brands","t":"multi"},
    {"k":"delivery_available","l":"Delivery available","t":"checkbox"},
    {"k":"gift_wrap","l":"Gift wrapping","t":"checkbox"},
    {"k":"return_policy","l":"Return policy","t":"textarea"}
  ],
  "spa": [
    {"k":"services","l":"Treatments offered","t":"multi","p":"Massage, Sauna, ..."},
    {"k":"duration","l":"Session duration","t":"text","p":"e.g. 60 minutes"},
    {"k":"gender","l":"Guests accepted","t":"select","o":["Male","Female","Both"]},
    {"k":"home_service","l":"Home / hotel service","t":"checkbox"},
    {"k":"booking_required","l":"Booking required","t":"checkbox"}
  ],
  "events": [
    {"k":"event_types","l":"Event types","t":"multi","p":"Concert, Show, Festival"},
    {"k":"venue","l":"Venue","t":"text"},
    {"k":"capacity","l":"Capacity","t":"number"},
    {"k":"schedule","l":"Date & time","t":"text"},
    {"k":"ticket_types","l":"Ticket types","t":"multi","p":"Standard, VIP, ..."},
    {"k":"includes","l":"What is included","t":"textarea"}
  ],
  "insurance": [
    {"k":"coverage_types","l":"Coverage types","t":"multi","p":"Medical, Baggage, ..."},
    {"k":"coverage_amount","l":"Coverage amount","t":"text","p":"e.g. up to 50,000 USD"},
    {"k":"duration","l":"Coverage duration","t":"text","p":"e.g. per trip / 30 days"},
    {"k":"age_limit","l":"Age limit","t":"text"},
    {"k":"covid_covered","l":"COVID-19 covered","t":"checkbox"},
    {"k":"claim_process","l":"Claim process","t":"textarea"}
  ],
  "departure": [
    {"k":"vehicle_type","l":"Vehicle type","t":"select","o":["Sedan","SUV","Van","Minibus","Bus"]},
    {"k":"passengers","l":"Max passengers","t":"number"},
    {"k":"pickup_location","l":"Pickup location","t":"text"},
    {"k":"airport","l":"Destination airport","t":"text"},
    {"k":"luggage","l":"Luggage capacity","t":"number"},
    {"k":"checkin_assist","l":"Check-in assistance","t":"checkbox"}
  ],
  "pharmacy": [
    {"k":"service_types","l":"Services offered","t":"multi","p":"Prescriptions, First aid, ..."},
    {"k":"delivery_available","l":"Delivery available","t":"checkbox"},
    {"k":"prescription_required","l":"Prescription required","t":"checkbox"},
    {"k":"open_24","l":"Open 24 hours","t":"checkbox"},
    {"k":"languages","l":"Languages spoken","t":"multi"}
  ]
};
