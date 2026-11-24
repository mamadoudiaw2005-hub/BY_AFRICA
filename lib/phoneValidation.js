// ==============================================================================
// VALIDATEUR OFFICIEL DE NUMÉRO DE TÉLÉPHONE SÉNÉGALAIS (SN) - BY_AFRIKA
// ==============================================================================
// Détecte et bloque les faux numéros pour sécuriser les commandes clients.

export const validateSenegalPhone = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Veuillez renseigner votre numéro de téléphone joignable.' };
  }

  // Nettoyage de tous les séparateurs (espaces, tirets, points, parenthèses, slashes)
  let cleaned = rawPhone.trim().replace(/[\s\.\-\(\)\/]/g, '');

  // Supprimer l'indicatif international (+221, 00221, ou 221)
  if (cleaned.startsWith('+221')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('00221')) {
    cleaned = cleaned.substring(5);
  } else if (cleaned.startsWith('221') && cleaned.length === 12) {
    cleaned = cleaned.substring(3);
  }

  // Vérifier qu'il ne reste que des chiffres
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Le numéro de téléphone ne doit comporter que des chiffres.' };
  }

  // Vérification de la longueur (exactement 9 chiffres au Sénégal)
  if (cleaned.length !== 9) {
    return {
      valid: false,
      error: `Numéro incomplet (${cleaned.length} chiffres saisis). Un numéro sénégalais valide comporte exactement 9 chiffres (ex: 77 123 45 67).`
    };
  }

  // Vérification du préfixe opérateur officiel sénégalais
  const prefix2 = cleaned.substring(0, 2);
  const validPrefixes = ['77', '78', '76', '70', '75', '33'];
  if (!validPrefixes.includes(prefix2)) {
    return {
      valid: false,
      error: `Le préfixe "${prefix2}" n'est pas un opérateur valide au Sénégal. Utilisez un numéro mobile : 77, 78 (Orange), 76 (Free), 70 (Expresso) ou 75 (Promobile).`
    };
  }

  // Détection des faux numéros répétitifs (ex: 777777777, 000000000, 111111111)
  if (/^(\d)\1{8}$/.test(cleaned)) {
    return { valid: false, error: 'Numéro fictif non valide (chiffres identiques). Renseignez votre vrai numéro pour la livraison.' };
  }

  // Détection des faux numéros avec uniquement des zéros après l'opérateur (ex: 770000000)
  if (/^(77|78|76|70|75|33)0{7}$/.test(cleaned)) {
    return { valid: false, error: 'Numéro fictif détecté. Veuillez indiquer un vrai numéro pour recevoir votre colis.' };
  }

  // Détection des suites évidentes
  const dummySequences = ['771234567', '781234567', '761234567', '701234567', '751234567', '123456789', '987654321', '779876543', '789876543'];
  if (dummySequences.includes(cleaned)) {
    return { valid: false, error: 'Numéro séquentiel fictif. Veuillez renseigner un numéro de téléphone réel.' };
  }

  // Identification de l'opérateur
  let operator = 'Sénégal';
  let badgeColor = '#dfba5c';
  if (prefix2 === '77' || prefix2 === '78') {
    operator = 'Orange Sénégal';
    badgeColor = '#FF7900';
  } else if (prefix2 === '76') {
    operator = 'Free Sénégal';
    badgeColor = '#ED1C24';
  } else if (prefix2 === '70') {
    operator = 'Expresso Sénégal';
    badgeColor = '#0055A5';
  } else if (prefix2 === '75') {
    operator = 'Promobile Sénégal';
    badgeColor = '#107C41';
  } else if (prefix2 === '33') {
    operator = 'Ligne Fixe Sonatel';
    badgeColor = '#555555';
  }

  // Formatage standard international : +221 XX XXX XX XX
  const formatted = `+221 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)}`;
  const national = `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)}`;

  return {
    valid: true,
    digits: cleaned,
    formatted,
    national,
    operator,
    badgeColor
  };
};
