/* RaGo - category configs: guided trips & cruises. Registers into window.RGTCATS
 * for category-engine.js. Same professional design, own content & booking system. */
(function(){
window.RGTCATS=window.RGTCATS||{};
function reg(k,c){c.key=k;window.RGTCATS[k]=c;}

reg('tours',{
  label:'Tours & Excursions', noun:'tour', heroIcon:'landmark',
  heroBadge:'Guided experiences', heroTitle:'Egypt tours & guided excursions',
  heroSub:'Explore temples, museums and ancient wonders with expert local guides - skip-the-line access and small groups.',
  heroImg:'/img/karnak.png', searchPh:'Search tours, e.g. Luxor, Cairo, museum...',
  included:['Expert licensed Egyptologist guide','Hotel pickup and drop-off','Entrance fees to listed sites','Bottled water'],
  notIncluded:['Lunch and personal expenses','Gratuities','Optional extra sites'],
  booking:{qtyLabel:'Travellers',qtyDefault:2,unit:'/ person',submitLabel:'Book tour'}
});

reg('nile-cruise',{
  label:'Nile Cruises', noun:'cruise', heroIcon:'ship',
  heroBadge:'Sail the Nile', heroTitle:'Nile cruises between Luxor & Aswan',
  heroSub:'Multi-day cruises with full board, guided temple visits and unforgettable sunsets from the deck of the Nile.',
  heroImg:'/img/nile.png', searchPh:'Search cruises, e.g. Luxor, Aswan, 4 nights...',
  included:['Full-board accommodation on board','Guided temple visits','All taxes and port fees','Onboard entertainment'],
  notIncluded:['Drinks and personal expenses','Gratuities','Optional shore excursions'],
  steps:[['Reserve your cabin','Choose your cruise dates and confirm instantly.'],['Board & settle in','Check in to your cabin with full-board service.'],['Sail & explore','Guided visits to the temples along the Nile.'],['Relax on deck','Enjoy sunsets, the pool and onboard dining.']],
  booking:{qtyLabel:'Guests',qtyDefault:2,unit:'/ person',submitLabel:'Reserve cabin'}
});

reg('diving',{
  label:'Diving & Snorkeling', noun:'trip', heroIcon:'waves',
  heroBadge:'Red Sea adventures', heroTitle:'Diving & snorkeling in the Red Sea',
  heroSub:'Discover world-class reefs with certified dive centers - from first-time snorkeling to guided scuba dives.',
  heroImg:'/img/redsea.png', searchPh:'Search dives, e.g. Hurghada, reef, intro dive...',
  included:['Certified dive guide or instructor','All diving and snorkeling equipment','Boat trip and lunch on board','Bottled water and soft drinks'],
  notIncluded:['Underwater camera rental','Gratuities','Certification course fees'],
  steps:[['Book your trip','Pick your date and confirm instantly.'],['Gear up','Get fitted with quality equipment at the marina.'],['Dive in','Guided dives or snorkeling at the best reef spots.'],['Back to shore','Relax on board with lunch and refreshments.']],
  booking:{qtyLabel:'Divers',qtyDefault:2,unit:'/ person',submitLabel:'Book dive'}
});

reg('safari',{
  label:'Desert Safari', noun:'safari', heroIcon:'sun',
  heroBadge:'Desert adventures', heroTitle:'Desert safaris & Bedouin nights',
  heroSub:'Quad bikes, camel rides, stargazing and Bedouin dinners across the golden deserts of Egypt.',
  heroImg:'/img/desert.png', searchPh:'Search safaris, e.g. quad, sunset, Bedouin...',
  included:['Professional safari guide','Quad bike or 4x4 as listed','Bedouin dinner and tea','Hotel pickup and drop-off'],
  notIncluded:['Personal expenses','Gratuities','Optional camel add-ons'],
  steps:[['Book your safari','Choose your date and confirm instantly.'],['Hotel pickup','We collect you in a comfortable 4x4.'],['Ride & explore','Quad biking, camel rides and desert views.'],['Bedouin night','Dinner, tea and stargazing before drop-off.']],
  booking:{qtyLabel:'People',qtyDefault:2,unit:'/ person',submitLabel:'Book safari'}
});
})();
