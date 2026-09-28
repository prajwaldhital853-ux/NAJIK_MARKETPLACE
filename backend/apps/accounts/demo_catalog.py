"""Realistic Nepal marketplace demo catalog for seed_demo_sellers."""
import random

# Phone range: +9779841234501 .. +9779841235500 (1000 sellers max)
PHONE_BASE = 9779841234501
PHONE_MAX_SELLERS = 1000

FIRST_NAMES = [
    "Ramesh", "Sita", "Bikash", "Anita", "Suresh", "Maya", "Prakash", "Sunita", "Rajesh", "Pooja",
    "Amit", "Deepa", "Kiran", "Nisha", "Arjun", "Priya", "Sanjay", "Kavita", "Manoj", "Rekha",
    "Hari", "Gita", "Dipesh", "Anjali", "Ravi", "Sangita", "Nabin", "Laxmi", "Ashok", "Rita",
    "Binod", "Mina", "Gopal", "Sarita", "Prem", "Kalpana", "Dinesh", "Parbati", "Yogesh", "Shanti",
    "Sabina", "Roshan", "Anusha", "Suman", "Bishal", "Puja", "Niraj", "Sneha", "Prabin", "Ritu",
    "Kamal", "Sabita", "Sudip", "Mamata", "Bikram", "Anu", "Rajan", "Shreya", "Nischal", "Kopila",
]

LAST_NAMES = [
    "Kumar", "Sharma", "Thapa", "Rai", "Karki", "Gurung", "Shrestha", "Magar", "Tamang", "Adhikari",
    "Pandey", "Joshi", "Bhandari", "Maharjan", "Basnet", "Kc", "Dahal", "Bhattarai", "Nepal", "Lama",
    "Chaudhary", "Yadav", "Mishra", "Ghimire", "Poudel", "Subedi", "Rana", "Bista", "Khatri", "Oli",
]

LOCATIONS = [
    ("Thamel, Kathmandu", "Kathmandu", "Kathmandu"),
    ("New Road, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Baneshwor, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Koteshwor, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Balaju, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Bouddha, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Kalanki, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Chabahil, Kathmandu", "Kathmandu", "Kathmandu"),
    ("Patan Dhoka, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Kupondole, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Jawalakhel, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Pulchowk, Lalitpur", "Lalitpur", "Lalitpur"),
    ("Bhaktapur Durbar Square", "Bhaktapur", "Bhaktapur"),
    ("Suryabinayak, Bhaktapur", "Bhaktapur", "Bhaktapur"),
    ("Pokhara Lakeside", "Pokhara", "Kaski"),
    ("Mahendrapul, Pokhara", "Pokhara", "Kaski"),
    ("Chipledhunga, Pokhara", "Pokhara", "Kaski"),
    ("Narayangadh, Chitwan", "Chitwan", "Chitwan"),
    ("Bharatpur, Chitwan", "Chitwan", "Chitwan"),
    ("Biratnagar, Morang", "Biratnagar", "Morang"),
    ("Butwal, Rupandehi", "Butwal", "Rupandehi"),
    ("Dharan, Sunsari", "Dharan", "Sunsari"),
    ("Hetauda, Makwanpur", "Hetauda", "Makwanpur"),
    ("Nepalgunj, Banke", "Nepalgunj", "Banke"),
    ("Itahari, Sunsari", "Itahari", "Sunsari"),
    ("Birgunj, Parsa", "Birgunj", "Parsa"),
    ("Dhangadhi, Kailali", "Dhangadhi", "Kailali"),
    ("Janakpur, Dhanusha", "Janakpur", "Dhanusha"),
    ("Damak, Jhapa", "Damak", "Jhapa"),
    ("Bharatpur-4, Chitwan", "Bharatpur", "Chitwan"),
]

CITY_COORDS = {
    "Kathmandu": (27.7172, 85.3240),
    "Lalitpur": (27.6588, 85.3247),
    "Bhaktapur": (27.6727, 85.4298),
    "Pokhara": (28.2096, 83.9856),
    "Chitwan": (27.5833, 84.4167),
    "Bharatpur": (27.6833, 84.4333),
    "Biratnagar": (26.4525, 87.2718),
    "Butwal": (27.7000, 83.4500),
    "Dharan": (26.8147, 87.2797),
    "Hetauda": (27.4314, 85.0319),
    "Nepalgunj": (28.0500, 81.6167),
    "Itahari": (26.6617, 87.2742),
    "Birgunj": (27.0104, 84.8821),
    "Dhangadhi": (28.6852, 80.6216),
    "Janakpur": (26.7288, 85.9254),
    "Damak": (26.6615, 87.7058),
}

