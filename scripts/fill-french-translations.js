/**
 * Fill in French translations for empty msgstr entries
 *
 * This script reads the French PO file and fills in missing translations
 * based on the English source and glossary terms.
 *
 * Usage: node scripts/fill-french-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FR_PO_PATH = path.join(PROJECT_ROOT, 'locales', 'fr.po');
const EN_PO_PATH = path.join(PROJECT_ROOT, 'locales', 'en.po');

// French translation mappings based on glossary and standard French UI terms
const TRANSLATIONS = {
  // Actions (common.actions.*)
  'common.actions.save': 'Enregistrer',
  'common.actions.saveChanges': 'Enregistrer les modifications',
  'common.actions.saveContact': 'Enregistrer le contact',
  'common.actions.cancel': 'Annuler',
  'common.actions.delete': 'Supprimer',
  'common.actions.edit': 'Modifier',
  'common.actions.add': 'Ajouter',
  'common.actions.remove': 'Retirer',
  'common.actions.close': 'Fermer',
  'common.actions.confirm': 'Confirmer',
  'common.actions.retry': 'Réessayer',
  'common.actions.apply': 'Appliquer',
  'common.actions.clear': 'Effacer',
  'common.actions.reset': 'Réinitialiser',
  'common.actions.update': 'Mettre à jour',
  'common.actions.run': 'Exécuter',

  // States (common.states.*)
  'common.states.loading': 'Chargement...',
  'common.states.searching': 'Recherche...',
  'common.states.error': 'Erreur',
  'common.states.success': 'Succès',
  'common.states.warning': 'Avertissement',
  'common.states.info': 'Info',
  'common.states.ok': 'OK',

  // Counts - plurals will be handled separately
  'common.counts.contact': '{{count}} contact',
  'common.counts.interaction': '{{count}} interaction',
  'common.counts.event': '{{count}} événement',
  'common.counts.company': '{{count}} entreprise',
  'common.counts.category': '{{count}} catégorie',
  'common.counts.note': '{{count}} note',
  'common.counts.result': '{{count}} résultat',
  'common.counts.item': '{{count}} élément',
  'common.counts.uniqueContact': '{{count}} contact unique',

  // Entities (common.entities.*)
  'common.entities.contact': 'Contact',
  'common.entities.contacts': 'Contacts',
  'common.entities.interaction': 'Interaction',
  'common.entities.interactions': 'Interactions',
  'common.entities.event': 'Événement',
  'common.entities.events': 'Événements',
  'common.entities.company': 'Entreprise',
  'common.entities.companies': 'Entreprises',
  'common.entities.note': 'Note',
  'common.entities.notes': 'Notes',
  'common.entities.category': 'Catégorie',
  'common.entities.categories': 'Catégories',

  // Time (common.time.*)
  'common.time.today': 'Aujourd\'hui',
  'common.time.tomorrow': 'Demain',
  'common.time.yesterday': 'Hier',
  'common.time.minute': '{{count}} minute',
  'common.time.hour': '{{count}} heure',
  'common.time.day': '{{count}} jour',
  'common.time.week': '{{count}} semaine',
  'common.time.daysAgo': 'il y a {{count}} jour',
  'common.time.minutesAgo': 'il y a {{count}} minute',
  'common.time.hoursAgo': 'il y a {{count}} heure',

  // Date ranges
  'common.dateRanges.allTime': 'Tout le temps',
  'common.dateRanges.last7Days': '7 derniers jours',
  'common.dateRanges.last30Days': '30 derniers jours',
  'common.dateRanges.last90Days': '90 derniers jours',

  // Filters
  'common.filters.all': 'Tous',
  'common.filters.none': 'Aucun',

  // Errors
  'common.errors.generic': 'Une erreur s\'est produite',
  'common.errors.network': 'Erreur réseau',
  'common.errors.notFound': 'Non trouvé',
  'common.errors.unauthorized': 'Non autorisé',
  'common.errors.saveFailed': 'Échec de l\'enregistrement. Veuillez réessayer.',
  'common.errors.deleteFailed': 'Échec de la suppression. Veuillez réessayer.',
  'common.errors.loadFailed': 'Échec du chargement',

  // Labels
  'common.labels.optional': 'Optionnel',
  'common.labels.required': 'Obligatoire',
  'common.labels.left': 'Gauche',
  'common.labels.right': 'Droite',

  // Theme
  'theme.system': 'Système',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',

  // Interaction types
  'interactionTypes.call': 'Appel',
  'interactionTypes.text': 'SMS',
  'interactionTypes.email': 'E-mail',
  'interactionTypes.meeting': 'Réunion',
  'interactionTypes.videoCall': 'Appel vidéo',
  'interactionTypes.socialMedia': 'Réseaux sociaux',
  'interactionTypes.other': 'Autre',

  // Event types
  'eventTypes.birthday': 'Anniversaire',
  'eventTypes.anniversary': 'Anniversaire de mariage',
  'eventTypes.meeting': 'Réunion',
  'eventTypes.deadline': 'Date limite',
  'eventTypes.other': 'Autre',

  // Navigation
  'navigation.dashboard': 'Tableau de bord',
  'navigation.contacts': 'Contacts',
  'navigation.companies': 'Entreprises',
  'navigation.interactions': 'Interactions',
  'navigation.proximity': 'Proximité',
  'navigation.events': 'Événements',
  'navigation.settings': 'Paramètres',

  // Categories
  'categories.family': 'Famille',
  'categories.friends': 'Amis',
  'categories.work': 'Travail',
  'categories.vip': 'VIP',
  'categories.coworkers': 'Collègues',
  'categories.clients': 'Clients',
  'categories.leads': 'Prospects',
  'categories.vendors': 'Fournisseurs',
  'categories.business': 'Affaires',
  'categories.personal': 'Personnel',

  // Contact fields
  'contact.jobAtCompany': '{{job}} chez {{company}}',
  'contact.jobOnly': '{{job}}',
  'contact.companyOnly': '{{company}}',
  'contact.phoneLabels.mobile': 'Mobile',
  'contact.phoneLabels.home': 'Domicile',
  'contact.phoneLabels.work': 'Travail',
  'contact.phoneLabels.other': 'Autre',
  'contact.emailLabels.personal': 'Personnel',
  'contact.emailLabels.work': 'Travail',
  'contact.emailLabels.other': 'Autre',
  'contact.contactTypes.bestFriend': 'Meilleur ami',
  'contact.contactTypes.closeFriend': 'Ami proche',
  'contact.contactTypes.acquaintance': 'Connaissance',
  'contact.contactTypes.colleague': 'Collègue',
  'contact.contactTypes.client': 'Client',
  'contact.contactTypes.family': 'Famille',
  'contact.contactTypes.other': 'Autre',

  // Proximity
  'proximity.title': 'Contacts à proximité',
  'proximity.settings': 'Paramètres de proximité',
  'proximity.range': 'Rayon de recherche',
  'proximity.enableLocation': 'Activer la localisation',
  'proximity.locationPermission': 'Permission de localisation',
  'proximity.noContactsNearby': 'Aucun contact à proximité',
  'proximity.error': 'Erreur de localisation',
  'proximity.loading': 'Chargement...',
  'proximity.retry': 'Réessayer',

  // Settings
  'settings.title': 'Paramètres',
  'settings.theme': 'Thème',
  'settings.language': 'Langue',
  'settings.security': 'Sécurité',
  'settings.biometric': 'Authentification biométrique',
  'settings.pin': 'Code PIN',
  'settings.autoLock': 'Verrouillage automatique',
  'settings.database': 'Base de données',
  'settings.backup': 'Sauvegarde',
  'settings.restore': 'Restauration',
  'settings.reset': 'Réinitialiser',

  // Industries
  'industries.technology': 'Technologie',
  'industries.healthcare': 'Santé',
  'industries.finance': 'Finance',
  'industries.education': 'Éducation',
  'industries.retail': 'Commerce',
  'industries.manufacturing': 'Industrie',
  'industries.realEstate': 'Immobilier',
  'industries.consulting': 'Conseil',
  'industries.marketing': 'Marketing',
  'industries.legal': 'Juridique',
  'industries.other': 'Autre',

  // Settings sections
  'settings.sections.general': 'Général',
  'settings.sections.appearance': 'Apparence',
  'settings.sections.security': 'Sécurité',
  'settings.sections.data': 'Données',
  'settings.sections.proximity': 'Proximité',
  'settings.sections.proximityDescription': 'Configurer la détection de proximité',
  'settings.proximity.algorithm': 'Algorithme',
  'settings.proximity.algorithmDescription': 'Choisir l\'algorithme de détection',

  // Settings errors
  'settings.errors.biometric': 'Échec de l\'activation de l\'authentification biométrique',
  'settings.errors.autoLock': 'Échec de l\'activation du verrouillage automatique',
  'settings.errors.autoLockTimeout': 'Échec de la mise à jour du délai de verrouillage',
  'settings.errors.swipeAction': 'Échec de la mise à jour des actions de glissement',
  'settings.errors.theme': 'Échec de la mise à jour du thème',
  'settings.errors.language': 'Échec de la mise à jour de la langue',
  'settings.errors.featureToggle': 'Échec de la mise à jour de la fonctionnalité',

  // Companies
  'companies.list.title': 'Entreprises',
  'companies.add.title': 'Ajouter une entreprise',
  'companies.add.name': 'Nom de l\'entreprise',
  'companies.add.industry': 'Secteur',
  'companies.add.website': 'Site web',
  'companies.add.address': 'Adresse',
  'companies.add.notes': 'Notes',
  'companies.add.save': 'Enregistrer',
  'companies.add.cancel': 'Annuler',
  'companies.add.error': 'Échec de l\'ajout de l\'entreprise',
  'companies.edit.title': 'Modifier l\'entreprise',
  'companies.edit.error': 'Échec de la modification de l\'entreprise',
  'companies.list.delete.confirm': 'Supprimer l\'entreprise',
  'companies.list.delete.message': 'Êtes-vous sûr de vouloir supprimer cette entreprise ?',
  'companies.list.delete.error': 'Échec de la suppression de l\'entreprise',

  // Interactions
  'interactions.title': 'Interactions',
  'interactions.filters.all': 'Toutes',
  'interactions.filters.call': 'Appels',
  'interactions.filters.text': 'SMS',
  'interactions.filters.email': 'E-mails',
  'interactions.filters.meeting': 'Réunions',
  'interactions.filters.videoCall': 'Appels vidéo',
  'interactions.filters.socialMedia': 'Réseaux sociaux',
  'interactions.filters.other': 'Autres',

  // Add Interaction
  'addInteraction.title': 'Ajouter une interaction',
  'addInteraction.editTitle': 'Modifier l\'interaction',
  'addInteraction.types.call': 'Appel',
  'addInteraction.types.text': 'SMS',
  'addInteraction.types.email': 'E-mail',
  'addInteraction.types.meeting': 'Réunion',
  'addInteraction.types.videoCall': 'Appel vidéo',
  'addInteraction.types.socialMedia': 'Réseaux sociaux',
  'addInteraction.types.other': 'Autre',
  'addInteraction.quickTitles.call': 'Appel avec {{name}}',
  'addInteraction.quickTitles.text': 'SMS avec {{name}}',
  'addInteraction.quickTitles.email': 'E-mail avec {{name}}',
  'addInteraction.quickTitles.meeting': 'Réunion avec {{name}}',
  'addInteraction.quickTitles.videoCall': 'Appel vidéo avec {{name}}',
  'addInteraction.quickTitles.socialMedia': 'Message sur les réseaux sociaux avec {{name}}',

  // Add Event
  'addEvent.title': 'Ajouter un événement',
  'addEvent.editTitle': 'Modifier l\'événement',
  'addEvent.types.birthday': 'Anniversaire',
  'addEvent.types.anniversary': 'Anniversaire de mariage',
  'addEvent.types.meeting': 'Réunion',
  'addEvent.types.deadline': 'Date limite',
  'addEvent.types.other': 'Autre',

  // Contact Detail
  'contactDetail.title': 'Détails du contact',
  'contactDetail.tabs.info': 'Infos',
  'contactDetail.tabs.activity': 'Activité',
  'contactDetail.tabs.notes': 'Notes',
  'contactDetail.upcoming': 'À venir',
  'contactDetail.past': 'Passé',
  'contactDetail.viewMore': 'Voir {{count}} de plus',
  'contactDetail.noInteractions': 'Aucune interaction',
  'contactDetail.noEvents': 'Aucun événement',
  'contactDetail.noNotes': 'Aucune note',

  // Add Contact
  'addContact.title': 'Ajouter un contact',
  'addContact.firstName': 'Prénom',
  'addContact.lastName': 'Nom',
  'addContact.company': 'Entreprise',
  'addContact.jobTitle': 'Poste',
  'addContact.email': 'E-mail',
  'addContact.phone': 'Téléphone',
  'addContact.address': 'Adresse',
  'addContact.notes': 'Notes',
  'addContact.categories': 'Catégories',
  'addContact.save': 'Enregistrer',
  'addContact.cancel': 'Annuler',

  // Edit Contact
  'editContact.title': 'Modifier le contact',
  'editContact.save': 'Enregistrer',
  'editContact.cancel': 'Annuler',

  // Global Search
  'globalSearch.placeholder': 'Rechercher...',
  'globalSearch.searching': 'Recherche en cours...',
  'globalSearch.noResults': 'Aucun résultat',
  'globalSearch.sections.contacts': 'Contacts',
  'globalSearch.sections.companies': 'Entreprises',
  'globalSearch.sections.interactions': 'Interactions',
  'globalSearch.sections.events': 'Événements',
  'globalSearch.sections.notes': 'Notes',

  // Dashboard
  'dashboard.title': 'Tableau de bord',
  'dashboard.stats.contacts': 'Contacts',
  'dashboard.stats.interactions': 'Interactions',
  'dashboard.stats.events': 'Événements',
  'dashboard.upcomingEvents': 'Événements à venir',
  'dashboard.recentInteractions': 'Interactions récentes',
  'dashboard.quickActions': 'Actions rapides',

  // Analytics
  'analytics.title': 'Analyses',
  'analytics.dateRange': 'Période',
  'analytics.interactions.total': 'Total des interactions',
  'analytics.interactions.byType': 'Par type',
  'analytics.interactions.uniqueContacts': '{{count}} contact unique',
  'analytics.topContacts.title': 'Contacts principaux',
  'analytics.topContacts.interactionCount': '{{count}} interaction',

  // Contact Detail (additional)
  'contactDetail.pastActivity': 'Activité passée',
  'contactDetail.addInteraction': 'Ajouter une interaction',
  'contactDetail.noActivity': 'Aucune activité',
  'contactDetail.noActivityDescription': 'Aucune interaction ou événement enregistré',
  'contactDetail.viewMoreInfo': 'Voir plus d\'informations',

  // Add Contact (additional)
  'addContact.sections.basicInfo': 'Informations de base',
  'addContact.sections.contactInfo': 'Coordonnées',
  'addContact.sections.company': 'Entreprise',
  'addContact.sections.categories': 'Catégories',
  'addContact.sections.relationshipType': 'Type de relation',

  // Contact types (additional)
  'contact.contactTypes.friend': 'Ami',

  // Proximity (complete section)
  'proximity.radarTitle': 'Radar de proximité',
  'proximity.calculating': 'Calcul en cours...',
  'proximity.errorTitle': 'Erreur',
  'proximity.errorMessage': 'Impossible de calculer la proximité',
  'proximity.emptyTitle': 'Aucun contact',
  'proximity.emptyMessage': 'Aucun contact trouvé dans votre liste',
  'proximity.noContacts': 'Aucun contact à proximité',
  'proximity.noContactsMessage': 'Aucun contact trouvé dans le rayon de recherche',
  'proximity.infoTitle': 'À propos de la proximité',
  'proximity.infoMessage': 'La proximité est calculée en fonction de la récence, de la fréquence et de la qualité des interactions',
  'proximity.infoScoring': 'Système de notation',
  'proximity.radarInfo.title': 'Comment fonctionne le radar',
  'proximity.radarInfo.message': 'Les contacts sont positionnés en fonction de leur score de proximité. Plus un contact est proche du centre, plus votre relation est forte.',
  'proximity.gotIt': 'Compris',

  // Proximity Settings (complete section)
  'proximitySettings.title': 'Paramètres de proximité',
  'proximitySettings.save': 'Enregistrer',
  'proximitySettings.algorithmTitle': 'Algorithme',
  'proximitySettings.algorithmDescription': 'Choisir le mode de calcul de la proximité',
  'proximitySettings.presetTitle': 'Préréglages',
  'proximitySettings.presets.balanced': 'Équilibré',
  'proximitySettings.presets.recentFirst': 'Récent en premier',
  'proximitySettings.presets.frequentFirst': 'Fréquent en premier',
  'proximitySettings.presets.qualityFirst': 'Qualité en premier',
  'proximitySettings.presets.custom': 'Personnalisé',
  'proximitySettings.weights': 'Poids',
  'proximitySettings.recency': 'Récence',
  'proximitySettings.frequency': 'Fréquence',
  'proximitySettings.quality': 'Qualité',
  'proximitySettings.contactType': 'Type de contact',
  'proximitySettings.resetToDefaults': 'Réinitialiser aux valeurs par défaut',
  'proximitySettings.description.recency': 'Importance des interactions récentes',
  'proximitySettings.description.frequency': 'Importance de la fréquence des interactions',
  'proximitySettings.description.quality': 'Importance de la qualité des interactions (durée, type)',
  'proximitySettings.description.contactType': 'Importance du type de relation (meilleur ami, famille, etc.)',
  'proximitySettings.totalWeight': 'Poids total: {{total}}',
  'proximitySettings.info': 'Ajustez les poids pour personnaliser le calcul de proximité selon vos préférences',
  'proximitySettings.customNotConfigured': 'Personnalisé (non configuré)',
  'proximitySettings.saved': 'Enregistré',
  'proximitySettings.savedMessage': 'Les paramètres de proximité ont été enregistrés',
  'proximitySettings.saveError': 'Erreur d\'enregistrement',
  'proximitySettings.saveErrorMessage': 'Impossible d\'enregistrer les paramètres de proximité',
  'proximitySettings.loadError': 'Erreur de chargement',
  'proximitySettings.loadErrorMessage': 'Impossible de charger les paramètres de proximité',

  // Events (additional)
  'events.title': 'Événements',
  'events.today': 'Aujourd\'hui',
  'events.tomorrow': 'Demain',
  'events.upcoming': 'À venir',
  'events.past': 'Passés',
  'events.filters.all': 'Tous',
  'events.filters.birthday': 'Anniversaires',
  'events.filters.anniversary': 'Anniversaires de mariage',
  'events.filters.meeting': 'Réunions',
  'events.filters.deadline': 'Dates limites',
  'events.filters.other': 'Autres',

  // Add Event (additional)
  'addEvent.sections.basic': 'Informations de base',
  'addEvent.sections.contact': 'Contact',
  'addEvent.sections.details': 'Détails',
  'addEvent.labels.title': 'Titre',
  'addEvent.labels.type': 'Type',
  'addEvent.labels.date': 'Date',
  'addEvent.labels.time': 'Heure',
  'addEvent.labels.location': 'Lieu',
  'addEvent.labels.description': 'Description',
  'addEvent.labels.recurring': 'Répétition',
  'addEvent.labels.save': 'Enregistrer',
  'addEvent.labels.update': 'Mettre à jour',
  'addEvent.labels.cancel': 'Annuler',
  'addEvent.errors.saveFailed': 'Échec de l\'enregistrement de l\'événement',
  'addEvent.errors.deleteFailed': 'Échec de la suppression de l\'événement',
  'addEvent.delete.title': 'Supprimer l\'événement',
  'addEvent.delete.message': 'Êtes-vous sûr de vouloir supprimer cet événement ?',
  'addEvent.delete.confirm': 'Supprimer',
  'addEvent.delete.cancel': 'Annuler',

  // Add Interaction (additional)
  'addInteraction.sections.basic': 'Informations de base',
  'addInteraction.sections.contact': 'Contact',
  'addInteraction.sections.details': 'Détails',
  'addInteraction.labels.title': 'Titre',
  'addInteraction.labels.type': 'Type',
  'addInteraction.labels.date': 'Date',
  'addInteraction.labels.time': 'Heure',
  'addInteraction.labels.duration': 'Durée',
  'addInteraction.labels.durationOptional': 'Optionnel',
  'addInteraction.labels.notes': 'Notes',
  'addInteraction.labels.save': 'Enregistrer',
  'addInteraction.labels.update': 'Mettre à jour',
  'addInteraction.labels.cancel': 'Annuler',
  'addInteraction.errors.saveFailed': 'Échec de l\'enregistrement de l\'interaction',
  'addInteraction.errors.deleteFailed': 'Échec de la suppression de l\'interaction',
  'addInteraction.delete.title': 'Supprimer l\'interaction',
  'addInteraction.delete.message': 'Êtes-vous sûr de vouloir supprimer cette interaction ?',
  'addInteraction.delete.confirm': 'Supprimer',
  'addInteraction.delete.cancel': 'Annuler',
};

// Plural mappings for French (nplurals=2; plural=(n > 1))
const PLURAL_MAPPINGS = {
  'contact': 'contacts',
  'interaction': 'interactions',
  'événement': 'événements',
  'entreprise': 'entreprises',
  'catégorie': 'catégories',
  'note': 'notes',
  'résultat': 'résultats',
  'élément': 'éléments',
  'minute': 'minutes',
  'heure': 'heures',
  'jour': 'jours',
  'semaine': 'semaines',
};

/**
 * Apply French plural rules to a translation
 */
