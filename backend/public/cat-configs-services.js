/* RaGo - category configs: services & lifestyle. Registers into window.RGTCATS
 * for category-engine.js. Same professional design, own content & booking system. */
(function(){
window.RGTCATS=window.RGTCATS||{};
function reg(k,c){c.key=k;window.RGTCATS[k]=c;}

reg('visa',{
  label:'Visa & Entry', noun:'service', heroIcon:'shield',
  heroBadge:'Entry made easy', heroTitle:'Egypt visa and entry services',
  heroSub:'Fast, guided visa assistance and e-visa processing so you can enter Egypt with total peace of mind.',
  heroImg:'/img/giza.png', searchPh:'Search visa services, e.g. e-visa, on arrival...',
  included:['Application review by an expert','Document checklist and guidance','Submission and status tracking','Email and chat support'],
  notIncluded:['Government visa fees','Passport photos','Courier fees where applicable'],
  steps:[['Choose your service','Pick the visa type and confirm instantly.'],['Share your documents','Upload your passport and details securely.'],['We process it','Our team reviews and submits your application.'],['Receive your approval','Get your e-visa or confirmation by email.']],
  includedLabel:'Service includes',
  booking:{dateLabel:'Travel date',qtyLabel:'Applicants',qtyDefault:1,unit:'/ applicant',submitLabel:'Apply now'}
});

reg('insurance',{
  label:'Travel Insurance', noun:'plan', heroIcon:'shield',
  heroBadge:'Travel protected', heroTitle:'Travel insurance for your trip to Egypt',
  heroSub:'Flexible medical and travel cover with instant policy issuance and 24/7 emergency assistance.',
  heroImg:'/img/giza.png', searchPh:'Search plans, e.g. medical, single trip...',
  included:['Medical cover during your trip','24/7 emergency assistance','Instant digital policy','Trip cancellation options'],
  notIncluded:['Pre-existing conditions unless declared','High-risk activities unless added','Personal deductibles'],
  includedLabel:'Coverage includes',
  booking:{dateLabel:'Start date',qtyLabel:'Travellers',qtyDefault:1,unit:'/ traveller',submitLabel:'Get covered'}
});

reg('sim',{
  label:'SIM & eSIM', noun:'plan', heroIcon:'refresh',
  heroBadge:'Stay connected', heroTitle:'Egypt SIM and eSIM data plans',
  heroSub:'Get online the moment you land with affordable local data, calls and instant eSIM delivery.',
  heroImg:'/img/giza.png', searchPh:'Search plans, e.g. eSIM, 20GB, tourist...',
  included:['Local data allowance','Egyptian mobile number','Instant eSIM or airport pickup','Setup support'],
  notIncluded:['Device unlock','International roaming','Top-ups beyond the plan'],
  steps:[['Choose your plan','Pick your data plan and confirm instantly.'],['Get your SIM','Instant eSIM by email or pickup on arrival.'],['Activate in minutes','Follow the simple setup steps.'],['Stay connected','Support available throughout your trip.']],
  includedLabel:'Package includes',
  booking:{dateLabel:'Delivery date',qtyLabel:'SIM cards',qtyDefault:1,unit:'/ SIM',submitLabel:'Get SIM'}
});

reg('guide',{
  label:'Private Guides', noun:'guide', heroIcon:'award',
  heroBadge:'Local experts', heroTitle:'Private licensed tour guides in Egypt',
  heroSub:'Book a licensed private Egyptologist to bring history to life at your own pace, in your language.',
  heroImg:'/img/karnak.png', searchPh:'Search guides, e.g. Cairo, Luxor, language...',
  included:['Licensed private guide for the day','Personalised itinerary','Flexible pace and stops','Local insights and tips'],
  notIncluded:['Transport unless listed','Entrance fees','Meals and gratuities'],
  includedLabel:'Service includes',
  booking:{dateLabel:'Date',qtyLabel:'Travellers',qtyDefault:2,unit:'/ day',submitLabel:'Book guide'}
});

reg('pharmacy',{
  label:'Pharmacy & Care', noun:'service', heroIcon:'shield',
  heroBadge:'Care on demand', heroTitle:'Pharmacy and health essentials delivered',
  heroSub:'Trusted pharmacies delivering medicines, health essentials and travel wellness items to your hotel.',
  heroImg:'/img/cat-pharmacy.jpg', searchPh:'Search pharmacy, e.g. medicine, first aid...',
  included:['Verified licensed pharmacy','Delivery to your hotel','Genuine products','Pharmacist guidance'],
  notIncluded:['Prescription-only items without a valid prescription','Controlled substances','Items out of stock'],
  includedLabel:'Order includes',
  booking:{dateLabel:'Delivery date',qtyLabel:'Orders',qtyDefault:1,unit:'/ order',submitLabel:'Order now'}
});

reg('dining',{
  label:'Dining & Restaurants', noun:'venue', heroIcon:'award',
  heroBadge:'Taste Egypt', heroTitle:'Restaurant reservations and dining experiences',
  heroSub:'Reserve tables at top restaurants and unique dining experiences, from Nile-side dinners to local gems.',
  heroImg:'/img/nile.png', searchPh:'Search dining, e.g. seafood, Nile view...',
  included:['Confirmed table reservation','Curated menu options','Special requests where possible','Instant confirmation'],
  notIncluded:['Food and drinks bill','Gratuities','Private room unless listed'],
  steps:[['Choose a venue','Pick your restaurant and confirm instantly.'],['Reserve your table','Select date, time and party size.'],['Get confirmed','Receive your reservation voucher.'],['Enjoy your meal','Just show up and enjoy.']],
  includedLabel:'Experience includes',
  booking:{dateLabel:'Reservation date',qtyLabel:'Guests',qtyDefault:2,unit:'/ person',submitLabel:'Reserve table'}
});

reg('shopping',{
  label:'Shopping & Bazaars', noun:'experience', heroIcon:'tag',
  heroBadge:'Discover and shop', heroTitle:'Guided shopping and bazaar experiences',
  heroSub:'Explore authentic bazaars and modern malls with a local host who helps you find the best and fairest deals.',
  heroImg:'/img/giza.png', searchPh:'Search shopping, e.g. Khan el-Khalili, gold...',
  included:['Local shopping host','Guided bazaar route','Bargaining assistance','Hotel pickup where listed'],
  notIncluded:['Your purchases','Gratuities','Shipping of items'],
  includedLabel:'Experience includes',
  booking:{dateLabel:'Date',qtyLabel:'People',qtyDefault:2,unit:'/ person',submitLabel:'Book experience'}
});

reg('spa',{
  label:'Spa & Wellness', noun:'treatment', heroIcon:'sun',
  heroBadge:'Relax and recharge', heroTitle:'Spa, massage and wellness in Egypt',
  heroSub:'Unwind with professional spa treatments, massages and wellness sessions at trusted venues.',
  heroImg:'/img/cat-spa.jpg', searchPh:'Search spa, e.g. massage, hammam...',
  included:['Professional therapist','Choice of treatment','Relaxation facilities','Fresh towels and amenities'],
  notIncluded:['Gratuities','Add-on treatments','Transport'],
  includedLabel:'Session includes',
  booking:{dateLabel:'Appointment date',qtyLabel:'Guests',qtyDefault:1,unit:'/ session',submitLabel:'Book session'}
});

reg('events',{
  label:'Events & Shows', noun:'event', heroIcon:'award',
  heroBadge:'Unmissable moments', heroTitle:'Shows, events and live experiences',
  heroSub:'Book tickets to sound and light shows, concerts and cultural events across Egypt with instant confirmation.',
  heroImg:'/img/nile.png', searchPh:'Search events, e.g. sound and light, show...',
  included:['Confirmed event ticket','Seat as per category','Instant e-ticket','Entry support'],
  notIncluded:['Transport to the venue','Food and drinks','Gratuities'],
  includedLabel:'Ticket includes',
  booking:{dateLabel:'Event date',qtyLabel:'Tickets',qtyDefault:2,unit:'/ ticket',submitLabel:'Get tickets'}
});
})();
