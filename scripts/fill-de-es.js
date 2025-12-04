#!/usr/bin/env node
/**
 * Fill missing German and Spanish translations
 * Direct msgid to msgstr mapping approach
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// msgid key → translations
const msgidTranslations = {
  // common.actions.*
  "common.actions.save": { de: "Speichern", es: "Guardar" },
  "common.actions.saveChanges": { de: "Änderungen speichern", es: "Guardar cambios" },
  "common.actions.saveContact": { de: "Kontakt speichern", es: "Guardar contacto" },
  "common.actions.cancel": { de: "Abbrechen", es: "Cancelar" },
  "common.actions.delete": { de: "Löschen", es: "Eliminar" },
  "common.actions.edit": { de: "Bearbeiten", es: "Editar" },
  "common.actions.add": { de: "Hinzufügen", es: "Agregar" },
  "common.actions.remove": { de: "Entfernen", es: "Quitar" },
  "common.actions.close": { de: "Schließen", es: "Cerrar" },
  "common.actions.confirm": { de: "Bestätigen", es: "Confirmar" },
  "common.actions.retry": { de: "Wiederholen", es: "Reintentar" },
  "common.actions.apply": { de: "Anwenden", es: "Aplicar" },
  "common.actions.clear": { de: "Löschen", es: "Limpiar" },
  "common.actions.reset": { de: "Zurücksetzen", es: "Restablecer" },
  "common.actions.update": { de: "Aktualisieren", es: "Actualizar" },
  "common.actions.run": { de: "Ausführen", es: "Ejecutar" },

  // common.states.*
  "common.states.loading": { de: "Wird geladen...", es: "Cargando..." },
  "common.states.searching": { de: "Suche läuft...", es: "Buscando..." },
  "common.states.error": { de: "Fehler", es: "Error" },
  "common.states.success": { de: "Erfolg", es: "Éxito" },
  "common.states.warning": { de: "Warnung", es: "Advertencia" },
  "common.states.info": { de: "Info", es: "Info" },
  "common.states.ok": { de: "OK", es: "OK" },

  // common.counts.* (plural forms handled separately below)

  // common.entities.*
  "common.entities.contact": { de: "Kontakt", es: "Contacto" },
  "common.entities.contacts": { de: "Kontakte", es: "Contactos" },
  "common.entities.interaction": { de: "Interaktion", es: "Interacción" },
  "common.entities.interactions": { de: "Interaktionen", es: "Interacciones" },
  "common.entities.event": { de: "Ereignis", es: "Evento" },
  "common.entities.events": { de: "Ereignisse", es: "Eventos" },
  "common.entities.company": { de: "Unternehmen", es: "Empresa" },
  "common.entities.companies": { de: "Unternehmen", es: "Empresas" },
  "common.entities.note": { de: "Notiz", es: "Nota" },
  "common.entities.notes": { de: "Notizen", es: "Notas" },
  "common.entities.category": { de: "Kategorie", es: "Categoría" },
  "common.entities.categories": { de: "Kategorien", es: "Categorías" },

  // common.time.*
  "common.time.today": { de: "Heute", es: "Hoy" },
  "common.time.tomorrow": { de: "Morgen", es: "Mañana" },
  "common.time.yesterday": { de: "Gestern", es: "Ayer" },

  // common.dateRanges.*
  "common.dateRanges.allTime": { de: "Gesamte Zeit", es: "Todo el tiempo" },
  "common.dateRanges.last7Days": { de: "Letzte 7 Tage", es: "Últimos 7 días" },
  "common.dateRanges.last30Days": { de: "Letzte 30 Tage", es: "Últimos 30 días" },
  "common.dateRanges.last90Days": { de: "Letzte 90 Tage", es: "Últimos 90 días" },

  // common.filters.*
  "common.filters.all": { de: "Alle", es: "Todos" },
  "common.filters.none": { de: "Keine", es: "Ninguno" },

  // common.errors.*
  "common.errors.generic": { de: "Etwas ist schiefgelaufen", es: "Algo salió mal" },
  "common.errors.network": { de: "Netzwerkfehler", es: "Error de red" },
  "common.errors.notFound": { de: "Nicht gefunden", es: "No encontrado" },
  "common.errors.unauthorized": { de: "Nicht autorisiert", es: "No autorizado" },
  "common.errors.saveFailed": { de: "Speichern fehlgeschlagen", es: "Error al guardar" },
  "common.errors.deleteFailed": { de: "Löschen fehlgeschlagen", es: "Error al eliminar" },
  "common.errors.loadFailed": { de: "Laden fehlgeschlagen", es: "Error al cargar" },

  // common.labels.*
  "common.labels.optional": { de: "Optional", es: "Opcional" },
  "common.labels.required": { de: "Erforderlich", es: "Obligatorio" },
  "common.labels.left": { de: "Links", es: "Izquierda" },
  "common.labels.right": { de: "Rechts", es: "Derecha" },

  // navigation.*
  "navigation.proximity": { de: "Nähe", es: "Proximidad" },

  // settings.*
  "settings.sections.proximity": { de: "Nähe", es: "Proximidad" },
  "settings.sections.proximityDescription": { de: "Bewertungsalgorithmus für Nähe konfigurieren", es: "Configurar algoritmo de puntuación de proximidad" },
  "settings.proximity.algorithm": { de: "Nähe-Algorithmus", es: "Algoritmo de proximidad" },
  "settings.proximity.algorithmDescription": { de: "Wählen Sie aus, wie die Beziehungsstärke berechnet wird", es: "Elija cómo se calcula la fuerza de la relación" },
  "settings.errors.biometric": { de: "Fehler beim Umschalten der biometrischen Authentifizierung", es: "Error al alternar autenticación biométrica" },
  "settings.errors.autoLock": { de: "Fehler beim Umschalten der automatischen Sperre", es: "Error al alternar bloqueo automático" },
  "settings.errors.autoLockTimeout": { de: "Fehler beim Ändern des Auto-Sperr-Timeouts", es: "Error al cambiar el tiempo de bloqueo automático" },
  "settings.errors.swipeAction": { de: "Fehler beim Ändern der Wisch-Aktion", es: "Error al cambiar acción de deslizamiento" },
  "settings.errors.theme": { de: "Fehler beim Ändern des Designs", es: "Error al cambiar el tema" },
  "settings.errors.language": { de: "Fehler beim Ändern der Sprache", es: "Error al cambiar el idioma" },
  "settings.errors.featureToggle": { de: "Fehler beim Umschalten der Funktion", es: "Error al alternar función" },

  // theme.*
  "theme.system": { de: "Systemstandard", es: "Predeterminado del sistema" },
  "theme.light": { de: "Hell", es: "Claro" },
  "theme.dark": { de: "Dunkel", es: "Oscuro" },

  // industries.*
  "industries.realEstate": { de: "Immobilien", es: "Bienes raíces" },

  // companies.*
  "companies.add.error": { de: "Fehler beim Erstellen des Unternehmens", es: "Error al crear empresa" },
  "companies.edit.error": { de: "Fehler beim Aktualisieren des Unternehmens", es: "Error al actualizar empresa" },
  "companies.list.delete.error": { de: "Fehler beim Löschen des Unternehmens", es: "Error al eliminar empresa" },

  // interactions.filters.*
  "interactions.filters.videoCall": { de: "Videoanrufe", es: "Videollamadas" },
  "interactions.filters.socialMedia": { de: "Soziale Medien", es: "Redes sociales" },

  // interactionTypes.*
  "interactionTypes.call": { de: "Anruf", es: "Llamada" },
  "interactionTypes.text": { de: "Nachricht", es: "Mensaje" },
  "interactionTypes.email": { de: "E-Mail", es: "Correo" },
  "interactionTypes.meeting": { de: "Besprechung", es: "Reunión" },
  "interactionTypes.videoCall": { de: "Videoanruf", es: "Videollamada" },
  "interactionTypes.socialMedia": { de: "Soziale Medien", es: "Redes sociales" },
  "interactionTypes.other": { de: "Sonstiges", es: "Otro" },

  // addInteraction.*
  "addInteraction.quickTitles.videoCall": { de: "Videoanruf mit {{name}}", es: "Videollamada con {{name}}" },

  // eventTypes.*
  "eventTypes.birthday": { de: "Geburtstag", es: "Cumpleaños" },
  "eventTypes.anniversary": { de: "Jubiläum", es: "Aniversario" },
  "eventTypes.meeting": { de: "Besprechung", es: "Reunión" },
  "eventTypes.deadline": { de: "Frist", es: "Plazo" },
  "eventTypes.other": { de: "Sonstiges", es: "Otro" },

  // contactDetail.*
  "contactDetail.tabs.info": { de: "Info", es: "Info" },
  "contactDetail.tabs.activity": { de: "Aktivität", es: "Actividad" },
  "contactDetail.upcoming": { de: "Bevorstehende Ereignisse", es: "Próximos eventos" },
  "contactDetail.pastActivity": { de: "Frühere Aktivität", es: "Actividad pasada" },
  "contactDetail.addInteraction": { de: "Interaktion hinzufügen", es: "Agregar interacción" },
  "contactDetail.noActivity": { de: "Keine aktuelle Aktivität", es: "Sin actividad reciente" },
  "contactDetail.noActivityDescription": { de: "Fügen Sie Ihre erste Interaktion mit diesem Kontakt hinzu", es: "Agrega tu primera interacción con este contacto" },
  "contactDetail.viewMoreInfo": { de: "Kontaktinfo anzeigen", es: "Ver información de contacto" },

  // categories.*
  "categories.family": { de: "Familie", es: "Familia" },
  "categories.friends": { de: "Freunde", es: "Amigos" },
  "categories.work": { de: "Arbeit", es: "Trabajo" },
  "categories.vip": { de: "VIP", es: "VIP" },
  "categories.coworkers": { de: "Kollegen", es: "Compañeros" },
  "categories.clients": { de: "Kunden", es: "Clientes" },
  "categories.leads": { de: "Leads", es: "Prospectos" },
  "categories.vendors": { de: "Lieferanten", es: "Proveedores" },
  "categories.business": { de: "Geschäftlich", es: "Negocios" },
  "categories.personal": { de: "Persönlich", es: "Personal" },

  // addContact.*
  "addContact.sections.relationshipType": { de: "Beziehungstyp", es: "Tipo de relación" },

  // contact.phoneLabels.*
  "contact.phoneLabels.mobile": { de: "Mobil", es: "Móvil" },
  "contact.phoneLabels.home": { de: "Privat", es: "Casa" },
  "contact.phoneLabels.work": { de: "Arbeit", es: "Trabajo" },
  "contact.phoneLabels.other": { de: "Sonstiges", es: "Otro" },

  // contact.emailLabels.*
  "contact.emailLabels.personal": { de: "Persönlich", es: "Personal" },
  "contact.emailLabels.work": { de: "Arbeit", es: "Trabajo" },
  "contact.emailLabels.other": { de: "Sonstiges", es: "Otro" },

  // contact.contactTypes.*
  "contact.contactTypes.bestFriend": { de: "Bester Freund", es: "Mejor amigo" },
  "contact.contactTypes.family": { de: "Familie", es: "Familia" },
  "contact.contactTypes.closeFriend": { de: "Enger Freund", es: "Amigo cercano" },
  "contact.contactTypes.friend": { de: "Freund", es: "Amigo" },
  "contact.contactTypes.colleague": { de: "Kollege", es: "Colega" },
  "contact.contactTypes.acquaintance": { de: "Bekannter", es: "Conocido" },
  "contact.contactTypes.other": { de: "Sonstiges", es: "Otro" },

  // proximity.*
  "proximity.title": { de: "Beziehungsnähe", es: "Proximidad de relación" },
  "proximity.radarTitle": { de: "Nähe-Radar", es: "Radar de proximidad" },
  "proximity.calculating": { de: "Nähe-Werte werden berechnet...", es: "Calculando puntuaciones de proximidad..." },
  "proximity.errorTitle": { de: "Fehler beim Laden der Nähe", es: "Error al cargar proximidad" },
  "proximity.errorMessage": { de: "Fehler beim Laden der Nähe-Daten. Bitte versuchen Sie es erneut.", es: "Error al cargar datos de proximidad. Por favor, inténtalo de nuevo." },
  "proximity.emptyTitle": { de: "Keine Nähe-Daten", es: "Sin datos de proximidad" },
  "proximity.emptyMessage": { de: "Fügen Sie einige Interaktionen hinzu, um die Nähe-Werte zu sehen.", es: "Agrega algunas interacciones para ver las puntuaciones de proximidad." },
  "proximity.noContacts": { de: "Keine Kontakte", es: "Sin contactos" },
  "proximity.noContactsMessage": { de: "Fügen Sie Kontakte hinzu, um die Beziehungsnähe zu verfolgen.", es: "Agrega contactos para comenzar a rastrear la proximidad de relaciones." },
  "proximity.infoTitle": { de: "Über Nähe", es: "Acerca de proximidad" },
  "proximity.infoMessage": { de: "Nähe-Werte (0-100) messen die Beziehungsstärke basierend auf:\\n\\n• Aktualität: Wann Sie zuletzt interagiert haben\\n• Häufigkeit: Wie oft Sie interagieren\\n• Qualität: Art und Dauer der Interaktionen\\n• Kontakttyp: Beziehungsklassifizierung\\n\\nHöhere Werte bedeuten stärkere, aktivere Beziehungen.", es: "Las puntuaciones de proximidad (0-100) miden la fuerza de la relación basándose en:\\n\\n• Recencia: Cuándo interactuaste por última vez\\n• Frecuencia: Con qué frecuencia interactúas\\n• Calidad: Tipo y duración de las interacciones\\n• Tipo de contacto: Clasificación de relación\\n\\nPuntuaciones más altas significan relaciones más fuertes y activas." },
  "proximity.infoScoring": { de: "Der Algorithmus berücksichtigt mehrere Faktoren, um zu berechnen, wie nah Sie jedem Kontakt sind.", es: "El algoritmo considera múltiples factores para calcular qué tan cerca estás de cada contacto." },
  "proximity.radarInfo.title": { de: "Das Radar verstehen", es: "Entendiendo el radar" },
  "proximity.radarInfo.message": { de: "Das Nähe-Radar visualisiert Ihr Beziehungsnetzwerk:\\n\\n• Innerer Ring (80-100): Ihre engsten Beziehungen\\n• Mittlerer Ring (40-79): Regelmäßige Kontakte\\n• Äußerer Ring (0-39): Entfernte Verbindungen\\n\\nTippen Sie auf einen Kontakt, um Details anzuzeigen.", es: "El radar de proximidad visualiza tu red de relaciones:\\n\\n• Anillo interno (80-100): Tus relaciones más cercanas\\n• Anillo medio (40-79): Contactos regulares\\n• Anillo externo (0-39): Conexiones distantes\\n\\nToca cualquier contacto para ver detalles." },
  "proximity.gotIt": { de: "Verstanden", es: "Entendido" },

  // proximitySettings.*
  "proximitySettings.title": { de: "Nähe-Einstellungen", es: "Configuración de proximidad" },
  "proximitySettings.algorithmTitle": { de: "Bewertungsalgorithmus", es: "Algoritmo de puntuación" },
  "proximitySettings.algorithmDescription": { de: "Wählen Sie, wie Nähe berechnet wird", es: "Elije cómo se calcula la proximidad" },
  "proximitySettings.presetTitle": { de: "Voreinstellung", es: "Preajuste" },
  "proximitySettings.weights": { de: "Bewertungsgewichte", es: "Pesos de puntuación" },
  "proximitySettings.recency": { de: "Aktualitätsgewicht", es: "Peso de recencia" },
  "proximitySettings.frequency": { de: "Häufigkeitsgewicht", es: "Peso de frecuencia" },
  "proximitySettings.quality": { de: "Qualitätsgewicht", es: "Peso de calidad" },
  "proximitySettings.contactType": { de: "Kontakttyp-Gewicht", es: "Peso de tipo de contacto" },
  "proximitySettings.customNotConfigured": { de: "Benutzerdefinierter Algorithmus nicht konfiguriert", es: "Algoritmo personalizado no configurado" },
  "proximitySettings.saved": { de: "Einstellungen gespeichert", es: "Configuración guardada" },
  "proximitySettings.savedMessage": { de: "Nähe-Einstellungen erfolgreich aktualisiert", es: "Configuración de proximidad actualizada exitosamente" },
  "proximitySettings.saveError": { de: "Speicherfehler", es: "Error al guardar" },
  "proximitySettings.saveErrorMessage": { de: "Fehler beim Speichern der Nähe-Einstellungen", es: "Error al guardar configuración de proximidad" },
  "proximitySettings.loadError": { de: "Ladefehler", es: "Error al cargar" },
  "proximitySettings.loadErrorMessage": { de: "Fehler beim Laden der Nähe-Einstellungen", es: "Error al cargar configuración de proximidad" },
};

// Plural translations: msgid → [singular, plural]
const pluralTranslations = {
  "de": {
    "common.counts.contact": ["{{count}} Kontakt", "{{count}} Kontakte"],
    "common.counts.interaction": ["{{count}} Interaktion", "{{count}} Interaktionen"],
    "common.counts.event": ["{{count}} Ereignis", "{{count}} Ereignisse"],
    "common.counts.company": ["{{count}} Unternehmen", "{{count}} Unternehmen"],
    "common.counts.category": ["{{count}} Kategorie", "{{count}} Kategorien"],
    "common.counts.note": ["{{count}} Notiz", "{{count}} Notizen"],
    "common.counts.result": ["{{count}} Ergebnis", "{{count}} Ergebnisse"],
    "common.counts.item": ["{{count}} Element", "{{count}} Elemente"],
    "common.counts.uniqueContact": ["{{count}} eindeutiger Kontakt", "{{count}} eindeutige Kontakte"],
    "common.time.minute": ["{{count}} Minute", "{{count}} Minuten"],
    "common.time.hour": ["{{count}} Stunde", "{{count}} Stunden"],
    "common.time.day": ["{{count}} Tag", "{{count}} Tage"],
    "common.time.week": ["{{count}} Woche", "{{count}} Wochen"],
    "common.time.daysAgo": ["vor {{count}} Tag", "vor {{count}} Tagen"],
    "common.time.minutesAgo": ["vor {{count}} Minute", "vor {{count}} Minuten"],
    "common.time.hoursAgo": ["vor {{count}} Stunde", "vor {{count}} Stunden"],
    "contactDetail.viewMore": ["{{count}} weitere anzeigen", "{{count}} weitere anzeigen"],
  },
  "es": {
    "common.counts.contact": ["{{count}} contacto", "{{count}} contactos"],
    "common.counts.interaction": ["{{count}} interacción", "{{count}} interacciones"],
    "common.counts.event": ["{{count}} evento", "{{count}} eventos"],
    "common.counts.company": ["{{count}} empresa", "{{count}} empresas"],
    "common.counts.category": ["{{count}} categoría", "{{count}} categorías"],
    "common.counts.note": ["{{count}} nota", "{{count}} notas"],
    "common.counts.result": ["{{count}} resultado", "{{count}} resultados"],
    "common.counts.item": ["{{count}} elemento", "{{count}} elementos"],
    "common.counts.uniqueContact": ["{{count}} contacto único", "{{count}} contactos únicos"],
    "common.time.minute": ["{{count}} minuto", "{{count}} minutos"],
    "common.time.hour": ["{{count}} hora", "{{count}} horas"],
    "common.time.day": ["{{count}} día", "{{count}} días"],
    "common.time.week": ["{{count}} semana", "{{count}} semanas"],
    "common.time.daysAgo": ["hace {{count}} día", "hace {{count}} días"],
    "common.time.minutesAgo": ["hace {{count}} minuto", "hace {{count}} minutos"],
    "common.time.hoursAgo": ["hace {{count}} hora", "hace {{count}} horas"],
    "contactDetail.viewMore": ["Ver {{count}} más", "Ver {{count}} más"],
  }
};

function fillTranslations(filePath, lang) {
  console.log(`\nProcessing ${lang.toUpperCase()}: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let fillCount = 0;

  const lines = content.split('\n');
  const result = [];
  let currentMsgid = null;
  let isPlural = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture msgid
    if (line.startsWith('msgid "')) {
      const match = line.match(/^msgid "([^"]+)"/);
      if (match) {
        currentMsgid = match[1];
        isPlural = false;
      }
      result.push(line);
      continue;
    }

    // Detect msgid_plural
    if (line.startsWith('msgid_plural ')) {
      isPlural = true;
      result.push(line);
      continue;
    }

    // Fill empty msgstr (handle both 'msgstr ""' and 'msgstr  ""')
    if (line.match(/^msgstr\s*""$/)) {
      if (currentMsgid && msgidTranslations[currentMsgid]) {
        const translation = msgidTranslations[currentMsgid][lang];
        if (translation) {
          result.push(`msgstr "${translation}"`);
          fillCount++;
          continue;
        }
      }
    }

    // Fill empty msgstr[0] or msgstr[1] for plurals
    if (line.match(/^msgstr\[(\d+)\]\s*""$/)) {
      const pluralMatch = line.match(/^msgstr\[(\d+)\]/);
      if (pluralMatch) {
        const pluralIndex = parseInt(pluralMatch[1]);
        if (currentMsgid && pluralTranslations[lang] && pluralTranslations[lang][currentMsgid]) {
          const translation = pluralTranslations[lang][currentMsgid][pluralIndex];
          if (translation) {
            result.push(`msgstr[${pluralIndex}] "${translation}"`);
            fillCount++;
            continue;
          }
        }
      }
    }

    result.push(line);
  }

  fs.writeFileSync(filePath, result.join('\n'), 'utf8');
  console.log(`✅ Filled ${fillCount} translations`);
  return fillCount;
}

// Main
const localesDir = path.join(__dirname, '..', 'locales');
const deFile = path.join(localesDir, 'de.po');
const esFile = path.join(localesDir, 'es.po');

console.log('='.repeat(70));
console.log('FILLING GERMAN AND SPANISH TRANSLATIONS');
console.log('='.repeat(70));

const deFilled = fillTranslations(deFile, 'de');
const esFilled = fillTranslations(esFile, 'es');

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`German (de.po):  ${deFilled} translations added`);
console.log(`Spanish (es.po): ${esFilled} translations added`);
console.log('\n✅ Done!\n');
