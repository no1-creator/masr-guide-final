/* RaGo - category configs: transport & stays. Registers into window.RGTCATS
 * for category-engine.js. Same professional design, own content & booking system. */
(function(){
window.RGTCATS=window.RGTCATS||{};
function reg(k,c){c.key=k;window.RGTCATS[k]=c;}

reg('airport',{
  label:'Airport Transfers', noun:'transfer', heroIcon:'clock',
  heroBadge:'Arrive stress-free', heroTitle:'Airport pickup and transfers in Egypt',
  heroSub:'Private meet-and-greet transfers with flight tracking - your driver is waiting the moment you land.',
  heroImg:'/img/cat-airport.jpg', searchPh:'Search transfers, e.g. Cairo airport, Hurghada...',
  included:['Meet and greet at the arrivals hall','Private air-conditioned vehicle','Flight tracking and wait time included','Free bottled water'],
  notIncluded:['Gratuities','Extra stops on request','Child seat unless requested'],
  steps:[['Book your transfer','Enter your flight and confirm instantly.'],['We track your flight','Your driver adjusts to delays automatically.'],['Meet and greet','Your driver waits at arrivals with a name sign.'],['Door to door','Comfortable ride straight to your hotel.']],
  includedLabel:'Transfer includes',
  booking:{dateLabel:'Pickup date',datePlaceholder:'Choose pickup date',qtyLabel:'Passengers',qtyDefault:2,unit:'/ transfer',submitLabel:'Book transfer'}
});

reg('transfers',{
  label:'Transfers & Rides', noun:'transfer', heroIcon:'pin',
  heroBadge:'Get around easily', heroTitle:'Private transfers and rides across Egypt',
  heroSub:'Comfortable city-to-city and point-to-point transfers with professional drivers and fixed prices.',
  heroImg:'/img/cat-transfers.jpg', searchPh:'Search rides, e.g. Luxor to Aswan, city ride...',
  included:['Private air-conditioned vehicle','Professional English-speaking driver','All tolls and taxes','Free bottled water'],
  notIncluded:['Gratuities','Extra stops on request','Entry tickets'],
  includedLabel:'Transfer includes',
  booking:{dateLabel:'Travel date',qtyLabel:'Passengers',qtyDefault:2,unit:'/ transfer',submitLabel:'Book transfer'}
});

reg('carrental',{
  label:'Car Rental', noun:'car', heroIcon:'card',
  heroBadge:'Drive your way', heroTitle:'Car rental across Egypt',
  heroSub:'Fully insured cars with unlimited mileage and flexible pickup - with or without a driver.',
  heroImg:'/img/cat-transfers.jpg', searchPh:'Search cars, e.g. SUV, automatic, Cairo...',
  included:['Fully insured vehicle','Unlimited mileage','24/7 roadside assistance','Free cancellation'],
  notIncluded:['Fuel','Optional driver','Young-driver fee'],
  steps:[['Choose your car','Pick your dates and confirm instantly.'],['Verify your details','Upload your license and ID securely.'],['Pick up the car','Collect at the airport or your hotel.'],['Drive and return','Return at the agreed time and place.']],
  includedLabel:'Rental includes',
  booking:{dateLabel:'Pickup date',qtyLabel:'Vehicles',qtyDefault:1,unit:'/ day',submitLabel:'Reserve car'}
});

reg('hotels',{
  label:'Hotels & Stays', noun:'stay', heroIcon:'badge',
  heroBadge:'Rest well', heroTitle:'Hotels and stays across Egypt',
  heroSub:'From Red Sea resorts to Nile-view city hotels - handpicked stays with instant confirmation.',
  heroImg:'/img/cat-hotels.jpg', searchPh:'Search hotels, e.g. Cairo, resort, Nile view...',
  included:['Selected room with daily housekeeping','Breakfast as listed','Free Wi-Fi','24/7 front desk'],
  notIncluded:['City tax where applicable','Extra meals and minibar','Airport transfer unless listed'],
  steps:[['Choose your room','Select your check-in date and confirm instantly.'],['Instant confirmation','You receive your booking voucher by email.'],['Check in','Present your voucher and ID at the front desk.'],['Enjoy your stay','24/7 support throughout your stay.']],
  includedLabel:'Your stay includes',
  booking:{dateLabel:'Check-in',qtyLabel:'Guests',qtyDefault:2,unit:'/ night',submitLabel:'Reserve room'}
});

reg('departure',{
  label:'Departure Transfers', noun:'transfer', heroIcon:'clock',
  heroBadge:'Leave on time', heroTitle:'Departure and airport drop-off transfers',
  heroSub:'Reliable, on-time drop-off to the airport timed to your flight, so you never rush your departure.',
  heroImg:'/img/cat-airport.jpg', searchPh:'Search transfers, e.g. hotel to airport...',
  included:['Private air-conditioned vehicle','Professional driver','Flight-time based pickup','Free bottled water'],
  notIncluded:['Gratuities','Extra stops','Excess luggage handling'],
  includedLabel:'Transfer includes',
  booking:{dateLabel:'Departure date',qtyLabel:'Passengers',qtyDefault:2,unit:'/ transfer',submitLabel:'Book departure'}
});
})();
