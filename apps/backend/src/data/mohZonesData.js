/**
 * Official MOH (Medical Officer of Health) Zonal Areas by District — Sri Lanka
 *
 * Source: Epidemiology Unit of Sri Lanka — WEBIIS (moh area code.pdf),
 * cross-referenced with Ministry of Health provincial data, RDHS offices,
 * and PHI-PRO registry.
 *
 * Total: ~354 MOH areas across 25 districts.
 *
 * NOTE: "Kalmunai" is a separate RDHS area but lies within Ampara District
 * geographically. All Kalmunai MOH zones are listed under "Ampara" here so they
 * appear in the correct district dropdown cascade.
 */

const MOH_ZONES_DATA = [
  // ─── WESTERN PROVINCE ───────────────────────────────────────────────────────

  {
    district: 'Colombo',
    zones: [
      'Dehiwala',
      'Piliyandala',
      'Homagama',
      'Kaduwela',
      'Kolonnawa',
      'Pitakotte',
      'Maharagama',
      'Boralesgamuwa',
      'Moratuwa',
      'Ratmalana',
      'Hanwella',
      'Padukka',
      'Seethawaka',
      'Kesbewa',
      'MC Colombo',
      'Egoda Uyana',
      'Battaramulla',
      'Thalangama',
    ],
  },

  {
    district: 'Gampaha',
    zones: [
      'Attanagalla',
      'Biyagama',
      'Divulapitiya',
      'Gampaha',
      'Ja-Ela',
      'Katana',
      'Kelaniya',
      'Dompe',
      'Mahara',
      'MC Negombo',
      'Minuwangoda',
      'Meerigama',
      'Ragama',
      'Wattala',
      'Seeduwa',
      'BOI Katunayake',
    ],
  },

  {
    district: 'Kalutara',
    zones: [
      'Agalawatta',
      'Bandaragama',
      'Bulathsinhala',
      'Horana',
      'Matugama',
      'Panadura',
      'Walallavita',
      'Madurawela',
      'Ingiriya',
      'Dodangoda',
      'Millaniya',
      'Beruwala',
      'Kalutara',
    ],
  },

  // ─── CENTRAL PROVINCE ───────────────────────────────────────────────────────

  {
    district: 'Kandy',
    zones: [
      'Akurana',
      'Galagedara',
      'Ganga Ihala',
      'Hatharaliyadda',
      'Gangawata Korale',
      'Hasalaka',
      'Kundasale',
      'Medadumbara',
      'Nawalapitiya',
      'Panvila',
      'Poojapitiya',
      'Thalathuoya',
      'Udadumbara',
      'Gampola',
      'Udunuwara',
      'Wattegama',
      'Warallagama',
      'Yatinuwara',
      'Doluwa',
      'Deltota',
      'Manikhinna',
      'Bambaradeniya',
      'MC Kandy',
    ],
  },

  {
    district: 'Matale',
    zones: [
      'Matale',
      'MC Matale',
      'Dambulla',
      'MC Dambulla',
      'Galewela',
      'Rattota',
      'Ambanganga Korale',
      'Naula',
      'Laggala Pallegama',
      'Wilgamuwa',
      'Ukuwela',
      'Yatawatta',
      'Pallepola',
    ],
  },

  {
    district: 'Nuwara Eliya',
    zones: [
      'Nuwara Eliya',
      'MC Nuwara Eliya',
      'Kothmale',
      'Maskeliya',
      'Ambagamuwa',
      'Walapane',
      'Maturata',
      'Nawathispane',
      'Hanguranketha',
      'Bogawanthalawa',
      'Ragala',
      'Lindula',
      'Kotagala',
    ],
  },

  // ─── SABARAGAMUWA PROVINCE ──────────────────────────────────────────────────

  {
    district: 'Kegalle',
    zones: [
      'Aranayake',
      'Dehiowita',
      'Deraniyagala',
      'Galigamuwa',
      'Kegalle',
      'Mawanella',
      'Rambukkana',
      'Ruwanwella',
      'Warakapola',
      'Yatiyanthota',
      'Bulathkohupitiya',
    ],
  },

  {
    district: 'Ratnapura',
    zones: [
      'Balangoda',
      'Eheliyagoda',
      'Embilipitiya',
      'Godakawela',
      'Kalawana',
      'Kuruwita',
      'Udawalawa',
      'Nivithigala',
      'Pelmadulla',
      'Imbulpe',
      'Ratnapura PS',
      'Ratnapura MC',
      'Elapatha',
      'Kiriella',
      'Ayagama',
    ],
  },

  // ─── UVA PROVINCE ───────────────────────────────────────────────────────────

  {
    district: 'Badulla',
    zones: [
      'Badulla',
      'Bandarawela',
      'Girandurukotte',
      'Hali Ela',
      'Haputale',
      'Mahiyanganaya',
      'Meegahakivula',
      'Passara',
      'Rideemaliyadda',
      'Uva Paranagama',
      'Welimada',
      'Ella',
      'Soranathota',
      'Haldummulla',
      'Kandaketiya',
      'Lunugala',
    ],
  },

  {
    district: 'Monaragala',
    zones: [
      'Badalkumbura',
      'Bibila',
      'Monaragala',
      'Siyambalanduwa',
      'Thanamalwila',
      'Wellawaya',
      'Madulla',
      'Medagama',
      'Buttala',
      'Kataragama',
      'Sevanagala',
    ],
  },

  // ─── SOUTHERN PROVINCE ──────────────────────────────────────────────────────

  {
    district: 'Galle',
    zones: [
      'Akmeemana',
      'Ambalangoda',
      'Baddegama',
      'Balapitiya',
      'Bope-Poddala',
      'Elpitiya',
      'Habaraduwa',
      'Hikkaduwa',
      'Thawalama',
      'Yakkalamulla',
      'Induruwa',
      'Karandeniya',
      'MC Galle',
      'Udugama',
      'Niyagama',
      'Neluwa',
      'Imaduwa',
      'Gonapinuwala',
      'Divithura',
      'Rathgama',
    ],
  },

  {
    district: 'Matara',
    zones: [
      'Akuressa',
      'Kotapola',
      'Devinuwara',
      'Dickwella',
      'Hakmana',
      'Kamburupitiya',
      'Morawaka',
      'Malimboda',
      'PS Matara',
      'Mulatiyana',
      'Pasgoda',
      'Thihagoda',
    ],
  },

  {
    district: 'Hambantota',
    zones: [
      'Ambalantota',
      'Angunakolapelessa',
      'Beliatta',
      'Hambantota',
      'Katuwana',
      'Tangalle',
      'Tissamaharama',
      'Walasmulla',
      'Weeraketiya',
      'Sooriyawewa',
      'Lunugamwehera',
      'Okewela',
    ],
  },

  // ─── EASTERN PROVINCE ───────────────────────────────────────────────────────

  {
    district: 'Ampara',
    // Includes both Ampara RDHS (7) and Kalmunai RDHS (13) zones —
    // both fall within Ampara District geographically.
    zones: [
      // Ampara RDHS
      'Ampara',
      'Dehiattakandiya',
      'Uhana',
      'Mahaoya',
      'Padiyathalawa',
      'Lahugala',
      'Damana',
      // Kalmunai RDHS (within Ampara District)
      'Akkaraipattu',
      'Kalmunai North',
      'Thirukkovil',
      'Sammanthurai',
      'Nintavur',
      'Kalmunai South',
      'Karaitivu',
      'Alayadivembu',
      'Addalaichenai',
      'Pottuvil',
      'Sainthamaruththu',
      'Irakkamam',
      'Navithanveli',
    ],
  },

  {
    district: 'Batticaloa',
    zones: [
      'Batticaloa',
      'Chenkalady',
      'Kalavanchikudy',
      'Valachchenai',
      'Kattankudy',
      'Eravur',
      'Paddippalai',
      'Vavunativu',
      'Vakarai',
      'Vellavely',
      'Oddamavadai',
      'Koralipattu Central',
      'Araipattai',
    ],
  },

  {
    district: 'Trincomalee',
    zones: [
      'Trincomalee',
      'Kantale',
      'Kinniya',
      'Padavisripura',
      'Muttur',
      'Seruwila',
      'Thampalakamam',
      'Gomarankadawala',
      'Kuchchavely',
      'Eachchilampatthu',
      'Uppuveli',
      'Trincomalee Naval Base',
    ],
  },

  // ─── NORTH CENTRAL PROVINCE ─────────────────────────────────────────────────

  {
    district: 'Polonnaruwa',
    zones: [
      'Dimbulagala',
      'Elahera',
      'Hingurakgoda',
      'Lankapura',
      'Medirigiriya',
      'Thamankaduwa',
      'Welikanda',
    ],
  },

  {
    district: 'Anuradhapura',
    zones: [
      'Anuradhapura CNP',
      'Kahatagasdigiliya',
      'Kekirawa',
      'Medawachchiya',
      'Padaviya',
      'Thambuttegama',
      'Galnewa',
      'Nochchiyagama',
      'Anuradhapura NNP',
      'Mihintale',
      'Rajanganaya',
      'Galenbindunuwewa',
      'Ipalogama',
      'Thalawa',
      'Thirappane',
      'Rambewa',
      'Kebithigollewa',
      'Horowpothana',
      'Palagala',
    ],
  },

  // ─── NORTH WESTERN PROVINCE ─────────────────────────────────────────────────

  {
    district: 'Kurunegala',
    zones: [
      'Bingiriya',
      'Galgamuwa',
      'Ibbagamuwa',
      'Kuliyapitiya',
      'Kurunegala',
      'Maho',
      'Mawathagama',
      'Narammala',
      'Nikaweratiya',
      'Panduwasnuwara',
      'Pannala',
      'Polgahawela',
      'Polpithigama',
      'Rideegama',
      'Alawwa',
      'Ambanpola',
      'Bamunakotuwa',
      'Ganewatta',
      'Wariyapola',
      'MC Kurunegala',
      'Kuliyapitiya East',
      'Kobeigane',
      'Kotawehera',
      'Ehetuwewa',
      'Udubaddawa',
    ],
  },

  {
    district: 'Puttalam',
    zones: [
      'Anamaduwa',
      'Arachchikattuwa',
      'Chilaw',
      'Dankotuwa',
      'Kalpitiya',
      'Karuwalagaswewa',
      'Puttalam',
      'Mundel',
      'Wennappuwa',
      'Mahawewa',
      'Nattandiya',
    ],
  },

  // ─── NORTHERN PROVINCE ──────────────────────────────────────────────────────

  {
    district: 'Jaffna',
    zones: [
      'Chavakachcheri',
      'Kayts',
      'Kopay',
      'MC Jaffna',
      'Point Pedro',
      'Telippalai',
      'Nallur',
      'Uduvil',
      'Chankanai',
      'Karainagar',
      'Maruthankerny',
      'Sandilippay',
      'Velanai',
    ],
  },

  {
    district: 'Kilinochchi',
    zones: [
      'Kilinochchi',
      'Poonakary',
      'Kandavalai',
      'Palai',
    ],
  },

  {
    district: 'Mannar',
    zones: [
      'Mannar',
      'Nanaddan',
      'Madhu',
      'Manthalai West',
      'Musali',
    ],
  },

  {
    district: 'Vavuniya',
    zones: [
      'Vavuniya',
      'Vavuniya South',
      'Cheddikulam',
      'Vavuniya North',
    ],
  },

  {
    district: 'Mullaitivu',
    zones: [
      'Mullaitivu',
      'Thunukkai',
      'Oddusuddan',
      'Puthukkudiyiruppu',
      'Welioya',
      'Manthai East',
    ],
  },
];

export default MOH_ZONES_DATA;
