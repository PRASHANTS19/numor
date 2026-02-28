const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwib3JnSWQiOiIxIiwicm9sZSI6IlNNRV9VU0VSIiwidXNlclR5cGUiOiJJTlRFUk5BTCIsInNlc3Npb25JZCI6Ijk2NmMzOWVkLTQ1MmYtNGU3Ny04NjEwLTIyOTdhNDM0ZDNiOSIsImlhdCI6MTc3MjI3ODM0MCwiZXhwIjoxNzcyODgzMTQwfQ.fFBRy9UTZdJeP6O5K6gTbepWOQ94d_dAon4cdjFuEGg"
if (!TOKEN) { console.error("Usage: node seed-clients.js <token>"); process.exit(1); }

const clients = [
  { name: "Reliance Digital Solutions", email: "accounts@reliancedigital.in", phone: "+91-22-4567-8901", streetAddress: "Bandra Kurla Complex", city: "Mumbai", state: "Maharashtra", zipCode: "400051", country: "India" },
  { name: "Tata Consultancy Exports", email: "finance@tataexports.in", phone: "+91-80-2345-6789", streetAddress: "Electronic City Phase 1", city: "Bengaluru", state: "Karnataka", zipCode: "560100", country: "India" },
  { name: "Infosys Green Tech", email: "billing@infosysgreen.in", phone: "+91-40-6789-0123", streetAddress: "HITEC City Road", city: "Hyderabad", state: "Telangana", zipCode: "500081", country: "India" },
  { name: "Pondicherry Spice Traders", email: "accounts@pondispice.in", phone: "+91-413-222-3344", streetAddress: "12 Mission Street, White Town", city: "Puducherry", state: "Puducherry", zipCode: "605001", country: "India" },
  { name: "Chandigarh IT Services Pvt Ltd", email: "billing@chandigarhit.in", phone: "+91-172-456-7890", streetAddress: "SCO 45, Sector 17-C", city: "Chandigarh", state: "Chandigarh", zipCode: "160017", country: "India" },
  { name: "Emirates Trading Co", email: "info@emiratestrading.ae", phone: "+971-4-345-6789", streetAddress: "Sheikh Zayed Road, Tower 3", city: "Dubai", state: "Dubai", zipCode:"12345" , country:"UAE" },
  { name: "Abu Dhabi Logistics LLC", email: "ops@adlogistics.ae", phone: "+971-2-678-9012", streetAddress:"Al Maryah Island" , city:"Abu Dhabi" , state:"Abu Dhabi" , zipCode:"45678" , country:"UAE"},
  { name: "Pacific Ridge Technologies", email: "ap@pacificridge.com", phone:"+1-415-555-0142" , streetAddress:"450 Market Street" , city:"San Francisco" , state:"California" , zipCode:"94105" , country:"US"},
  { name : 'Liberty Financial Group', email : 'invoices@libertyfinancial.com', phone : '+1-212-555-0198', streetAddress : '200 Park Avenue', city : 'New York', state : 'New York', zipCode : '10166', country : 'US'},
  { name : 'Thames Digital Media', email : 'accounts@thamesdigital.co.uk', phone : '+44-20-7946-0958', streetAddress : '14 Canary Wharf', city : 'London', state : 'Greater London', zipCode :'E14 5AB' , country :'UK'},
  { name : 'Manchester Steel Works', email : 'finance@manchestersteel.co.uk', phone : '+44-161-496-0723', streetAddress :'58 Deansgate' , city :'Manchester' , state :'Greater Manchester' , zipCode :'M3 2EG' , country :'UK'},
  { name :"Berlin Autotech GmbH" , email :"rechnung@berlinautotech.de" , phone:"+49-30-1234-5678" , streetAddress :"Friedrichstraße 112" , city :"Berlin" , state :"Berlin" , zipCode :"10117" , country :"Germany"},
  { name:"Lyon Patisserie SARL" , email:"compta@lyonpatisserie.fr" , phone:"+33-4-7890-1234" , street:"25 Rue de la République" , city:"Lyon" , state:"Auvergne-Rhône-Alpes" , zipCode:"69002" , country:"France"},
  { name:"Amsterdam Green Energy BV" , email:"billing@amgreenenergy.nl" , phone:"+31-20-555-0147" , street:"Herengracht 182" , city:"Amsterdam" , state:"North Holland" , zipCode:"1016 BR" , country:"Netherlands"},
  { name:"Madrid Solar Innovations SL" , email:"factura@madridsolar.es" , phone:"+34-91-123-4567" , street:"Calle Gran Vía 32" , city:"Madrid" , state:"Community of Madrid" , zipCode :"28013 ", country :"Spain"},
  { name : 'Milano Fashion House SRL', email : 'contabilita@milanofashion.it', phone : '+39-02-8765-4321', street : 'Via Montenapoleone 8', city : 'Milan', state : 'Lombardy', zipCode : '20121', country : 'Italy'},
];

(async () => {
  for (const c of clients) {
    try {
      const res = await fetch("https://backend.numor.app/api/clients/createClient/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(c),
      });
      const data = await res.json();
      console.log(`✅ ${c.name} (${c.country}):`, res.ok ? "created" : data);
    } catch (e) {
      console.error(`❌ ${c.name}:`, e.message);
    }
  }
  console.log("Done!");
})();