SERVICE_TYPES = [
    "Electronics Repair", "Clothing & Accessories", "Vehicle Service", "Property Consultant",
    "Furniture Making", "Handicrafts", "Bakery & Sweets", "Beauty Services", "IT Services",
    "Event Management", "Plumbing", "Electrical Work", "Catering", "Photography", "Tutoring",
    "Mobile Repair", "Home Appliances", "Organic Grocery", "Construction Materials", "Tailoring",
]

# Each product: category, subcategory, title, description template, price_range, image_seed
PRODUCTS = [
    ("marketplace", "Electronics", "Samsung Galaxy A54 5G - 128GB", "Original Samsung phone with bill and box. Used 8 months, battery health 94%. Available for pickup at {location}.", (28000, 38000), "samsung-phone"),
    ("marketplace", "Electronics", "iPhone 12 64GB - Space Grey", "Single owner iPhone 12. Face ID works perfectly. Minor scratches on back cover. Charger included.", (45000, 62000), "iphone-12"),
    ("marketplace", "Electronics", "Redmi Note 13 Pro 256GB", "Brand new sealed box Redmi Note 13 Pro. Official Nepal warranty. Free delivery inside Ring Road.", (32000, 36000), "redmi-phone"),
    ("marketplace", "Electronics", "Sony WH-CH720N Noise Cancelling Headphones", "Lightweight Sony headphones with 35hr battery. Bought from Hamro Pasal, lightly used.", (6500, 9500), "headphones"),
    ("marketplace", "Electronics", "Canon EOS 2000D DSLR Kit", "Entry DSLR with 18-55mm lens, bag, and 32GB card. Great for beginners and events.", (42000, 55000), "dslr-camera"),
    ("marketplace", "Electronics", "HP Pavilion 15 Laptop i5 12th Gen", "8GB RAM, 512GB SSD, Windows 11. Ideal for students and office work.", (55000, 72000), "laptop-hp"),
    ("marketplace", "Electronics", "LG 43 Inch Smart LED TV", "Full HD smart TV with Netflix and YouTube built-in. Wall mount available.", (28000, 35000), "smart-tv"),
    ("marketplace", "Electronics", "Boat Airdopes 141 Earbuds", "TWS earbuds with 42hr playback. Sealed pack with 1 year warranty.", (1800, 2800), "earbuds"),
    ("marketplace", "Electronics", "Mi Air Purifier 3H", "HEPA filter air purifier for bedroom or office. Filter replaced last month.", (12000, 16000), "air-purifier"),
    ("marketplace", "Electronics", "PlayStation 5 Disc Edition", "PS5 with 2 controllers and 3 games (FIFA, Spider-Man, GT7).", (75000, 95000), "ps5"),
    ("marketplace", "Fashion", "Dhaka Cotton Saree - Handwoven", "Authentic Dhakai saree from Bhaktapur weavers. Perfect for weddings and festivals.", (4500, 8500), "saree"),
    ("marketplace", "Fashion", "Men's Leather Jacket - Size L", "Genuine leather jacket, imported quality. Worn twice only.", (6500, 9500), "leather-jacket"),
    ("marketplace", "Fashion", "Nike Air Max 270 - Size 42", "Original Nike sneakers from official store. Box and receipt available.", (8500, 12000), "nike-shoes"),
    ("marketplace", "Fashion", "Pashmina Shawl Set - 3 Pieces", "Soft cashmere blend shawls. Ideal gift set for tourists and locals.", (3500, 5500), "pashmina"),
    ("marketplace", "Fashion", "School Uniform Bundle - Class 6-8", "Complete uniform set: shirt, pants, tie, socks. Stitched to size.", (2200, 3500), "uniform"),
    ("marketplace", "Fashion", "Traditional Kurta Pajama - Wedding", "Embroidered kurta with matching pajama and waistcoat. Size M/L.", (4500, 7000), "kurta"),
    ("marketplace", "Fashion", "Ladies Handbag - Leather", "Brown leather handbag with multiple compartments. Brand new.", (2800, 4500), "handbag"),
    ("marketplace", "Fashion", "Winter Jacket - North Face Style", "Warm down jacket for Kathmandu winter. Waterproof outer layer.", (5500, 8000), "winter-jacket"),
    ("marketplace", "Furniture", "Modern Sofa Set - 5 Seater", "Fabric sofa in grey. Delivery and installation included within valley.", (35000, 48000), "sofa-set"),
    ("marketplace", "Furniture", "Wooden Dining Table - 6 Chairs", "Teak finish dining set. Solid wood, termite treated.", (28000, 42000), "dining-table"),
    ("marketplace", "Furniture", "Queen Size Bed with Storage", "Hydraulic storage bed with mattress. Assembly service available.", (22000, 32000), "bed-storage"),
    ("marketplace", "Furniture", "Office Desk and Ergonomic Chair", "Work-from-home setup. Cable management and keyboard tray included.", (12000, 18000), "office-desk"),
    ("marketplace", "Furniture", "Bookshelf - 5 Tier", "MDF bookshelf in walnut color. Easy to assemble.", (4500, 6500), "bookshelf"),
    ("marketplace", "Furniture", "Coffee Table - Glass Top", "Living room center table with tempered glass.", (6500, 9500), "coffee-table"),
    ("marketplace", "Handicrafts", "Brass Buddha Statue - 12 inch", "Handcrafted brass Buddha from Patan artisans. Ideal for altar or decor.", (8500, 14000), "buddha-statue"),
    ("marketplace", "Handicrafts", "Nepali Thanka Painting - Green Tara", "Traditional Tibetan style thanka on cotton canvas with brocade mounting.", (12000, 22000), "thanka"),
    ("marketplace", "Handicrafts", "Wooden Carved Window Panel", "Replica of Newari window panel. Teak wood, ready to hang.", (6500, 11000), "wood-carving"),
    ("marketplace", "Handicrafts", "Khukuri Display Set - 3 Pieces", "Decorative khukuri set with stand. Made in Dharan.", (3500, 5500), "khukuri"),
    ("marketplace", "Handicrafts", "Handmade Lokta Paper Notebook Set", "Eco-friendly notebooks with traditional prints. Set of 5.", (800, 1500), "lokta-paper"),
    ("marketplace", "Home & Garden", "Samsung 7kg Front Load Washing Machine", "Inverter washing machine, energy efficient. Installation support.", (32000, 42000), "washing-machine"),
    ("marketplace", "Home & Garden", "Philips Air Fryer XXL", "Family size air fryer. Used 6 months, excellent condition.", (8500, 12000), "air-fryer"),
    ("marketplace", "Home & Garden", "Pressure Cooker Set - Prestige", "Stainless steel cooker set with idli stand. 5L and 3L combo.", (3500, 5000), "pressure-cooker"),
    ("marketplace", "Home & Garden", "Garden Tool Set - 8 Pieces", "Shovel, rake, gloves, and watering can. For terrace gardening.", (1800, 2800), "garden-tools"),
    ("vehicles", "Motorcycles", "Honda CB Hornet 160R - 2020", "Single owner, 18,000 km. Serviced at authorized center. Blue book clear.", (185000, 215000), "honda-hornet"),
    ("vehicles", "Motorcycles", "Yamaha FZ-S V3 - 2021", "Excellent mileage, new tyres. Insurance valid 8 months.", (195000, 225000), "yamaha-fz"),
    ("vehicles", "Motorcycles", "Bajaj Pulsar NS200 - 2019", "Modified exhaust, LED indicators. Well maintained.", (165000, 195000), "pulsar-ns200"),
    ("vehicles", "Motorcycles", "Royal Enfield Classic 350 - 2018", "Gunmetal grey, saddle bags included. Highway ready.", (285000, 340000), "royal-enfield"),
    ("vehicles", "Motorcycles", "TVS Apache RTR 160 4V", "Racing stripes, ABS model. First owner.", (155000, 185000), "tvs-apache"),
    ("vehicles", "Motorcycles", "Hero Splendor Plus - 2022", "Economical commuter bike. 12,000 km only.", (95000, 115000), "hero-splendor"),
    ("vehicles", "Cars", "Toyota Corolla 2015 - Pearl White", "Automatic, 65,000 km, full service history. No accident.", (3200000, 3800000), "toyota-corolla"),
    ("vehicles", "Cars", "Hyundai Creta 2018 SX", "Diesel, sunroof, reverse camera. Family maintained.", (4200000, 4800000), "hyundai-creta"),
    ("vehicles", "Cars", "Maruti Swift 2019 VXI", "Petrol, 42,000 km. Ideal first car for city driving.", (2100000, 2500000), "maruti-swift"),
    ("vehicles", "Cars", "Honda City 2017 - Low Mileage", "Silver, leather seats, touch screen audio. Finance available.", (2800000, 3300000), "honda-city"),
    ("vehicles", "Cars", "Suzuki Ertiga 2020 ZDI", "7 seater MPV. Perfect for family trips to Pokhara.", (3500000, 4100000), "suzuki-ertiga"),
    ("vehicles", "Scooters", "Honda Dio 2021 - Scooter", "Ladies friendly scooter. Mileage 45 km/l. Papers complete.", (125000, 145000), "honda-dio"),
    ("vehicles", "Scooters", "TVS Ntorq 125 Race Edition", "Sporty scooter with Bluetooth. 8,500 km.", (115000, 135000), "ntorq-scooter"),
    ("property", "Apartments", "2BHK Apartment for Rent - Baneshwor", "Furnished flat near UN Park. 24hr security, lift, parking.", (25000, 35000), "apartment-2bhk"),
    ("property", "Apartments", "1BHK Flat Near Ring Road", "Semi-furnished, sunlight, water supply. No brokerage.", (15000, 22000), "flat-1bhk"),
    ("property", "Apartments", "Studio Apartment - Fully Furnished", "Ideal for working professionals. WiFi ready, kitchen included.", (18000, 28000), "studio-flat"),
    ("property", "Apartments", "3BHK Penthouse with Parking", "Luxury penthouse in Lalitpur. Mountain view balcony.", (55000, 85000), "penthouse"),
    ("property", "Commercial", "Commercial Shop Space - Thamel", "Ground floor shop, high footfall tourist area. 400 sq ft.", (85000, 120000), "shop-thamel"),
    ("property", "Commercial", "Office Space for Lease - 1200 sq ft", "Open plan office in Trade Tower. Generator backup.", (95000, 140000), "office-space"),
    ("property", "Commercial", "Restaurant Space Ready to Move", "Fully equipped kitchen, 60 seats. Lakeside Pokhara.", (120000, 180000), "restaurant-space"),
    ("property", "Land", "Residential Plot - 5 Aana Lalitpur", "South facing, road access 20 ft. Clear land title.", (4500000, 6500000), "land-plot"),
    ("property", "Land", "Agricultural Land - Chitwan", "4 Bigha fertile land near Narayani river. Irrigation canal.", (8000000, 12000000), "farm-land"),
    ("services", "Food Services", "Custom Birthday Cakes - Order Now", "Eggless and fondant options. Free delivery in {city}.", (1200, 3500), "birthday-cake"),
    ("services", "Food Services", "Daily Fresh Bread & Pastries", "Bakery items from 6 AM. Bulk orders for cafes.", (80, 500), "bakery"),
    ("services", "Food Services", "Home Tiffin Service - Monthly", "Healthy Nepali meals. Veg and non-veg plans.", (4500, 7500), "tiffin"),
    ("services", "Food Services", "Catering for Events - 50+ Guests", "Wedding and corporate catering. Menu tasting available.", (35000, 120000), "catering"),
    ("services", "Beauty", "Bridal Makeup Package", "HD makeup with hair styling. Trial session included.", (15000, 28000), "bridal-makeup"),
    ("services", "Beauty", "Hair Spa Treatment - Special Offer", "Keratin and protein treatment. Salon in {location}.", (2500, 4500), "hair-spa"),
    ("services", "Beauty", "Men's Grooming Package", "Haircut, beard trim, and facial. Walk-in welcome.", (1500, 2500), "mens-grooming"),
    ("services", "Beauty", "Nail Art & Manicure Service", "Gel polish and nail extensions. Appointment based.", (1200, 3500), "nail-art"),
    ("services", "IT Services", "Website Development - Business Sites", "Responsive websites for shops and clinics. SEO basics included.", (25000, 85000), "web-dev"),
    ("services", "IT Services", "Laptop Repair & Upgrade Service", "Screen replacement, SSD upgrade, virus removal. Same-day service.", (1500, 15000), "laptop-repair"),
    ("services", "IT Services", "CCTV Installation Package - 4 Cameras", "DVR setup with mobile viewing. 1 year warranty.", (18000, 32000), "cctv"),
    ("services", "IT Services", "Gaming PC Build - RTX 4060", "Custom build with RGB case. Benchmark tested before delivery.", (95000, 145000), "gaming-pc"),
    ("services", "Events", "Wedding Planning Package - Complete", "Venue, decor, photography coordination. Consultation free.", (150000, 450000), "wedding-plan"),
    ("services", "Events", "Birthday Party Decoration Service", "Balloon arch, backdrop, and cake table setup.", (8000, 25000), "party-decor"),
    ("services", "Events", "DJ and Sound System Rental", "500W speaker, mic, and DJ for events. Operator included.", (12000, 35000), "dj-sound"),
    ("services", "Home Services", "Plumbing & Pipe Fitting", "Leak repair, bathroom fitting. Emergency calls accepted.", (800, 8000), "plumbing"),
    ("services", "Home Services", "House Deep Cleaning Service", "2BHK deep clean with chemicals and equipment.", (3500, 6500), "cleaning"),
    ("services", "Home Services", "AC Service and Gas Refill", "Split AC servicing. All brands supported.", (2500, 5500), "ac-service"),
    ("jobs", "Full-time", "Sales Executive - Kathmandu", "FMCG company. Salary 25k-35k plus incentives. 2 wheeler required.", (25000, 35000), "sales-job"),
    ("jobs", "Full-time", "Delivery Rider - Immediate Join", "Food delivery app partner. Own bike. Daily payout option.", (22000, 32000), "rider-job"),
    ("jobs", "Full-time", "Accountant - Lalitpur Office", "Tally and VAT experience required. 5 days week.", (35000, 50000), "accountant-job"),
    ("jobs", "Full-time", "Store Manager - Retail Chain", "Supervise 8 staff. Experience in supermarket preferred.", (40000, 55000), "manager-job"),
    ("jobs", "Part-time", "Tuition Teacher - Class 8-10 Maths", "Evening classes in {location}. 3 days per week.", (8000, 15000), "tutor-job"),
    ("jobs", "Part-time", "Receptionist - Dental Clinic", "Morning shift 8 AM - 2 PM. Good English required.", (12000, 18000), "reception-job"),
    ("jobs", "Internship", "Marketing Intern - Startup", "Social media and content creation. Certificate provided.", (8000, 12000), "intern-marketing"),
    ("business", "Retail", "Grocery Store for Sale", "Established store in residential area. Monthly profit 1.2L.", (1200000, 1800000), "grocery-store"),
    ("business", "Retail", "Pharmacy Business Transfer", "Licensed pharmacy near hospital. Stock included.", (2500000, 3500000), "pharmacy"),
    ("business", "Retail", "Tea Shop with Good Footfall", "Milk tea shop near college. Lease transferable.", (450000, 750000), "tea-shop"),
    ("business", "Retail", "Mobile Shop - Established Brand", "Authorized dealer accessories. Prime location.", (1800000, 2800000), "mobile-shop"),
    ("business", "Hospitality", "Boutique Hotel - Pokhara", "12 room hotel Lakeside. Running business with reviews.", (45000000, 65000000), "boutique-hotel"),
    ("nearby", "Local Deals", "Neighborhood Handyman Service", "Furniture assembly, drilling, minor repairs. Call before 6 PM.", (500, 2500), "handyman"),
    ("nearby", "Local Deals", "Local Bike Rental - Daily", "Mountain bikes for city and short trips. Helmet included.", (800, 1500), "bike-rental"),
    ("nearby", "Local Deals", "Pet Grooming at Your Doorstep", "Bath, nail trim, and ear cleaning for dogs.", (1200, 2800), "pet-grooming"),
    ("nearby", "Local Deals", "Fresh Vegetable Home Delivery", "Farm to home vegetables. Order by 8 AM for same day.", (300, 1200), "vegetables"),
    ("marketplace", "Electronics", "Apple MacBook Air M2 256GB", "Space grey, AppleCare until 2026. Original charger.", (95000, 115000), "macbook-m2"),
    ("marketplace", "Electronics", "Dell 24 Inch Monitor - Full HD", "IPS panel, height adjustable stand. For office or gaming.", (12000, 18000), "monitor-dell"),
    ("marketplace", "Electronics", "JBL Flip 6 Bluetooth Speaker", "Waterproof portable speaker. Party and outdoor use.", (8500, 11500), "jbl-speaker"),
    ("marketplace", "Electronics", "Kindle Paperwhite 11th Gen", "E-reader with warm light. 200+ books preloaded optional.", (14000, 18000), "kindle"),
    ("marketplace", "Fashion", "Kids Winter Wear Set", "Jacket, sweater, and cap for age 5-7. Warm fleece lining.", (1800, 2800), "kids-winter"),
    ("marketplace", "Fashion", "Wedding Sherwani - Size 40", "Embroidered cream sherwani with stole. Dry cleaned.", (12000, 18000), "sherwani"),
    ("marketplace", "Furniture", "Wardrobe 3 Door - Sliding", "Mirror sliding doors, hanging space and drawers.", (18000, 26000), "wardrobe"),
    ("marketplace", "Home & Garden", "RO Water Purifier - Kent", "7L storage, UV+UF purification. Filter kit available.", (9500, 14000), "water-purifier"),
    ("vehicles", "Bicycles", "Mountain Bike - 21 Speed", "Front suspension, disc brakes. Good for Shivapuri trails.", (18000, 28000), "mountain-bike"),
    ("vehicles", "Bicycles", "Kids Cycle - Age 8-12", "Adjustable seat, training wheels removed. Bright colors.", (6500, 9500), "kids-cycle"),
    ("property", "Apartments", "2BHK for Sale - Imadol", "New building, earthquake resistant. Ready to move.", (8500000, 11000000), "apartment-sale"),
    ("services", "Education", "Spoken English Classes", "Beginner to advanced batches. Weekend classes available.", (3500, 8000), "english-class"),
    ("services", "Education", "Guitar Lessons - Private", "Home visits in {city}. Acoustic and electric.", (2500, 5000), "guitar-lessons"),
    ("jobs", "Full-time", "Chef - Continental Restaurant", "Experience in Italian and continental. Live kitchen.", (45000, 65000), "chef-job"),
    ("jobs", "Full-time", "Graphic Designer - Agency", "Photoshop, Illustrator, Figma. Portfolio required.", (30000, 45000), "designer-job"),
    ("business", "Food", "Cloud Kitchen for Sale", "Fully equipped delivery kitchen. Swiggy/Foodmandu listed.", (650000, 950000), "cloud-kitchen"),
    ("nearby", "Local Deals", "Laundry Pickup Service", "Wash and fold. Free pickup in 3 km radius.", (80, 400), "laundry"),
]


