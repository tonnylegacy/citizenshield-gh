/**
 * CitizenShield Ghana / Pocket Barrister Ghana
 * Authoritative Ghana Legal Knowledge Engine & Emergency Directory
 *
 * Grounded in:
 * - 1992 Constitution of the Republic of Ghana
 * - Criminal Procedure Act, 1960 (Act 30)
 * - Criminal Offences Act, 1960 (Act 29)
 * - Road Traffic Act, 2004 (Act 683) & Road Traffic Regulations, 2012 (L.I. 2180)
 * - Cybersecurity Act, 2020 (Act 1038) & Electronic Transactions Act, 2008 (Act 772)
 * - Police Service Regulations, 2012 (C.I. 76) & GPS Standing Orders
 * - Narcotics Control Commission Act, 2020 (Act 1019) & Act 1100
 * - Supreme Court & High Court Binding Precedents (Martin Kpebu, Edmund Addo, Tyron Marhguy, etc.)
 */

(function (global) {
  'use strict';

  // 1. CATEGORIES DIRECTORY
  const GHANA_LAWS_CATEGORIES = [
    {
      id: 'all',
      label: 'All Ghana Laws',
      icon: 'scale',
      description: 'Comprehensive repository of statutory citizen safeguards across Ghana'
    },
    {
      id: 'digital-privacy',
      label: 'Phone, Laptop & Cyber',
      icon: 'smartphone',
      description: 'Constitutional protections against warrantless digital searches and cyber accusations'
    },
    {
      id: 'traffic-mttd',
      label: 'MTTD, License & Traffic',
      icon: 'car',
      description: 'Road traffic acts, equipment regulations, DVLA checks, and breathalyzer standards'
    },
    {
      id: 'keys-impound-cash',
      label: 'Car Keys, Impound & Cash',
      icon: 'key',
      description: 'Rules on key snatching, unlawful vehicle impounds, and extortion or spot fines'
    },
    {
      id: 'narcotics-search',
      label: 'Smoking, Drugs & Searches',
      icon: 'shield-alert',
      description: 'Narcotics law, search mandates, chain of custody, and roadside bag checks'
    },
    {
      id: 'profiling-looks',
      label: 'Looks, Locks & Profiling',
      icon: 'user-check',
      description: 'Protection against discrimination based on hairstyle, tattoos, clothing, or car type'
    },
    {
      id: 'arrest-detention',
      label: 'Arrest, Handcuffs & 48h Rule',
      icon: 'lock',
      description: 'Grounds of arrest, restraint limits, bail rules, and the strict 48-hour constitutional limit'
    },
    {
      id: 'silence-interrogation',
      label: 'Right to Silence & Lawyer',
      icon: 'mic-off',
      description: 'Presumption of innocence, refusing caution statements, and constitutional right to counsel'
    },
    {
      id: 'recording-accountability',
      label: 'Recording, CID & PPSB',
      icon: 'video',
      description: 'Right to film public encounters, plainclothes warrant cards, and PPSB accountability'
    }
  ];

  // 2. VERIFIED GHANA EMERGENCY & ACCOUNTABILITY DIRECTORY
  const EMERGENCY_DIRECTORY = {
    ppsbWhatsApp: {
      id: 'ppsb-whatsapp',
      name: 'Police Professional Standards Bureau (PPSB) - WhatsApp Evidence Desk',
      rawNumber: '0206639121',
      displayNumber: '020 663 9121',
      internationalNumber: '+233206639121',
      actionUrl: 'https://wa.me/233206639121',
      type: 'whatsapp',
      primaryUse: 'Direct WhatsApp video, audio, and photo evidence reporting for police misconduct',
      availableHours: '24/7'
    },
    ppsbHotline1: {
      id: 'ppsb-hotline-1',
      name: 'PPSB Direct Complaint Hotline 1',
      rawNumber: '0550323323',
      displayNumber: '055 032 3323',
      internationalNumber: '+233550323323',
      actionUrl: 'tel:+233550323323',
      type: 'call',
      primaryUse: 'Official police disciplinary hotline for immediate roadside intervention',
      availableHours: '24/7'
    },
    ppsbHotline2: {
      id: 'ppsb-hotline-2',
      name: 'PPSB Direct Complaint Hotline 2',
      rawNumber: '0275000156',
      displayNumber: '027 500 0156',
      internationalNumber: '+233275000156',
      actionUrl: 'tel:+233275000156',
      type: 'call',
      primaryUse: 'Secondary GPS headquarters internal oversight hotline',
      availableHours: '24/7'
    },
    policeEmergencyTollFree: {
      id: 'police-emergency-191',
      name: 'Ghana Police National Emergency Center',
      rawNumber: '191',
      displayNumber: '191',
      internationalNumber: '191',
      actionUrl: 'tel:191',
      type: 'call',
      primaryUse: 'National police emergency dispatch (Toll-free on all Ghana networks)',
      availableHours: '24/7'
    },
    policeEmergencyAlt: {
      id: 'police-emergency-18555',
      name: 'Ghana Police Emergency Alternate (MTN/Telecel/AirtelTigo)',
      rawNumber: '18555',
      displayNumber: '18555',
      internationalNumber: '18555',
      actionUrl: 'tel:18555',
      type: 'call',
      primaryUse: 'National police call center direct line',
      availableHours: '24/7'
    },
    legalAidCommission: {
      id: 'legal-aid-commission',
      name: 'Legal Aid Commission of Ghana',
      rawNumber: '0302664626',
      displayNumber: '+233 (0) 302 664 626',
      internationalNumber: '+233302664626',
      actionUrl: 'tel:+233302664626',
      type: 'legal-aid',
      primaryUse: 'State-sponsored legal defense for citizens facing detention or lack of representation',
      availableHours: 'Mon-Fri 08:00 - 17:00 GMT'
    },
    chrajDesk: {
      id: 'chraj-human-rights',
      name: 'Commission on Human Rights and Administrative Justice (CHRAJ)',
      rawNumber: '0302662150',
      displayNumber: '+233 (0) 302 662 150',
      internationalNumber: '+233302662150',
      actionUrl: 'tel:+233302662150',
      type: 'oversight',
      primaryUse: 'Constitutional watchdog for abuses of power and fundamental human rights violations',
      availableHours: 'Mon-Fri 08:00 - 17:00 GMT'
    }
  };

  // 3. STATUTORY LAW & CITIZEN SAFEGUARD REPOSITORY (19 COMPREHENSIVE ENTRIES)
  const GHANA_LAWS_DATA = [
    {
      id: 'phone-laptop-search',
      category: 'digital-privacy',
      title: 'Warrantless Phone & Laptop Searches ("Yahoo Boy" / Cyber Checks)',
      statute: '1992 Constitution Art. 18(2); Cybersecurity Act, 2020 (Act 1038) Sec. 69-71; Electronic Transactions Act, 2008 (Act 772) Sec. 98-99',
      caseLaw: 'Edmund Addo v. Attorney-General & Inspector General of Police (Suit No. HR/0056/2017, High Court, Accra)',
      threatLevel: 'HIGH',
      threatScore: 75,
      keywords: [
        'phone', 'laptop', 'unlock', 'passcode', 'pin', 'password', 'whatsapp',
        'messages', 'photos', 'gallery', 'telegram', 'crypto', 'binance', 'usdt',
        'yahoo boy', 'cyber', 'fraud', 'scam', 'search my phone', 'open your phone',
        'give me your phone', 'let me see your phone', 'unlock it'
      ],
      summary: 'Under Article 18(2) of the 1992 Constitution and the landmark High Court decision in Edmund Addo v. AG & IGP, citizens enjoy an inviolable right to privacy of their correspondence and communications. An officer cannot demand your phone, force you to enter your passcode, or scroll through your WhatsApp, gallery, or crypto apps at a checkpoint without a specific judicial warrant issued by a competent court under Act 1038.',
      citizenRights: [
        'You have the legal right to keep your phone locked and refuse to supply your biometric fingerprint or PIN.',
        'You have the right to request the officer produce a signed judicial search warrant under Act 1038 specifying your device.',
        'You have the right to demand that any forensic digital inspection happen at a designated police station in the presence of your lawyer.'
      ],
      officerLimits: [
        'Officers are strictly prohibited from seizing digital devices solely on the pretext that the owner is young or possesses an expensive smartphone.',
        'Officers cannot browse your WhatsApp chats, email, bank statements, or cryptocurrency wallets at a checkpoint.',
        'Officers cannot threaten arrest or detention solely because you refuse to unlock your phone.'
      ],
      sayThis: 'Respectfully Officer, under Article 18(2) of the 1992 Constitution and High Court precedent, my mobile phone contains private, privileged communications. Unless you have a judicial search warrant issued by a court of competent jurisdiction under the Cybersecurity Act, I cannot unlock it at this checkpoint. If you suspect an offence, let us proceed to your police station so I may invite my legal counsel.',
      earbudWhisper: 'Do not unlock your device. Under Article 18(2), police cannot search your phone without a court warrant. Respectfully decline and offer to go to the station with your lawyer.'
    },
    {
      id: 'snatching-ignition-keys',
      category: 'keys-impound-cash',
      title: 'Snatching Car Ignition Keys & Peeling Windscreen Stickers',
      statute: '1992 Constitution Art. 18(1); Ghana Police Service Regulations, 2012 (C.I. 76); GPS MTTD Command Directives (2020 & 2023)',
      caseLaw: 'Directives on Arbitrary Deprivation of Property & MTTD Standard Operational Guidelines',
      threatLevel: 'HIGH',
      threatScore: 80,
      keywords: [
        'key', 'keys', 'ignition', 'snatch', 'take key', 'turn off car', 'switch off engine',
        'windscreen', 'peel', 'sticker', 'roadworthy', 'insurance sticker', 'dvla sticker',
        'take the key', 'give me the key'
      ],
      summary: 'Reaching into a citizen\'s vehicle to snatch keys or forcibly turning off the engine constitutes an unlawful safety hazard and arbitrary deprivation of control. Furthermore, peeling off DVLA roadworthy or National Insurance Commission stickers is strictly forbidden under Ghana Police Service operational orders. Officers must inspect documents visually without damaging or seizing the vehicle ignition.',
      citizenRights: [
        'You are entitled to retain physical control of your vehicle ignition while parked safely at the roadside.',
        'You have the right to present your physical or digital documents for visual verification through a partially rolled-down window.',
        'You have the right to report immediate key snatching to PPSB as an endangerment and abuse of authority.'
      ],
      officerLimits: [
        'Officers cannot reach through the vehicle window to grab keys, steering wheels, or belongings.',
        'Officers cannot physically tear, peel, or scratch insurance or roadworthy certificates off your windscreen.',
        'Officers cannot compel you to surrender your car keys before an offense has been formally communicated.'
      ],
      sayThis: 'Officer, respectfully, I am fully compliant and parked safely. Under Ghana Police Service directives, officers are not permitted to reach into a vehicle or confiscate car keys. I will keep the engine turned off safely while you inspect my documentation.',
      earbudWhisper: 'Keep your car keys secure. Officers cannot legally snatch your ignition keys or peel windscreen stickers under Police Service directives.'
    },
    {
      id: 'impounding-minor-offense',
      category: 'keys-impound-cash',
      title: 'Impounding Vehicles for Minor Traffic Offenses',
      statute: 'Attorney-General\'s Binding Directive to the IGP (Ref: D22/SL.1/24, April 2024); Road Traffic Act, 2004 (Act 683); Road Traffic Regulations, 2012 (L.I. 2180)',
      caseLaw: 'Attorney-General Binding Circular to the Ghana Police Service on Unlawful Impoundment of Motor Vehicles (2024)',
      threatLevel: 'ELEVATED',
      threatScore: 60,
      keywords: [
        'impound', 'tow', 'drive to station', 'station', 'park car', 'yard', 'compound',
        'minor offense', 'seatbelt', 'wrong turn', 'indicator', 'lane', 'traffic light',
        'seize car', 'take car', 'charge office'
      ],
      summary: 'In April 2024, the Attorney-General and Minister for Justice issued a binding directive to the Inspector-General of Police clarifying that officers have NO legal authority to impound private vehicles or force drivers to the police station for minor traffic infractions (such as improper lane changes, failure to signal, or expired roadworthiness). The statutory procedure is to inspect the driver\'s license and issue a formal summons or notice of prosecution.',
      citizenRights: [
        'You have the right to request a formal Court Summons / Notice of Offense rather than having your vehicle impounded.',
        'You are legally entitled to drive your vehicle away after providing your verified identity and license details for minor infractions.',
        'You can quote the Attorney-General\'s 2024 Directive if an officer threatens to seize your car for an everyday traffic violation.'
      ],
      officerLimits: [
        'Officers cannot tow, drive, or impound a motor vehicle for minor regulatory traffic infractions.',
        'Officers cannot detain the driver inside a police compound unless the vehicle is stolen, unroadworthy to a hazardous degree, or involved in a felony.',
        'Officers cannot demand extortionate "towing fees" or gate fees for minor stops.'
      ],
      sayThis: 'Officer, with all due respect, the Attorney-General issued a binding directive to the IGP in April 2024 prohibiting the impounding of vehicles for minor traffic offenses. I have provided my details and driver\'s license. Please issue the appropriate notice or summons and allow me to proceed.',
      earbudWhisper: 'Cite the Attorney-General\'s 2024 Directive to the IGP. Officers cannot impound your vehicle for minor traffic infractions.'
    },
    {
      id: 'roadside-cash-extortion',
      category: 'keys-impound-cash',
      title: 'Roadside Cash Demands, "Spot Fines" & Mobile Money Extortion',
      statute: 'Criminal Offences Act, 1960 (Act 29) Sec. 239 (Extortion by Public Officers); Road Traffic Regulations, 2012 (L.I. 2180) Reg. 157',
      caseLaw: 'Republic v. High Court (Anti-Corruption Standards); GPS Disciplinary Sanctions under C.I. 76 Reg. 82',
      threatLevel: 'HIGH',
      threatScore: 78,
      keywords: [
        'cash', 'spot fine', 'money', 'pay here', 'momo', 'mobile money', 'settle',
        'give me something', 'weekend', 'water', 'buy drink', 'bribe', 'fine on the spot',
        'something small', 'sort me out', 'settle here'
      ],
      summary: 'Under Ghanaian law, there is NO statutory provision permitting a police officer to collect cash on the road or accept Mobile Money payments as a "spot fine". Any official fine must be adjudicated by a court of competent jurisdiction or paid through official Ghana.GOV revenue collection channels with an official receipt. Demanding money to drop a charge is criminal extortion under Section 239 of Act 29.',
      citizenRights: [
        'You have the absolute right to refuse any cash payment or private MoMo transfer to an officer.',
        'You have the right to demand a formal charge sheet and court appearance where fines are assessed by a Magistrate.',
        'You have the right to capture the officer\'s name, service number, and MoMo recipient account to submit to PPSB.'
      ],
      officerLimits: [
        'Officers are strictly prohibited from receiving cash, soliciting gifts, or offering roadside settlements.',
        'Officers cannot provide personal or third-party Mobile Money merchant numbers for fine payments.',
        'Officers cannot detain you merely because you insist on going through the formal legal court process.'
      ],
      sayThis: 'Officer, Ghanaian law and Police Service Regulations do not permit roadside cash collections or MoMo spot fines. If you believe I have committed a traffic violation, please write out a formal charge or summons so I can present it before the court or pay through the official Ghana.GOV portal.',
      earbudWhisper: 'Never pay cash or MoMo at the roadside. Spot fines are illegal under L.I. 2180. Demand an official court summons.'
    },
    {
      id: 'missing-license-24h',
      category: 'traffic-mttd',
      title: 'Driver\'s License Not Physically Present (The 24-Hour Grace Period)',
      statute: 'Road Traffic Act, 2004 (Act 683) Sec. 120(6) & Sec. 120(7); Road Traffic Regulations, 2012 (L.I. 2180) Reg. 154',
      caseLaw: 'Statutory 24-Hour Production Mandate at nominated Police Station',
      threatLevel: 'LOW',
      threatScore: 30,
      keywords: [
        'driver\'s license', 'driving licence', 'license', 'licence', 'forgot license',
        'left license at home', 'show license', 'dvla', 'permit', '24 hours', 'grace period',
        'where is your license', 'no license'
      ],
      summary: 'Section 120(6) of the Road Traffic Act, 2004 (Act 683) specifically guarantees that if a driver is not holding their physical driver\'s license at the time of a stop, it is NOT an instant arrestable offense, provided they produce the license at a police station specified by the driver within 24 hours. Digital verification via DVLA platforms is also recognized.',
      citizenRights: [
        'You have the statutory right to request a 24-hour grace window to produce your physical driver\'s license.',
        'You can designate the police station closest to your home or office where you will present the license within 24 hours.',
        'You may display a verified digital photo or DVLA digital copy of your license on your device for immediate verification.'
      ],
      officerLimits: [
        'Officers cannot instantly arrest you or impound your vehicle solely for leaving your license at home, provided you identify yourself truthfully.',
        'Officers cannot refuse your statutory right under Act 683 Sec. 120(6) to nominate a police station for production.',
        'Officers cannot demand an on-the-spot cash penalty for failure to carry the physical card.'
      ],
      sayThis: 'Officer, I am a duly licensed driver. Under Section 120, Subsection 6 of the Road Traffic Act (Act 683), I am permitted 24 hours to produce my driver\'s license at a police station of my choosing. I will happily nominate the nearest station and present it within the required timeframe.',
      earbudWhisper: 'Under Act 683 Sec. 120(6), you have 24 hours to produce your driving license at any police station you nominate. Do not panic.'
    },
    {
      id: 'extinguisher-triangles-kit',
      category: 'traffic-mttd',
      title: 'Fire Extinguisher, First Aid Kit & Advance Warning Triangles',
      statute: 'Road Traffic Regulations, 2012 (L.I. 2180) Reg. 69 & Reg. 83',
      caseLaw: 'L.I. 2180 Statutory Equipment Specifications (1kg dry powder for saloon/SUV, pair of 2 red triangles placed 45m in emergency)',
      threatLevel: 'LOW',
      threatScore: 25,
      keywords: [
        'fire extinguisher', 'warning triangle', 'triangles', 'first aid', 'kit',
        'reflector', 'safety equipment', 'expired extinguisher', 'pressure gauge',
        'red triangle', 'two triangles'
      ],
      summary: 'Under L.I. 2180 Regulation 69 & 83, every private motor vehicle must carry an operable fire extinguisher (minimum 1kg ABC dry powder for saloon cars/SUVs) and a pair of two reflective advance warning triangles. Officers may inspect the extinguisher pressure gauge and the first aid box. However, minor technical disputes should result in a compliance warning or standard citation, never roadside harassment.',
      citizenRights: [
        'You have the right to show your mounted fire extinguisher, warning triangles, and first aid kit.',
        'If an extinguisher has recently lost pressure, you are entitled to receive a notice to remedy rather than arbitrary detention.',
        'You have the right to observe the officer\'s visual check without exiting your vehicle if safety permits.'
      ],
      officerLimits: [
        'Officers cannot seize or discharge your fire extinguisher without reasonable justification.',
        'Officers cannot impound a vehicle solely because a warning triangle is missing if the driver provides their particulars.',
        'Officers cannot demand on-the-spot unofficial payment for an expired extinguisher.'
      ],
      sayThis: 'Officer, here are my two advance warning triangles and my 1kg ABC fire extinguisher as mandated by Regulation 69 and 83 of L.I. 2180. The gauge indicates proper pressure and the equipment is fully serviceable.',
      earbudWhisper: 'L.I. 2180 requires 1kg ABC dry powder extinguisher and 2 warning triangles. If missing, officer may only issue a citation, not impound.'
    },
    {
      id: 'profiling-dreadlocks-tattoos',
      category: 'profiling-looks',
      title: 'Profiling by Looks, Dreadlocks, Tattoos, or Luxury Cars',
      statute: '1992 Constitution Art. 17(1) & (2) (Equality and Freedom from Discrimination); Criminal Procedure Act, 1960 (Act 30) Sec. 10',
      caseLaw: 'Tyron Iras Marhguy v. Achimota School Board (2021) JELR 97479 (High Court, Human Rights Division)',
      threatLevel: 'ELEVATED',
      threatScore: 65,
      keywords: [
        'dreadlocks', 'rasta', 'locs', 'tattoos', 'tinted', 'benz', 'young boy',
        'suspicious looks', 'dress', 'earrings', 'luxury car', 'yahoo look', 'appearance',
        'why do you have dreadlocks', 'why are you driving this car'
      ],
      summary: 'Article 17 of the 1992 Constitution strictly forbids discrimination on the grounds of gender, race, colour, ethnic origin, or social or economic status. Wearing dreadlocks, having tattoos, being young, or driving a luxury vehicle does NOT constitute "reasonable suspicion" under Section 10 of Act 30. Police stops must be grounded in observable criminal conduct or specific articulable intelligence.',
      citizenRights: [
        'You have the right to express your bodily autonomy, cultural identity, and style without being branded a criminal.',
        'You have the right to ask the officer what specific observable traffic or penal violation prompted the stop.',
        'You have the right to file a complaint with CHRAJ for discriminatory profiling and harassment.'
      ],
      officerLimits: [
        'Officers cannot pull over, harass, or interrogate citizens solely on account of dreadlocks, braids, tattoos, or modern dress.',
        'Officers cannot assume a youth in a Mercedes-Benz or foreign registered car is an internet fraudster without evidence.',
        'Officers cannot make derogatory remarks regarding a citizen\'s religion, culture, or personal appearance.'
      ],
      sayThis: 'Officer, under Article 17 of the 1992 Constitution of Ghana, all persons are equal before the law and free from discrimination. My dreadlocks, tattoos, and vehicle are lawful expressions of my personal identity. Could you kindly inform me of the specific statutory infraction you observed today?',
      earbudWhisper: 'Your appearance is protected under Article 17. Hairstyle or driving a luxury car is not reasonable suspicion under Act 30. Remain calm and firm.'
    },
    {
      id: 'cannabis-narcotics-search',
      category: 'narcotics-search',
      title: 'Suspected Smoking, Cannabis & Narcotics Search Protocols',
      statute: 'Narcotics Control Commission Act, 2020 (Act 1019) Sec. 37-43 as amended by Act 1100 (2023); Criminal Procedure Act, 1960 (Act 30) Sec. 93',
      caseLaw: 'Republic v. Mark Foley (2007); Strict Chain of Custody & Packaging Requirements',
      threatLevel: 'CRITICAL',
      threatScore: 90,
      keywords: [
        'weed', 'cannabis', 'wee', 'smoke', 'smell', 'drugs', 'narcotics', 'roll',
        'joint', 'pipe', 'blunt', 'parcel', 'sniffing', 'substance', 'marijuana',
        'search for drugs', 'it smells like wee'
      ],
      summary: 'Under the Narcotics Control Commission Act, 2020 (Act 1019) and Criminal Procedure Act (Act 30 Sec. 93), while officers have powers to search where reasonable grounds exist for illicit drug possession, any search MUST be conducted in full plain view of the suspect, witnessed, and any alleged substance must be sealed immediately in tamper-evident packaging with a contemporaneous inventory to prevent planting.',
      citizenRights: [
        'You have the absolute right to stand and watch every compartment, glovebox, or bag being searched to prevent evidence planting.',
        'You have the right to demand that an independent neutral civilian witness be present during any bag or vehicle search.',
        'You have the right to refuse to sign any inventory or statement claiming ownership of unsealed or planted items.'
      ],
      officerLimits: [
        'Officers cannot reach into compartments or pockets out of your line of sight.',
        'Officers cannot fabricate a claim of "smelling cannabis" as a pretext to extort cash without carrying out formal documented procedures.',
        'Officers must strictly maintain an unbroken chain of custody and seal suspected items in front of you.'
      ],
      sayThis: 'Officer, I understand your duty. However, under Section 93 of Act 30, any search must be conducted in my clear line of sight. Please do not reach into any compartment without me observing your hands. If any item is inspected, let it be documented in the presence of an independent witness.',
      earbudWhisper: 'Keep your eyes on the officer\'s hands at all times. Insist on watching the search to prevent evidence planting. Demand an independent witness.'
    },
    {
      id: 'female-search-gender-rule',
      category: 'profiling-looks women',
      title: 'Searching Female Citizens (Strict Same-Gender Rule & Strip Search Ban)',
      statute: 'Criminal Procedure Act, 1960 (Act 30) Sec. 8(3); 1992 Constitution Art. 15(1) & (2) (Inviolability of Human Dignity)',
      caseLaw: 'Constitutional Standard on Dignity & Protection Against Inhuman or Degrading Treatment',
      threatLevel: 'CRITICAL',
      threatScore: 92,
      keywords: [
        'search female', 'female officer', 'touch woman', 'pat down woman', 'strip search',
        'undress', 'bra', 'panties', 'woman', 'lady', 'girl', 'male officer searching',
        'body search', 'frisk'
      ],
      summary: 'Section 8(3) of the Criminal Procedure Act, 1960 (Act 30) explicitly commands: "Whenever it is necessary to search a woman, the search shall be made by another woman and with strict regard to decency." A male police officer is strictly barred from touching, frisking, or conducting a bodily search on a female citizen under any circumstances. Furthermore, roadside strip searches are unconstitutional under Article 15.',
      citizenRights: [
        'Female citizens have the statutory right to categorically refuse a body search by any male officer.',
        'You have the right to insist on being taken to a police station to be searched exclusively by a female officer in a private room.',
        'You have the right to human dignity under Article 15—no officer can compel you to remove clothing in public.'
      ],
      officerLimits: [
        'Male officers are strictly prohibited from touching, patting down, or searching a woman\'s body, pockets, or intimate belongings.',
        'Officers cannot perform roadside body inspections or strip searches on any citizen regardless of gender.',
        'Officers cannot intimidate a female citizen into waiving her statutory right under Section 8(3).'
      ],
      sayThis: 'Officer, under Section 8 Subsection 3 of the Criminal Procedure Act (Act 30), a female citizen can only be searched by a female officer with strict regard to decency. As a male officer, you are legally prohibited from touching or patting down my person. If a search is required, please provide a female officer or take me to the station.',
      earbudWhisper: 'Male officers cannot touch or search a woman under Act 30 Sec. 8(3). Refuse physical contact and demand a female officer in a private room.'
    },
    {
      id: 'vehicle-bag-search-inventory',
      category: 'narcotics-search',
      title: 'Roadside Vehicle & Bag Searches Without Warrant (Witnessing & Inventory)',
      statute: 'Criminal Procedure Act, 1960 (Act 30) Sec. 93; 1992 Constitution Art. 18(2)',
      caseLaw: 'Republic v. Akosah (1975) 2 GLR 406 (Legal tests for search and seizures)',
      threatLevel: 'ELEVATED',
      threatScore: 55,
      keywords: [
        'open your boot', 'search car', 'search trunk', 'open your bag', 'inspect bag',
        'search backpack', 'what is inside', 'empty pockets', 'boot', 'trunk', 'glove compartment'
      ],
      summary: 'While Section 93 of Act 30 allows police to search vehicles at checkpoints where there is reasonable suspicion of stolen goods or contraband, the search must be reasonable, respectful of Article 18(2) privacy, and conducted strictly in the presence of the vehicle owner. You have the right to observe every bag opened and require a written inventory if anything is seized.',
      citizenRights: [
        'You have the right to exit and personally open the boot/trunk yourself rather than having an officer rummage through unattended.',
        'You have the right to request the officer state what specific contraband or suspected stolen item they are searching for.',
        'If any item is confiscated, you are entitled to an immediate signed seizure voucher or property inventory.'
      ],
      officerLimits: [
        'Officers cannot conduct searches secretly while keeping you isolated in the police car or distracted.',
        'Officers cannot rifle through personal diaries, business documents, or private letters unrelated to the stop.',
        'Officers cannot seize private property without issuing a formal receipt (Police Form 12 / Seizure Voucher).'
      ],
      sayThis: 'Officer, I am happy to open my vehicle boot for your visual inspection. In line with Section 93 of Act 30, I will stand right here with you to observe the inspection. Please point to what you would like me to unpack.',
      earbudWhisper: 'You should personally open the trunk and watch their hands. Never let an officer search your vehicle bags while you are not watching.'
    },
    {
      id: 'premises-warrant-night-rule',
      category: 'digital-privacy',
      title: 'Home / Premises Search Warrant & The Daylight Rule (6:30 AM – 6:30 PM)',
      statute: 'Criminal Procedure Act, 1960 (Act 30) Sec. 88, 89, 90 & 91; 1992 Constitution Art. 18(2)',
      caseLaw: 'Edmund Addo v. AG & IGP (2017) (Invalidation of warrantless residential searches and arbitrary raids)',
      threatLevel: 'HIGH',
      threatScore: 85,
      keywords: [
        'search warrant', 'enter house', 'search room', 'premises', 'apartment',
        'break door', 'night search', '6:30', 'after sunset', 'enter home', 'raiding',
        'open the door', 'police search my room'
      ],
      summary: 'Under Section 88–91 of Act 30 and Article 18(2) of the Constitution, police cannot enter or search your private residence without a valid search warrant signed by a Magistrate or Judge. Crucially, under Section 90 of Act 30, a search warrant can ONLY be executed between 6:30 a.m. and 6:30 p.m., unless the Judge has explicitly endorsed the warrant for night-time execution on strong grounds.',
      citizenRights: [
        'You have the right to see and inspect the original search warrant before opening your door or granting entry.',
        'You have the right to check if the warrant is signed by a Magistrate, names your exact address, and is still valid in date.',
        'You have the right to refuse entry between 6:30 p.m. and 6:30 a.m. unless night execution is specifically written on the warrant.'
      ],
      officerLimits: [
        'Officers cannot kick down doors or force entry into private residences without a warrant, except in hot pursuit of a fleeing felon.',
        'Officers cannot execute standard search warrants in the dead of night without judicial authorization.',
        'Officers cannot seize items not specified or related to the offense described in the warrant.'
      ],
      sayThis: 'Officer, under Article 18(2) of the Constitution and Section 90 of the Criminal Procedure Act (Act 30), a premises search requires a judicial search warrant executable between 6:30 AM and 6:30 PM. Please slide the warrant under the door or hold it to the glass so I can verify the Magistrate\'s signature and endorsement.',
      earbudWhisper: 'Demand to see the search warrant. By law (Act 30 Sec. 90), warrants are only valid from 6:30am to 6:30pm unless specifically endorsed for night.'
    },
    {
      id: 'recording-police-public',
      category: 'recording-accountability',
      title: 'Right to Record Police in Public & Court Admissibility',
      statute: '1992 Constitution Art. 21(1)(a) & (f); Evidence Act, 1975 (NRCD 323) Sec. 51 & 136; MTTD & Police Administration Directives',
      caseLaw: 'New Patriotic Party v. Ghana Broadcasting Corporation (1993-94) 2 GLR 354; Admissibility of Electronic Evidence',
      threatLevel: 'HIGH',
      threatScore: 70,
      keywords: [
        'stop recording', 'put your phone down', 'delete video', 'don\'t film me',
        'seize camera', 'recording police', 'why are you recording', 'turn off camera',
        'delete it', 'stop filming', 'no video'
      ],
      summary: 'Under Article 21(1)(a) and (f) of the 1992 Constitution, citizens have fundamental freedoms of speech and information. Filming police officers executing public duties in public spaces is fully lawful in Ghana. Police directives have repeatedly clarified that recording does not constitute obstruction unless a citizen physically impedes an arrest. Under Section 136 of NRCD 323, video and audio recordings are admissible real evidence.',
      citizenRights: [
        'You have the legal right to record video, audio, or take photographs of police officers performing public duties in public areas.',
        'You have the right to refuse orders to delete, erase, or surrender your footage.',
        'Your recording is protected legal evidence admissible in court and before the PPSB disciplinary board.'
      ],
      officerLimits: [
        'Officers cannot lawfully order you to stop recording or delete existing video recordings.',
        'Officers cannot seize, smash, or tamper with your phone to prevent recording.',
        'Officers cannot arrest you for "obstruction" merely because you are standing at a safe distance recording the encounter.'
      ],
      sayThis: 'Officer, respectfully, under Article 21(1) of the 1992 Constitution, I am exercising my constitutional freedom to record this encounter in a public space. I am standing at a safe distance and not obstructing your duties. My recording protects both of us and ensures professional transparency.',
      earbudWhisper: 'You have the constitutional right to record police in public. Stand back, remain calm, and never delete your recording.'
    },
    {
      id: 'plainclothes-cid-warrant-card',
      category: 'recording-accountability',
      title: 'Plainclothes CID / Ununiformed Officers Demanding Compliance',
      statute: 'Police Service Act, 1970 (Act 350); Police Service Regulations, 2012 (C.I. 76) Reg. 104; Criminal Procedure Act, 1960 (Act 30) Sec. 10',
      caseLaw: 'Police Service Regulations C.I. 76 Mandatory Warrant Card Identification Precedent',
      threatLevel: 'HIGH',
      threatScore: 78,
      keywords: [
        'plainclothes', 'cid', 'civilian clothes', 'undercover', 'show me id',
        'warrant card', 'who are you', 'police id', 'unmarked car', 'not in uniform',
        'national security', 'special operations'
      ],
      summary: 'Under Regulation 104 of C.I. 76 and the Police Service Act (Act 350), every police officer who is not in official uniform (such as CID operatives, special squads, or undercover officers) MUST identify themselves by producing their official Ghana Police Service Warrant Card before giving orders, demanding compliance, or initiating an arrest.',
      citizenRights: [
        'You have the right to see, hold, and inspect the officer\'s official GPS Warrant Card with their photograph, rank, and service number.',
        'You have the right to refuse to enter an unmarked civilian vehicle until their identity is verified by a nearby uniformed patrol or station.',
        'If an ununiformed person brandishes a firearm without producing police credentials, you are entitled to treat it as a potential robbery or assault.'
      ],
      officerLimits: [
        'Plainclothes personnel cannot demand submission or stop vehicles without displaying their Warrant Card.',
        'Officers cannot demand a citizen board an unbranded, unmarked private car without clear identification.',
        'Officers cannot hide behind vague phrases like "National Security" to avoid producing official identification.'
      ],
      sayThis: 'Officer, since you are in civilian attire, Regulation 104 of Police Service Regulations (C.I. 76) requires that you produce your official Ghana Police Service Warrant Card. Please allow me to inspect your identification card before we proceed.',
      earbudWhisper: 'Under C.I. 76 Reg. 104, plainclothes officers MUST produce their official Police Warrant Card before giving orders. Verify ID before complying.'
    },
    {
      id: 'officer-tag-service-number',
      category: 'recording-accountability',
      title: 'Uniformed Officer Name Tag & Service Number Identification',
      statute: 'Police Service Regulations, 2012 (C.I. 76) Reg. 102 & 104; Ghana Police Service Code of Conduct',
      caseLaw: 'CHRAJ Police Accountability Guidelines on Officer Visibility & Transparency',
      threatLevel: 'ELEVATED',
      threatScore: 50,
      keywords: [
        'name tag', 'service number', 'officer name', 'hidden tag', 'badge number',
        'identify yourself', 'which station', 'rank', 'covered name', 'what is your name'
      ],
      summary: 'Under Police Service Regulations (C.I. 76), every uniformed police officer deployed on public duty must display their name tag and service number clearly on their uniform chest. Obscuring, removing, or concealing identity tags is a disciplinary offense under C.I. 76. Citizens are fully entitled to ask for and note an officer\'s name, rank, and stationed division.',
      citizenRights: [
        'You have the right to politely request the name and service number of any officer stopping you.',
        'You have the right to write down or voice-record their station, unit, and vehicle registration number.',
        'You have the right to report any officer who deliberately conceals or removes their name tag to the PPSB.'
      ],
      officerLimits: [
        'Officers cannot cover their name tags with tactical vests or tape to avoid accountability.',
        'Officers cannot threaten or retaliate against a citizen for asking for their service identification.',
        'Officers cannot provide false or fictitious names during an official duty stop.'
      ],
      sayThis: 'Officer, for mutual transparency and in accordance with Police Service Regulations, could you kindly confirm your name and service number, and which station you are attached to?',
      earbudWhisper: 'Officers are legally required to display their name tag and service number under C.I. 76. Note their details calmly.'
    },
    {
      id: 'unlawful-arrest-immediate-reason',
      category: 'arrest-detention',
      title: 'Unlawful Arrest & Immediate Reason in Language Understood',
      statute: '1992 Constitution Art. 14(2) & 14(5); Criminal Procedure Act, 1960 (Act 30) Sec. 7 & 10',
      caseLaw: 'Boye-Doe v. Attorney-General (2000) SCGLR; Mandatory Right to Immediate Notification of Reason for Arrest',
      threatLevel: 'HIGH',
      threatScore: 82,
      keywords: [
        'under arrest', 'you are arrested', 'enter the car', 'enter cell', 'charge sheet',
        'reason for arrest', 'offense', 'handcuffed without reason', 'why are you arresting me',
        'you will know when we reach station'
      ],
      summary: 'Article 14(2) of the 1992 Constitution strictly commands: "A person who is arrested, restricted or detained shall be informed immediately, in a language that he understands, of the reasons for his arrest, restriction or detention and of his right to a lawyer of his choice." Officers cannot arrest you first and "explain when we get to the station." Under Article 14(5), unlawful arrest mandates financial compensation.',
      citizenRights: [
        'You have the constitutional right to be told the exact criminal charge or legal ground immediately upon arrest.',
        'You have the right to be addressed in a language you fully comprehend (English, Twi, Ga, Ewe, Hausa, etc.).',
        'Under Article 14(5), any person unlawfully arrested or detained is entitled to compensation from the offending person or authority.'
      ],
      officerLimits: [
        'Officers cannot arrest anyone without immediately stating the specific offense or statutory reason.',
        'Officers cannot say "You will know at the station" or refuse to clarify the reason for detention.',
        'Officers cannot effect an arrest without reasonable suspicion of a committed or attempted crime.'
      ],
      sayThis: 'Officer, under Article 14(2) of the 1992 Constitution, I have the constitutional right to be informed immediately, in language I understand, of the exact reason for my arrest and my right to a lawyer. Please state clearly what statutory offense I am being arrested for.',
      earbudWhisper: 'Police must immediately state the reason for arrest under Constitution Art. 14(2). If they say "at the station", that violates constitutional law.'
    },
    {
      id: 'forty-eight-hour-detention-limit',
      category: 'arrest-detention',
      title: 'The 48-Hour Detention Limit (Including Weekends & Public Holidays)',
      statute: '1992 Constitution Art. 14(3)(b); Criminal Procedure Act, 1960 (Act 30)',
      caseLaw: 'Martin Kpebu v. Attorney-General (No. 2) [2015-2016] 1 SCGLR 171 (Supreme Court landmark decision)',
      threatLevel: 'CRITICAL',
      threatScore: 95,
      keywords: [
        '48 hours', 'weekend detention', 'friday arrest', 'police bail', 'remand',
        'court', 'monday', 'keep you till monday', 'bail is free', 'detention limit',
        'cell', 'station bail', 'weekend'
      ],
      summary: 'Under Article 14(3) of the 1992 Constitution and the historic Supreme Court ruling in Martin Kpebu v. Attorney-General (2016), an arrested person MUST be brought before a court of competent jurisdiction within 48 hours of detention. The Supreme Court struck down the old practice of detaining suspects over weekends; the 48-hour limit applies continuously, including weekends and public holidays. Furthermore, Police Enquiry Bail is strictly free by law.',
      citizenRights: [
        'You must either be granted police inquiry bail or brought before a judge within 48 hours from the exact minute of arrest.',
        'The 48-hour rule does NOT pause for Saturdays, Sundays, or statutory public holidays (Martin Kpebu v. AG).',
        'Police enquiry bail is completely free; paying money for bail to an investigator is illegal and extortionate.'
      ],
      officerLimits: [
        'Police cannot deliberately arrest suspects on Friday afternoons to hold them until Monday without court access.',
        'Officers cannot hold any citizen beyond 48 hours without an explicit remand order issued by a court of law.',
        'Desk officers cannot demand money or gifts for processing bail guarantees.'
      ],
      sayThis: 'Station Officer, under Article 14(3) of the Constitution and the Supreme Court decision in Martin Kpebu v. Attorney-General, the 48-hour detention limit applies continuously across weekends and holidays. I am entitled to immediate police inquiry bail, which is free by law, or to be presented before a court.',
      earbudWhisper: 'Supreme Court ruling in Martin Kpebu states 48-hour detention limit applies through weekends and holidays. Police bail is free. Demand bail.'
    },
    {
      id: 'handcuffs-assault-dignity',
      category: 'arrest-detention',
      title: 'Unnecessary Handcuffs, Physical Assault & Driving Suspects Around',
      statute: 'Criminal Procedure Act, 1960 (Act 30) Sec. 6, 9 & 15; 1992 Constitution Art. 15 (Inviolability of Human Dignity)',
      caseLaw: 'Constitutional Enforcement against Excessive Force, Inhuman Treatment and Wandering Patrols',
      threatLevel: 'CRITICAL',
      threatScore: 92,
      keywords: [
        'handcuffs', 'slap', 'beat', 'assault', 'drive around', 'wandering', 'detour',
        'take him round town', 'sit in the boot', 'brutalize', 'force', 'violence',
        'strike', 'drag'
      ],
      summary: 'Section 6 of Act 30 mandates that an arrested person shall NOT be subjected to more restraint than is necessary to prevent escape. Handcuffing a compliant, non-violent citizen is unlawful. Furthermore, under Section 9 & 15 of Act 30, officers must convey an arrested citizen directly and immediately to the nearest police station; driving suspects around town, taking detours, or making threatening stops is unlawful intimidation and false imprisonment.',
      citizenRights: [
        'You have the right to be free from physical assault, battery, slapping, or degrading treatment under Article 15.',
        'You have the right to immediate, direct conveyance to a designated police station without unauthorized detours.',
        'You have the right to medical examination and documentation if subjected to physical force.'
      ],
      officerLimits: [
        'Officers cannot handcuff a peaceful, compliant citizen unless there is an active threat or escape attempt.',
        'Officers cannot assault, strike, kick, or verbally abuse any citizen in their custody.',
        'Officers cannot drive suspects around town in patrol vehicles to terrorize them or pressure them into extortion.'
      ],
      sayThis: 'Officer, Section 6 of the Criminal Procedure Act (Act 30) prohibits unnecessary restraint on a compliant person, and Article 15 protects my human dignity. I am cooperating fully and not resisting. Also, under Section 15 of Act 30, please take me directly to the police station without detours.',
      earbudWhisper: 'Handcuffing a compliant person violates Act 30 Sec. 6. Officers must take you directly to the station, not drive you around town.'
    },
    {
      id: 'right-to-silence-counsel',
      category: 'silence-interrogation',
      title: 'Right to Silence & Refusing Caution Statement Without Lawyer',
      statute: '1992 Constitution Art. 19(2)(c) & Art. 19(10); Art. 14(2); Evidence Act, 1975 (NRCD 323) Sec. 120',
      caseLaw: 'Republic v. Akoto (1969); Frimpong v. The Republic (2012) (Mandatory presence of independent witness/lawyer for caution statements)',
      threatLevel: 'HIGH',
      threatScore: 80,
      keywords: [
        'caution statement', 'write statement', 'confess', 'sign this', 'answer question',
        'interrogate', 'write what happened', 'right to silence', 'lawyer', 'admit',
        'statement', 'investigator', 'cid interrogation'
      ],
      summary: 'Under Article 19(2)(c) and 19(10) of the 1992 Constitution, every accused person is presumed innocent and cannot be compelled to give testimony or confess guilt. You have an absolute constitutional right to remain silent. You cannot be forced to write or sign a Police Caution Statement without your lawyer or an independent witness present, as established by the Supreme Court in Frimpong v. The Republic.',
      citizenRights: [
        'You have the absolute right to remain silent and refuse to answer interrogating questions beyond your basic identity.',
        'You have the right to consult your attorney before writing, reciting, or signing any caution or witness statement.',
        'You have the right to ensure an independent person of your choice witnesses any formal recording.'
      ],
      officerLimits: [
        'Investigators cannot coerce, threaten, beat, or manipulate you into writing or signing a caution statement.',
        'Officers cannot deny access to telephone communication with your lawyer or family members.',
        'Officers cannot treat exercising your right to silence as an admission of guilt.'
      ],
      sayThis: 'Officer, under Article 19(10) of the 1992 Constitution, I am exercising my constitutional right to remain silent. I will not make, write, or sign any caution statement until I have consulted with my legal counsel. Please record that I am waiting for my lawyer.',
      earbudWhisper: 'Do not write or sign anything. You have the constitutional right to remain silent under Art. 19(10). Demand your lawyer immediately.'
    },
    {
      id: 'breathalyzer-drunk-driving',
      category: 'traffic-mttd',
      title: 'Breathalyzer & Drunk Driving Testing Safeguards',
      statute: 'Road Traffic Act, 2004 (Act 683) Sec. 4, 5, 6, 7 & 8; Road Traffic (Amendment) Act, 2008 (Act 761)',
      caseLaw: 'Act 683 Sec. 6(4) Mandatory Qualified Medical Doctor Safeguard & Certified Breathalyzer Standards',
      threatLevel: 'ELEVATED',
      threatScore: 68,
      keywords: [
        'breathalyzer', 'alcohol', 'drink driving', 'drunk', 'blown', 'test',
        'alcolyzer', 'beer', 'smell alcohol', 'sobriety test', 'breath test', 'bac'
      ],
      summary: 'Under the Road Traffic Act, 2004 (Act 683 Sec. 4–8), the legal Blood Alcohol Concentration (BAC) limit in Ghana is 0.08% (or 35 micrograms of alcohol per 100ml of breath). Officers administering breathalyzer tests must use certified, calibrated devices with a fresh, sealed mouthpiece. If you dispute the roadside device or require validation, Section 6(4) entitles you to have blood/urine samples taken by a qualified medical practitioner at a hospital.',
      citizenRights: [
        'You have the right to inspect that the breathalyzer mouthpiece is taken from a brand-new, sealed sterile package.',
        'You have the right to see the digital reading on the device immediately after blowing.',
        'If you challenge the roadside reading, you have the statutory right under Act 683 Sec. 6(4) to request an immediate clinical test conducted by a medical doctor.'
      ],
      officerLimits: [
        'Officers cannot reuse dirty mouthpieces or use uncalibrated, uncertified alcohol screening devices.',
        'Officers cannot claim you are drunk based solely on scent without objective testing under Act 683.',
        'Officers cannot refuse your statutory option for medical blood testing at a hospital if roadside results are contested.'
      ],
      sayThis: 'Officer, I am willing to comply with a lawful breath test under Act 683. Please confirm that the device is calibrated and unwrap a fresh, sealed sterile mouthpiece in my presence. If the reading is in question, I request my statutory right to medical examination at the nearest hospital under Section 6.',
      earbudWhisper: 'Insist on a sealed, sterile mouthpiece for any breath test. The legal BAC limit is 0.08%. You can request a hospital blood test if contested.'
    }
  ];

  // 4. ATTACH TO GLOBAL SCOPE (BROWSER WINDOW OR NODE MODULES)
  if (typeof window !== 'undefined') {
    window.GHANA_LAWS_CATEGORIES = GHANA_LAWS_CATEGORIES;
    window.GHANA_LAWS_DATA = GHANA_LAWS_DATA;
    window.EMERGENCY_DIRECTORY = EMERGENCY_DIRECTORY;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      GHANA_LAWS_CATEGORIES,
      GHANA_LAWS_DATA,
      EMERGENCY_DIRECTORY
    };
  }

})(typeof window !== 'undefined' ? window : globalThis);