function applyFrenchPlural(singular) {
  // Extract the pattern ({{count}} word)
  const match = singular.match(/{{count}}\s+(.+)/);
  if (!match) return [singular, singular];

  const word = match[1];
  const plural = PLURAL_MAPPINGS[word] || word + 's';

  return [
    singular, // msgstr[0] for n=0,1
    `{{count}} ${plural}` // msgstr[1] for n>1
  ];
}

/**
 * Fill translations in French PO file
 */
function fillFrenchTranslations() {
  console.log('=== Filling French Translations ===\n');

  // Read French PO file
  const content = fs.readFileSync(FR_PO_PATH, 'utf8');
  const lines = content.split('\n');

  let modified = false;
  let translatedCount = 0;
  let currentMsgid = null;
  let isPlural = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current msgid
    if (line.startsWith('msgid ')) {
      currentMsgid = line.substring(6).trim().replace(/^"|"$/g, '');
      isPlural = false;
    }

    // Check for plural
    if (line.startsWith('msgid_plural ')) {
      isPlural = true;
    }

    // Fill empty msgstr
    if (line.startsWith('msgstr ') && line.includes('msgstr ""') && currentMsgid && !isPlural) {
      const translation = TRANSLATIONS[currentMsgid];
      if (translation) {
        lines[i] = `msgstr "${translation}"`;
        modified = true;
        translatedCount++;
      }
    }

    // Fill empty plural msgstr[0] and msgstr[1]
    if (line.startsWith('msgstr[0] ""') && currentMsgid && isPlural) {
      const baseTrans = TRANSLATIONS[currentMsgid];
      if (baseTrans) {
        const [singular, plural] = applyFrenchPlural(baseTrans);
        lines[i] = `msgstr[0] "${singular}"`;
        // Check if next line is msgstr[1]
        if (i + 1 < lines.length && lines[i + 1].startsWith('msgstr[1] ""')) {
          lines[i + 1] = `msgstr[1] "${plural}"`;
        }
        modified = true;
        translatedCount++;
      }
    }
  }

  if (modified) {
    // Write back to file
    fs.writeFileSync(FR_PO_PATH, lines.join('\n'), 'utf8');
    console.log(`✓ Filled ${translatedCount} French translations`);
    console.log(`✓ Updated: ${FR_PO_PATH}`);
  } else {
    console.log('⚠ No translations needed to be filled');
  }

  return translatedCount;
}

// Run if executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    const count = fillFrenchTranslations();
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/validate-po.js');
    console.log('2. Run: node scripts/po-to-json.js');
    console.log('3. Review translations for accuracy');
    process.exit(count > 0 ? 0 : 1);
  }
}

export { fillFrenchTranslations, TRANSLATIONS };
