/**
 * Pocket Barrister Ghana - Serverless Emergency SOS Dispatcher
 * Endpoint: /.netlify/functions/dispatch-sos
 *
 * Dispatches emergency alerts with real-time GPS coordinates, audio hash,
 * officer identification, and pre-formatted WhatsApp & SMS triggers
 * directed to trusted contacts, defense attorneys, and the Ghana Police PPSB Evidence Desk.
 */

const crypto = require('crypto');

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  const {
    citizenName = 'Ghanaian Citizen',
    contacts = [],
    lawyer = null,
    location = 'Location Unavailable',
    coordinates = null,
    transcriptSummary = 'Police stop in progress.',
    officerBadges = 'Unspecified',
    timestamp = new Date().toISOString(),
    sha256 = null
  } = body;

  // Generate unique Dispatch ID and Incident Token
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const dispatchId = `GH-SOS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

  // Formulate GPS Google Maps link if coordinates available
  let mapLink = '';
  if (coordinates && coordinates.latitude && coordinates.longitude) {
    mapLink = `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
  } else if (typeof location === 'string' && location.includes(',')) {
    mapLink = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
  }

  // Format concise emergency distress message for WhatsApp & SMS
  const formattedAlert = [
    `🚨 EMERGENCY ENCOUNTER ALERT — POCKET BARRISTER GHANA 🚨`,
    `CITIZEN: ${citizenName}`,
    `STATUS: Police Encounter in progress requiring urgent witness/counsel`,
    `TIME: ${new Date(timestamp).toLocaleString('en-GB', { timeZone: 'Africa/Accra' })} GMT`,
    `LOCATION: ${location}`,
    mapLink ? `GPS PIN: ${mapLink}` : null,
    officerBadges && officerBadges !== 'Unspecified' ? `OFFICER / BADGE: ${officerBadges}` : null,
    `DETAILS: "${transcriptSummary}"`,
    sha256 ? `VAULT SHA-256 HASH: ${sha256.substring(0, 16)}...` : null,
    `EVIDENCE PORTAL: https://pocketbarrister.gh/incident/${dispatchId}`,
    `PPSB WHATSAPP DESK: +233 20 663 9121`
  ]
    .filter(Boolean)
    .join('\n');

  const encodedAlert = encodeURIComponent(formattedAlert);

  // Normalize phone numbers for WhatsApp (Ghana: convert 02x / 05x to 2332x / 2335x)
  function normalizeGhanaPhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      digits = '233' + digits.slice(1);
    }
    return digits;
  }

  const whatsappLinks = [];
  const smsLinks = [];

  // 1. PPSB Official WhatsApp Evidence Line (+233 20 663 9121)
  whatsappLinks.push({
    recipient: 'Police Professional Standards Bureau (PPSB)',
    phone: '233206639121',
    url: `https://wa.me/233206639121?text=${encodedAlert}`
  });

  // 2. Lawyer WhatsApp & SMS
  if (lawyer) {
    const rawLawyerPhone = typeof lawyer === 'string' ? lawyer : lawyer.phone || '';
    const normLawyer = normalizeGhanaPhone(rawLawyerPhone);
    if (normLawyer) {
      whatsappLinks.push({
        recipient: typeof lawyer === 'object' && lawyer.name ? `Lawyer: ${lawyer.name}` : 'Legal Counsel',
        phone: normLawyer,
        url: `https://wa.me/${normLawyer}?text=${encodedAlert}`
      });
      smsLinks.push({
        recipient: typeof lawyer === 'object' && lawyer.name ? `Lawyer: ${lawyer.name}` : 'Legal Counsel',
        phone: normLawyer,
        url: `sms:${normLawyer}?body=${encodedAlert}`
      });
    }
  }

  // 3. Trusted Emergency Contacts
  if (Array.isArray(contacts)) {
    contacts.forEach((contact, idx) => {
      const rawPhone = typeof contact === 'string' ? contact : contact.phone || '';
      const name = typeof contact === 'object' && contact.name ? contact.name : `Emergency Contact ${idx + 1}`;
      const normPhone = normalizeGhanaPhone(rawPhone);
      if (normPhone) {
        whatsappLinks.push({
          recipient: name,
          phone: normPhone,
          url: `https://wa.me/${normPhone}?text=${encodedAlert}`
        });
        smsLinks.push({
          recipient: name,
          phone: normPhone,
          url: `sms:${normPhone}?body=${encodedAlert}`
        });
      }
    });
  }

  const incidentUrl = `https://pocketbarrister.gh/incident/${dispatchId}`;

  // Log dispatch event safely (serverless audit log)
  console.log(`[dispatch-sos] Generated SOS Dispatch ID: ${dispatchId} for ${citizenName} at ${location}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      dispatchId,
      incidentUrl,
      timestamp,
      formattedAlert,
      whatsappLinks,
      smsLinks,
      broadcastSummary: {
        totalRecipients: whatsappLinks.length,
        ppsbIncluded: true,
        lawyerIncluded: Boolean(lawyer),
        contactCount: contacts.length
      }
    })
  };
};