def coords_for_city(city: str) -> tuple[float, float]:
    lat, lng = CITY_COORDS.get(city, (27.7172, 85.3240))
    return lat + random.uniform(-0.018, 0.018), lng + random.uniform(-0.018, 0.018)


def seller_profile(index: int) -> dict:
    first = FIRST_NAMES[index % len(FIRST_NAMES)]
    last = LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]
    suffix = (index % 900) + 1
    full_name = f"{first} {last}"
    phone = f"+{PHONE_BASE + index}"
    slug = f"{first.lower()}.{last.lower()}{suffix}"
    loc = LOCATIONS[index % len(LOCATIONS)]
    service = SERVICE_TYPES[index % len(SERVICE_TYPES)]
    return {
        "full_name": full_name,
        "phone": phone,
        "email": f"{slug}@najik-demo.com",
        "business_name": f"{last} {service.split()[0]} Store",
        "service_type": service,
        "address": loc[0],
        "city": loc[1],
        "district": loc[2],
    }


def listing_from_product(product_index: int, seller_index: int) -> dict:
    category, subcategory, title, desc_tpl, price_range, image_seed = PRODUCTS[product_index % len(PRODUCTS)]
    loc = LOCATIONS[(product_index + seller_index) % len(LOCATIONS)]
    price = random.randint(*price_range)
    description = desc_tpl.format(location=loc[0], city=loc[1])
    # Unique title suffix for duplicate product templates across sellers
    variant = (product_index + seller_index * 3) % 97
    unique_title = title if variant < 12 else f"{title} (#{variant})"
    return {
        "title": unique_title[:160],
        "category": category,
        "subcategory": subcategory,
        "description": description,
        "price": price,
        "location": loc[0],
        "city": loc[1],
        "district": loc[2],
        "image_seed": image_seed,
        "negotiable": random.random() < 0.35,
    }
